#!/usr/bin/env bash
# Release only committed cumulative source; the editor deployer takes arkodia-deploy.lock.
set -euo pipefail
cd "$(dirname "$0")/../.."
source_tree="$PWD"
release_tree="$(mktemp -d "$HOME/arkodia-ground-XXXXXXXX")"
rmdir "$release_tree"
cleanup(){ git -C "$source_tree" worktree remove --force "$release_tree"; }
trap cleanup EXIT
git worktree add --detach "$release_tree" HEAD
ln -s "$source_tree/node_modules" "$release_tree/node_modules"
cd "$release_tree"
live_sha="$(node --input-type=module -e 'const h=await(await fetch("https://arkodia.online/healthz")).json();if(!h.build)throw Error("Missing live build");console.log(h.build)')"
git merge-base --is-ancestor "$live_sha" HEAD
bash scripts/environment-editor/deploy.sh
cp docs/environment-editor/deployment.json "$source_tree/docs/ground-textures/deployment.json"
