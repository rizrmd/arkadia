#!/usr/bin/env bash
# Additive cumulative release via the repository's supported sandbox release publisher.
set -euo pipefail
cd "$(dirname "$0")/../.."
git diff --quiet -- src scripts server || { echo 'Commit resource source before shipping'; exit 1; }
mkdir -p "$HOME/releases"
exec 9>"$HOME/releases/arkodia-deploy.lock"
flock -n 9 || { echo 'Another Arkodia release holds the shared deployment lock'; exit 1; }
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH" GOFLAGS=-p=1 GOMAXPROCS=2 GOMEMLIMIT=256MiB GOTOOLCHAIN=local
stage="$(mktemp -d "$HOME/releases/gathering-XXXXXXXX")"
export GATHERING_STAGE="$stage"
sha="$(git rev-parse HEAD)"
npx tsc --noEmit
node scripts/gathering/test.mjs
node scripts/test-stronghold.mjs
node scripts/test-inventory.mjs
node scripts/gameplay-progress/test.mjs
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X github.com/rizrmd/arkadia/server/internal/server.BuildCommit=$sha" -o "$stage/arkodia" ./cmd/arkodia)
node --input-type=module <<'BUILD'
import {build} from 'vite';import {stageEditor} from './scripts/environment-editor/build.mjs';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const stage=process.env.GATHERING_STAGE;await build({logLevel:'error',build:{outDir:stage+'/site',copyPublicDir:false}});await stageEditor(stage+'/site');
for(const file of ['inventory/axe.svg','wildlife/imagegen-atlas.png']){await fs.mkdir(stage+'/site/'+file.split('/').slice(0,-1).join('/'),{recursive:true});await fs.copyFile('public/'+file,stage+'/site/'+file);}
await fs.mkdir(stage+'/site/gathering-verification',{recursive:true});await fs.cp('docs/gathering',stage+'/site/gathering-verification',{recursive:true});
const files={};for(const rel of ['index.html','inventory/axe.svg','wildlife/imagegen-atlas.png',...(await fs.readdir(stage+'/site/assets')).filter(f=>/\.(js|css)$/.test(f)).map(f=>'assets/'+f)])files['/'+rel]=createHash('sha256').update(await fs.readFile(stage+'/site/'+rel)).digest('hex');
const manifest={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),at:new Date().toISOString(),feature:'Persistent Wood/Food, automatic Axe harvesting, approved wildlife and exactly-once hunting loot',files};await fs.writeFile(stage+'/site/gathering-verification/release.json',JSON.stringify(manifest,null,2));
BUILD
tar -czf "$stage.tgz" -C "$stage" .
node --input-type=module <<'PUBLISH'
import {publishRelease} from './scripts/arkodia/publish-layer.mjs';import {execFileSync} from 'node:child_process';import fs from 'node:fs/promises';
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();await publishRelease({name:'game-'+commit.slice(0,8),tgz:process.env.GATHERING_STAGE+'.tgz'});
const receipt={commit,url:'https://arkodia.online/',archive:process.env.GATHERING_STAGE+'.tgz',at:new Date().toISOString(),mode:'Supported additive cumulative game release; actual client/server deployment, not push-only'};await fs.writeFile('docs/gathering/deployment.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
PUBLISH
