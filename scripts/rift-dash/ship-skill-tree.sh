#!/usr/bin/env bash
# Runtime-only additive game release via the supported Arkodia tgz publisher.
# No game artwork changed: retain deployed static assets and dedicated players.
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p "$HOME/releases"
exec 9>"$HOME/releases/arkodia-deploy.lock"
flock -n 9 || { echo 'Another Arkodia deployment holds the lock'; exit 1; }
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH"
export GOFLAGS=-p=1 GOMAXPROCS=2 GOMEMLIMIT=256MiB GOTOOLCHAIN=local
stage="$(mktemp -d "$HOME/releases/rift-tree-runtime-XXXXXXXX")"
export RIFT_TREE_STAGE="$stage"
npx tsc --noEmit
node --input-type=module -e 'import {build} from "vite"; await build({build:{outDir:process.env.RIFT_TREE_STAGE+"/site",copyPublicDir:false}});'
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o "$RIFT_TREE_STAGE/arkodia" ./cmd/arkodia)
ARKODIA_BIN="$stage/arkodia" SITE_DIR=public node scripts/coop-smoke.mjs
mkdir -p "$stage/site/rift-dash/skill-tree"
cp docs/rift-dash/skill-tree/* "$stage/site/rift-dash/skill-tree/"
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
await publishRelease({name:'rift-dash-skill-tree-'+execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).trim(),tgz:process.env.RIFT_TREE_STAGE+'.tgz'});
await fs.writeFile('docs/rift-dash/skill-tree/deployment.json',JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),archive:process.env.RIFT_TREE_STAGE+'.tgz',url:'https://ark-whachat.fural.space',at:new Date().toISOString(),scope:'Additive runtime release: compiled client, matching server, Skill Tree evidence. Existing static artwork and player retained.'},null,2));
JS
