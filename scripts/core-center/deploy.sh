#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/arkodia/deploy-lock.sh
acquire_arkodia_deploy_lock
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH" GOFLAGS=-p=1 GOMAXPROCS=2 GOMEMLIMIT=256MiB GOTOOLCHAIN=local
sha="$(git rev-parse HEAD)"
live_sha="$(curl -fsS --max-time 30 https://arkodia.online/healthz | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).build))')"
git merge-base --is-ancestor "$live_sha" HEAD || { echo "Live release is newer; merge it before deploying"; exit 1; }
git diff --quiet -- src server scripts || { echo "Commit task source before deploying"; exit 1; }
stage="$(mktemp -d "$HOME/releases/core-center-runtime-XXXXXXXX")"
trap 'release_arkodia_deploy_lock_metadata' EXIT
export CORE_RELEASE_STAGE="$stage"
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X github.com/rizrmd/arkadia/server/internal/server.BuildCommit=$sha" -o "$stage/arkodia" ./cmd/arkodia)
npx tsc --noEmit
node --input-type=module <<'BUILD'
import {build} from 'vite';import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const stage=process.env.CORE_RELEASE_STAGE;
await build({logLevel:'error',build:{outDir:stage+'/site',copyPublicDir:false}});

await fs.mkdir(stage+'/site/buildings/stronghold-core',{recursive:true});
await fs.cp('public/buildings/stronghold-core/painted',stage+'/site/buildings/stronghold-core/painted',{recursive:true});
await fs.mkdir(stage+'/site/coop',{recursive:true});await fs.copyFile('public/coop/nav.json',stage+'/site/coop/nav.json');
await fs.cp('docs/core-center',stage+'/site/core-center',{recursive:true});
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),files={};
for(const f of await fs.readdir(stage+'/site/assets'))if(/\.(js|css)$/.test(f))files['/assets/'+f]=createHash('sha256').update(await fs.readFile(stage+'/site/assets/'+f)).digest('hex');
await fs.writeFile(stage+'/site/core-center/release.json',JSON.stringify({commit,at:new Date().toISOString(),files},null,2));
BUILD
tar -czf "$stage.tgz" -C "$stage" .
node --input-type=module <<'PUBLISH'
import {publishRelease} from './scripts/arkodia/publish-layer.mjs';
await publishRelease({name:'core-center',tgz:process.env.CORE_RELEASE_STAGE+'.tgz'});
PUBLISH
