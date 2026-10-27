#!/usr/bin/env bash
# Cumulative game + independent editor application. Uses the normal release publisher and durable game-save directory.
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p "$HOME/releases"
exec 9>"$HOME/releases/arkodia-deploy.lock"
flock -n 9 || { echo "Another Arkodia deployment holds the lock"; exit 1; }
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH" GOFLAGS=-p=1 GOMAXPROCS=2 GOMEMLIMIT=256MiB GOTOOLCHAIN=local
git diff --quiet -- src server scripts || { echo "Commit task source before deploying"; exit 1; }
stage="$(mktemp -d "$HOME/releases/environment-editor-runtime-XXXXXXXX")"
export ENVIRONMENT_EDITOR_STAGE="$stage"
sha="$(git rev-parse HEAD)"
npx tsc --noEmit
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X github.com/rizrmd/arkadia/server/internal/server.BuildCommit=$sha" -o "$stage/arkodia" ./cmd/arkodia)
node --input-type=module <<'BUILD'
import {build} from 'vite';import {stageEditor} from './scripts/environment-editor/build.mjs';import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const stage=process.env.ENVIRONMENT_EDITOR_STAGE;
await build({logLevel:'error',build:{outDir:stage+'/site',copyPublicDir:false}});
await stageEditor(stage+'/site');
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const files={};for(const f of await fs.readdir(stage+'/site/assets'))if(/\.(js|css)$/.test(f))files['/assets/'+f]=createHash('sha256').update(await fs.readFile(stage+'/site/assets/'+f)).digest('hex');
await fs.writeFile(stage+'/site/environment-editor/release.json',JSON.stringify({commit,at:new Date().toISOString(),feature:'Native Pixi environment editor and durable published maps',files},null,2));
BUILD
tar -czf "$stage.tgz" -C "$stage" .
node --input-type=module <<'PUBLISH'
import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {publishRelease} from './scripts/arkodia/publish-layer.mjs';
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();await publishRelease({name:'environment-editor-'+sha.slice(0,8),tgz:process.env.ENVIRONMENT_EDITOR_STAGE+'.tgz'});
await fs.writeFile('docs/environment-editor/deployment.json',JSON.stringify({commit:sha,url:'https://arkodia.online/environment-editor/',game:'https://arkodia.online/',archive:process.env.ENVIRONMENT_EDITOR_STAGE+'.tgz',at:new Date().toISOString()},null,2));
PUBLISH
