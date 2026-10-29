#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/arkodia/deploy-lock.sh
acquire_arkodia_deploy_lock
trap release_arkodia_deploy_lock_metadata EXIT
fural-agent tasks get ypmizqzglfmjthypnoguubkh | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{if(JSON.parse(s).status!=="done")throw Error("YPMIZ must be completed before starter integration")})'
live_sha="$(curl -fsS --max-time 20 https://arkodia.online/healthz | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).build))')"
git merge-base --is-ancestor "$live_sha" HEAD || { echo 'Merge the current cumulative production build before shipping'; exit 1; }
git diff --quiet -- src scripts server || { echo 'Commit task source before deployment'; exit 1; }
stage="$(mktemp -d "$HOME/releases/starter-stronghold-XXXXXXXX")"
export STARTER_STAGE="$stage"
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH" GOFLAGS=-p=1 GOMAXPROCS=2 GOMEMLIMIT=256MiB GOTOOLCHAIN=local
npx tsc --noEmit
node scripts/starter-stronghold/test.mjs
node scripts/building-tree/test.mjs
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X github.com/rizrmd/arkadia/server/internal/server.BuildCommit=$(git rev-parse HEAD)" -o "$stage/arkodia" ./cmd/arkodia)
node scripts/starter-stronghold/build.mjs
tar -czf "$stage.tgz" -C "$stage" site arkodia
node scripts/arkodia/publish-layer.mjs --tgz "$stage.tgz" --name "game-$(git rev-parse --short HEAD)"
