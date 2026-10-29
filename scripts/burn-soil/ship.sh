#!/usr/bin/env bash
# Supported versioned release pipeline; only committed files enter the release.
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p "$HOME/releases"
exec 9>"$HOME/releases/arkodia-deploy.lock"
flock -n 9 || { echo 'A peer owns the deployment lock; retry after completion.'; exit 1; }
if ps -eo args | grep -E 'node scripts/(arkodia/publish-layer|flame-fan-gameplay/publish-evidence)|bash scripts/fural-deploy.sh' | grep -v grep; then
 echo 'A peer publication is active; retry after completion.'; exit 1
fi
source_tree="$PWD"
release_tree="$(mktemp -d "$HOME/arkodia-burn-soil-XXXXXXXX")"
rmdir "$release_tree"
cleanup(){ git -C "$source_tree" worktree remove --force "$release_tree"; }
trap cleanup EXIT
git worktree add --detach "$release_tree" HEAD
ln -s "$source_tree/node_modules" "$release_tree/node_modules"
cd "$release_tree"
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH"
export GOFLAGS=-p=1 GOMAXPROCS=2 GOMEMLIMIT=256MiB GOTOOLCHAIN=local
node scripts/burn-soil/test.mjs
npx tsc --noEmit
(cd server && go test ./...)
node scripts/burn-soil/release.mjs
