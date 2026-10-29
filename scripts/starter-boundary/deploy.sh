#!/usr/bin/env bash
set -euo pipefail
source_root="$(cd "$(dirname "$0")/../.." && pwd)"
expected_sha="$(git -C "$source_root" rev-parse HEAD)"
cd "${STARTER_RELEASE_WORKTREE:-$HOME/releases/starter-boundary-worktree}"
[[ "$(git rev-parse HEAD)" == "$expected_sha" ]] || { echo 'Release worktree must match the committed task SHA'; exit 1; }
git diff --quiet -- src scripts server public/coop public/buildings/starter-boundary || { echo 'Release source has uncommitted changes'; exit 1; }
source scripts/arkodia/deploy-lock.sh
acquire_arkodia_deploy_lock
trap release_arkodia_deploy_lock_metadata EXIT
live_sha="$(curl -fsS --max-time 20 https://arkodia.online/healthz | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).build))')"
git merge-base --is-ancestor "$live_sha" HEAD || { echo 'Merge the current cumulative production commit before release'; exit 1; }
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH" GOFLAGS=-p=1 GOMAXPROCS=2 GOMEMLIMIT=256MiB GOTOOLCHAIN=local
stage="$(mktemp -d "$HOME/releases/starter-boundary-release-XXXXXXXX")"
export STARTER_STAGE="$stage"
npx tsc --noEmit
node scripts/starter-boundary/test.mjs
node scripts/building-tree/test.mjs
go -C server test ./...
(cd server && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X github.com/rizrmd/arkadia/server/internal/server.BuildCommit=$expected_sha" -o "$stage/arkodia" ./cmd/arkodia)
node scripts/starter-boundary/build.mjs
tar -czf "$stage.tgz" -C "$stage" site arkodia
node scripts/arkodia/publish-layer.mjs --tgz "$stage.tgz" --name "starter-boundary-${expected_sha:0:8}"
