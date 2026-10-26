#!/usr/bin/env bash
# Only this experiment's committed files are published; preserve all peer WIP.
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p "$HOME/releases"
exec 9>"$HOME/releases/arkodia-deploy.lock"
flock -n 9 || { echo 'A peer publication holds the deployment lock.'; exit 1; }
source_tree="$PWD"
release_tree="$(mktemp -d "$HOME/arkodia-houdini-XXXXXXXX")"
rmdir "$release_tree"
cleanup(){ git -C "$source_tree" worktree remove --force "$release_tree"; }
trap cleanup EXIT
git worktree add --detach "$release_tree" HEAD
ln -s "$source_tree/node_modules" "$release_tree/node_modules"
cd "$release_tree"
npx tsc --noEmit
node scripts/houdini-flame-fan/deploy.mjs
