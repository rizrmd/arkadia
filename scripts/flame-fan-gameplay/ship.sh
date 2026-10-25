#!/usr/bin/env bash
# Supported game release from committed files, preserving peers' uncommitted work.
set -euo pipefail
cd "$(dirname "$0")/../.."
source_tree="$PWD"
release_tree="$(mktemp -d "$HOME/arkodia-flame-release-XXXXXXXX")"
rmdir "$release_tree"
cleanup(){ git -C "$source_tree" worktree remove --force "$release_tree"; }
trap cleanup EXIT
git worktree add --detach "$release_tree" HEAD
ln -s "$source_tree/node_modules" "$release_tree/node_modules"
mkdir -p "$release_tree/server/bin"
cd "$release_tree"
exec_script_status=0
bash scripts/fural-deploy.sh || exec_script_status=$?
exit "$exec_script_status"
