#!/usr/bin/env bash
# Additive skill inspection game release via the supported Arkodia tgz publisher.
# Include the new skill UI kit; retain deployed artwork and dedicated players.
set -euo pipefail
cd "$(dirname "$0")/../.."
git diff --quiet -- src server scripts || { echo "Commit source before shipping"; exit 1; }
release_sha="$(git rev-parse HEAD)"
export release_sha
mkdir -p "$HOME/releases"
exec 9>"$HOME/releases/arkodia-deploy.lock"
flock -n 9 || { echo 'Another Arkodia deployment holds the lock'; exit 1; }
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH"
export GOFLAGS=-p=1 GOMAXPROCS=2 GOMEMLIMIT=256MiB GOTOOLCHAIN=local
stage="$(mktemp -d "$HOME/releases/skill-inspection-runtime-XXXXXXXX")"
export SKILL_INSPECTION_STAGE="$stage"
npx tsc --noEmit
node --input-type=module -e 'import {build} from "vite"; await build({build:{outDir:process.env.SKILL_INSPECTION_STAGE+"/site",copyPublicDir:false}});'
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X github.com/rizrmd/arkadia/server/internal/server.BuildCommit=$release_sha" -o "$SKILL_INSPECTION_STAGE/arkodia" ./cmd/arkodia)
ARKODIA_BIN="$stage/arkodia" SITE_DIR=public node scripts/coop-smoke.mjs
mkdir -p "$stage/site/skill-tree/inspection-v1" "$stage/site/skill-inspection/evidence"
cp -R public/skill-tree/inspection-v1/. "$stage/site/skill-tree/inspection-v1/"
cp docs/skill-inspection/*.png docs/skill-inspection/*.json docs/skill-inspection/*.md "$stage/site/skill-inspection/evidence/"
node --input-type=module <<'RELEASE'
import fs from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
fs.writeFileSync(process.env.SKILL_INSPECTION_STAGE+'/site/skill-inspection/release.json',JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),at:new Date().toISOString(),feature:'Floating Pixi skill preview with invariant tree viewport',files:Object.fromEntries(fs.readdirSync(process.env.SKILL_INSPECTION_STAGE+'/site/assets').filter(f=>/\.(js|css)$/.test(f)).map(f=>['/assets/'+f,createHash('sha256').update(fs.readFileSync(process.env.SKILL_INSPECTION_STAGE+'/site/assets/'+f)).digest('hex')])),assets:'/skill-tree/inspection-v1/manifest.json'}));
RELEASE
tar -czf "$stage.tgz" -C "$stage" .
node --input-type=module <<'JS'
import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {sandboxId,publishRelease} from './scripts/arkodia/publish-layer.mjs';
const run=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',maxBuffer:16e6}));
const id=sandboxId();
for(const s of run(['sessions','list','--all','--live'])){
 if(s.id===process.env.FURAL_TURN_ID)continue;
 const tree=JSON.stringify(run(['sessions','process-tree',s.id]));
 assert(!/scripts\/(?:fural-deploy\.sh|arkodia\/publish-layer\.mjs|[^" ]*\/(?:ship[^" ]*\.sh|deploy\.(?:sh|mjs)))/.test(tree),`Peer deploying: ${s.id}`);
}
const local=await fs.readFile('scripts/arkodia/gateway.mjs','utf8');
assert.equal(run(['organization','home-files','file','--custom-sandbox',id,'--path','gateway.mjs']).content,local,'Live gateway changed; reconcile before shipping');
await publishRelease({name:'skill-inspection-'+execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).trim(),tgz:process.env.SKILL_INSPECTION_STAGE+'.tgz'});
await fs.writeFile('docs/skill-inspection/deployment.json',JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),archive:process.env.SKILL_INSPECTION_STAGE+'.tgz',url:'https://ark-whachat.fural.space',at:new Date().toISOString(),scope:'Additive runtime release: compiled cumulative client, matching server, reusable skill UI kit and inspection evidence. Existing static artwork and player retained.'},null,2));
JS
