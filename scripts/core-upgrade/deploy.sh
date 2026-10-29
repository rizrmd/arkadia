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
export CORE_UPGRADE_STAGE="$(mktemp -d "$HOME/releases/core-upgrade-XXXXXXXX")"
npx tsc --noEmit
node scripts/core-campfire/test.mjs
node scripts/core-upgrade/test.mjs
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X github.com/rizrmd/arkadia/server/internal/server.BuildCommit=$(git rev-parse HEAD)" -o "$CORE_UPGRADE_STAGE/arkodia" ./cmd/arkodia)
node scripts/core-upgrade/build.mjs
tar -czf "$CORE_UPGRADE_STAGE.tgz" -C "$CORE_UPGRADE_STAGE" site arkodia
node scripts/arkodia/publish-layer.mjs --tgz "$CORE_UPGRADE_STAGE.tgz" --name "core-upgrade-$(git rev-parse --short HEAD)"
cp "$CORE_UPGRADE_STAGE/site/core-upgrade/release.json" docs/core-upgrade/release.json
