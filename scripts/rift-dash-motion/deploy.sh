#!/usr/bin/env bash
# Supported additive runtime release: cumulative client/server plus approved art and evidence.
set -euo pipefail
cd "$(dirname "$0")/../.."
git diff --quiet -- src server scripts || { echo "Commit task source before shipping"; exit 1; }
release_sha="$(git rev-parse HEAD)"
export release_sha
mkdir -p "$HOME/releases"
exec 9>"$HOME/releases/arkodia-deploy.lock"
flock -w 60 9 || { echo 'Another Arkodia deployment holds the shared lock'; exit 1; }
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH"
export GOFLAGS=-p=1 GOMAXPROCS=2 GOMEMLIMIT=256MiB GOTOOLCHAIN=local RAYON_NUM_THREADS=2
stage="$(mktemp -d "$HOME/releases/rift-dash-motion-runtime-XXXXXXXX")"
export RIFT_DASH_STAGE="$stage"
node scripts/rift-dash-motion/verify-input.mjs
npx tsc --noEmit
node scripts/test-progression.mjs
node scripts/gameplay-progress/test.mjs
node --input-type=module -e 'import {build} from "vite";await build({build:{outDir:process.env.RIFT_DASH_STAGE+"/site",copyPublicDir:false}})'
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X github.com/rizrmd/arkadia/server/internal/server.BuildCommit=$release_sha" -o "$RIFT_DASH_STAGE/arkodia" ./cmd/arkodia)
ARKODIA_BIN="$stage/arkodia" SITE_DIR=public node scripts/coop-smoke.mjs
node scripts/rift-dash/build.mjs
mkdir -p "$stage/site/rift-dash/player"
cp -R dist-rift-dash/. "$stage/site/rift-dash/player/"
mkdir -p "$stage/site/rift-dash/v2" "$stage/site/rift-dash/motion/evidence"
cp public/rift-dash/v2/*.webp public/rift-dash/v2/manifest.json "$stage/site/rift-dash/v2/"
cp docs/rift-dash-motion/*.png docs/rift-dash-motion/*.json docs/rift-dash-motion/README.md "$stage/site/rift-dash/motion/evidence/"
node --input-type=module <<'JS'
import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {sandboxId,publishRelease} from './scripts/arkodia/publish-layer.mjs';
const run=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',maxBuffer:16e6}));
for(const s of run(['sessions','list','--all','--live'])){if(s.id===process.env.FURAL_TURN_ID)continue;const tree=JSON.stringify(run(['sessions','process-tree',s.id]));assert(!/scripts\/(?:fural-deploy\.sh|arkodia\/publish-layer\.mjs|[^" ]*\/(?:ship[^" ]*\.sh|deploy\.(?:sh|mjs)))/.test(tree),`Peer deploying: ${s.id}`)}
const id=sandboxId();assert.equal(run(['organization','home-files','file','--custom-sandbox',id,'--path','gateway.mjs']).content,await fs.readFile('scripts/arkodia/gateway.mjs','utf8'),'Live gateway changed; reconcile before release');
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),receipt={commit,at:new Date().toISOString(),feature:'Facing-only Rift Dash, 260 ms collision-safe travel and synchronized arrival',url:'https://ark-whachat.fural.space',assets:['departure','arrival','particles','trail'].map(n=>'/rift-dash/v2/'+n+'.webp')};
receipt.files={};for(const dir of ['/assets','/rift-dash/player/assets'])for(const f of await fs.readdir(process.env.RIFT_DASH_STAGE+'/site'+dir)){if(/\.(js|css)$/.test(f))receipt.files[dir+'/'+f]=createHash('sha256').update(await fs.readFile(process.env.RIFT_DASH_STAGE+'/site'+dir+'/'+f)).digest('hex');}
await fs.writeFile(process.env.RIFT_DASH_STAGE+'/site/rift-dash/motion/release.json',JSON.stringify(receipt,null,2));
execFileSync('tar',['-czf',process.env.RIFT_DASH_STAGE+'.tgz','-C',process.env.RIFT_DASH_STAGE,'.']);await publishRelease({name:'rift-dash-motion-'+commit.slice(0,8),tgz:process.env.RIFT_DASH_STAGE+'.tgz'});await fs.writeFile('docs/rift-dash-motion/deployment.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
JS
