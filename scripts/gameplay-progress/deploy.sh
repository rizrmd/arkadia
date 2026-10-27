#!/usr/bin/env bash
# Supported additive game release: cumulative compiled client + authoritative Go
# server + persistence evidence, retaining all previously published art/players.
set -euo pipefail
cd "$(dirname "$0")/../.."
git diff --quiet -- src server scripts || { echo "Commit task source before deploying"; exit 1; }
mkdir -p "$HOME/releases"
if [[ "${ARKODIA_DEPLOY_LOCK_HELD:-0}" != 1 ]]; then exec 9>"$HOME/releases/arkodia-deploy.lock"; fi
flock -n 9 || { echo 'Another Arkodia deployment holds the lock'; exit 1; }
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH"
export GOFLAGS=-p=1 GOMAXPROCS=2 GOMEMLIMIT=256MiB GOTOOLCHAIN=local
stage="$(mktemp -d "$HOME/releases/gameplay-progress-runtime-XXXXXXXX")"
export GAMEPLAY_RELEASE_STAGE="$stage"
release_sha="$(git rev-parse HEAD)"
npx tsc --noEmit
node scripts/gameplay-progress/test.mjs
node scripts/gameplay-progress/test-release.mjs
node scripts/test-progression.mjs
node scripts/test-inventory.mjs
node scripts/test-settings.mjs
node --input-type=module -e 'import {build} from "vite"; await build({build:{outDir:process.env.GAMEPLAY_RELEASE_STAGE+"/site",copyPublicDir:false}});'
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X github.com/rizrmd/arkadia/server/internal/server.BuildCommit=$release_sha" -o "$GAMEPLAY_RELEASE_STAGE/arkodia" ./cmd/arkodia)
repo_root="$PWD"
mkdir -p "$stage/empty-site"
(cd "$stage" && GAME_SAVE_DIR="$stage/smoke-saves" ARKODIA_BIN="$stage/arkodia" SITE_DIR="$stage/empty-site" node "$repo_root/scripts/coop-smoke.mjs")
cp "$stage/docs/coop/smoke.json" docs/gameplay-progress/coop-smoke.json
rm -rf "$stage/smoke-saves" "$stage/empty-site" "$stage/docs"
mkdir -p "$stage/site/gameplay-progress/evidence"
cp docs/gameplay-progress/*.json docs/gameplay-progress/*.md "$stage/site/gameplay-progress/evidence/"
node --input-type=module <<'RELEASE'
import fs from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const stage=process.env.GAMEPLAY_RELEASE_STAGE,sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const files=Object.fromEntries(fs.readdirSync(stage+'/site/assets').filter(f=>/\.(js|css)$/.test(f)).map(f=>['/assets/'+f,createHash('sha256').update(fs.readFileSync(stage+'/site/assets/'+f)).digest('hex')]));
fs.writeFileSync(stage+'/site/gameplay-progress/release.json',JSON.stringify({commit:sha,at:new Date().toISOString(),feature:'Complete gameplay checkpoints with paused offline simulation',files},null,2));
RELEASE
tar -czf "$stage.tgz" -C "$stage" .
node --input-type=module <<'PUBLISH'
import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {sandboxId,publishRelease} from './scripts/arkodia/publish-layer.mjs';
const run=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',maxBuffer:16e6}));
const id=sandboxId();
for(const peer of run(['sessions','list','--all','--live'])){if(peer.id===process.env.FURAL_TURN_ID)continue;const tree=JSON.stringify(run(['sessions','process-tree',peer.id]));assert(!/scripts\/(?:fural-deploy\.sh|arkodia\/publish-layer\.mjs|[^" ]*\/(?:ship[^" ]*\.sh|deploy\.(?:sh|mjs)))/.test(tree),`Peer deploying: ${peer.id}`);}
const local=await fs.readFile('scripts/arkodia/gateway.mjs','utf8'),live=run(['organization','home-files','file','--custom-sandbox',id,'--path','gateway.mjs']).content;
// This task changes only the stable checkpoint directory passed to the Go child.
assert(live===local||live===local.replace(",GAME_SAVE_DIR:path.join(home,'game-saves')",''),'Live gateway changed; reconcile peer release before shipping');
await publishRelease({name:'gameplay-progress-'+execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).trim(),tgz:process.env.GAMEPLAY_RELEASE_STAGE+'.tgz'});
await fs.writeFile('docs/gameplay-progress/deployment.json',JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),archive:process.env.GAMEPLAY_RELEASE_STAGE+'.tgz',url:'https://ark-whachat.fural.space',at:new Date().toISOString()},null,2));
PUBLISH
