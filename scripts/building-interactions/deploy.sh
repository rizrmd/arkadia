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
export BUILDING_STAGE="$(mktemp -d "$HOME/releases/building-interactions-XXXXXXXX")"
printf '%s\n' "$BUILDING_STAGE" > "$HOME/releases/building-interactions-stage.txt"
npx tsc --noEmit
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X github.com/rizrmd/arkadia/server/internal/server.BuildCommit=$(git rev-parse HEAD)" -o "$BUILDING_STAGE/arkodia" ./cmd/arkodia)
node scripts/building-interactions/build.mjs
tar -czf "$BUILDING_STAGE.tgz" -C "$BUILDING_STAGE" site arkodia
node scripts/arkodia/publish-layer.mjs --tgz "$BUILDING_STAGE.tgz" --name "game-$(git rev-parse --short HEAD)"
cp "$BUILDING_STAGE/site/building-interactions/release.json" docs/building-interactions/release.json
