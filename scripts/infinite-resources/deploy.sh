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
export INFINITE_STAGE="$(mktemp -d "$HOME/releases/infinite-resources-XXXXXXXX")"
printf '%s\n' "$INFINITE_STAGE" > "$HOME/releases/infinite-resources-stage.txt"
node scripts/infinite-resources/test.mjs
./node_modules/.bin/tsc --noEmit
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X github.com/rizrmd/arkadia/server/internal/server.BuildCommit=$(git rev-parse HEAD)" -o "$INFINITE_STAGE/arkodia" ./cmd/arkodia)
node scripts/infinite-resources/build.mjs
tar -czf "$INFINITE_STAGE.tgz" -C "$INFINITE_STAGE" site arkodia
node scripts/arkodia/publish-layer.mjs --tgz "$INFINITE_STAGE.tgz" --name "game-$(git rev-parse --short HEAD)"
cp "$INFINITE_STAGE/site/infinite-resources/release.json" docs/infinite-resources/release.json
