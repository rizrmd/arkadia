#!/usr/bin/env bash
# Additive frontend game release through Arkodia's supported publisher.
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/arkodia/deploy-lock.sh
acquire_arkodia_deploy_lock
stage=$(mktemp -d "$HOME/releases/wildlife-runtime-XXXXXXXX")
trap 'release_arkodia_deploy_lock_metadata' EXIT
npx tsc --noEmit
node scripts/wildlife-runtime/test.mjs
node scripts/gathering/test.mjs
export WILDLIFE_STAGE="$stage"
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH" GOFLAGS=-p=1 GOMAXPROCS=2 GOMEMLIMIT=256MiB GOTOOLCHAIN=local
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X github.com/rizrmd/arkadia/server/internal/server.BuildCommit=$(git rev-parse HEAD)" -o "$stage/arkodia" ./cmd/arkodia)
node --input-type=module <<'JS'
import {build} from 'vite';import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const root=process.env.WILDLIFE_STAGE,site=root+'/site';await build({logLevel:'error',build:{outDir:site,copyPublicDir:false}});
// Art is supplied by existing cumulative layers; retain their complete byte inventory.
const r=await fetch('https://arkodia.online/asset-sizes.json',{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Live artwork inventory unavailable');await fs.writeFile(site+'/asset-sizes.json',await r.text());
await fs.mkdir(site+'/wildlife-runtime',{recursive:true});await fs.copyFile('docs/wildlife-runtime/local-browser.json',site+'/wildlife-runtime/local-browser.json');
const files={};for(const f of ['index.html','asset-sizes.json',...(await fs.readdir(site+'/assets')).map(f=>'assets/'+f)])files['/'+f]=createHash('sha256').update(await fs.readFile(site+'/'+f)).digest('hex');
await fs.writeFile(site+'/wildlife-runtime/release.json',JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),at:new Date().toISOString(),feature:'Random wildlife locomotion and hero projectile/area/melee hunting',frontendOnly:false,files},null,2));
JS
tar -czf "$stage.tgz" -C "$stage" site arkodia
node scripts/arkodia/publish-layer.mjs --tgz "$stage.tgz" --name "game-$(git rev-parse --short HEAD)"
