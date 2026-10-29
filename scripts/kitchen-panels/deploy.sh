#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/arkodia/deploy-lock.sh
acquire_arkodia_deploy_lock
trap release_arkodia_deploy_lock_metadata EXIT
live_sha="$(curl -fsS --max-time 20 https://arkodia.online/healthz | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).build))')"
git merge-base --is-ancestor "$live_sha" HEAD || { echo 'Merge current production before release'; exit 1; }
git diff --quiet -- src scripts server || { echo 'Commit source before release'; exit 1; }
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH" GOFLAGS=-p=1 GOMAXPROCS=2 GOMEMLIMIT=256MiB GOTOOLCHAIN=local
export KITCHEN_STAGE="$(mktemp -d "$HOME/releases/kitchen-panels-XXXXXXXX")"
npx tsc --noEmit
node scripts/kitchen-panels/test.mjs
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X github.com/rizrmd/arkadia/server/internal/server.BuildCommit=$(git rev-parse HEAD)" -o "$KITCHEN_STAGE/arkodia" ./cmd/arkodia)
node scripts/kitchen-panels/build.mjs
tar -czf "$KITCHEN_STAGE.tgz" -C "$KITCHEN_STAGE" site arkodia
node scripts/arkodia/publish-layer.mjs --tgz "$KITCHEN_STAGE.tgz" --name "kitchen-panels-$(git rev-parse --short HEAD)"
cp "$KITCHEN_STAGE/site/kitchen-panels/release.json" docs/kitchen-panels/release.json
