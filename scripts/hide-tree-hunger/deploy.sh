#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/arkodia/deploy-lock.sh
acquire_arkodia_deploy_lock
trap release_arkodia_deploy_lock_metadata EXIT
live_sha="$(curl -fsS --max-time 20 https://arkodia.online/healthz | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).build))')"
git merge-base --is-ancestor "$live_sha" HEAD || { echo 'Merge the current production build before shipping'; exit 1; }
git diff --quiet -- src scripts server || { echo 'Commit task source before shipping'; exit 1; }
stage="$(mktemp -d "$HOME/releases/hide-tree-hunger-XXXXXXXX")"
export HIDE_HUNGER_STAGE="$stage"
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH" GOFLAGS=-p=1 GOMAXPROCS=2 GOMEMLIMIT=256MiB GOTOOLCHAIN=local
npx tsc --noEmit
node scripts/hunger/test.mjs
node scripts/building-tree/test.mjs
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X github.com/rizrmd/arkadia/server/internal/server.BuildCommit=$(git rev-parse HEAD)" -o "$stage/arkodia" ./cmd/arkodia)
node --input-type=module <<'BUILD'
import {build} from 'vite';
await build({logLevel:'error',build:{outDir:process.env.HIDE_HUNGER_STAGE+'/site',copyPublicDir:false}});
BUILD
tar -czf "$stage.tgz" -C "$stage" site arkodia
node scripts/arkodia/publish-layer.mjs --tgz "$stage.tgz" --name "game-$(git rev-parse --short HEAD)"
