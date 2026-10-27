#!/usr/bin/env bash
# Additive game release through the existing release-layer publisher. Build only
# committed files in a detached tree, preserving all other sessions' work.
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p "$HOME/releases"
exec 9>"$HOME/releases/arkodia-deploy.lock"
flock -n 9 || { echo 'Another Arkodia deployment holds the shared lock'; exit 1; }
source_tree="$PWD"
release_tree="$(mktemp -d "$HOME/arkodia-pathfinding-release-XXXXXXXX")"
rmdir "$release_tree"
trap 'git -C "$source_tree" worktree remove --force "$release_tree"' EXIT
git worktree add --detach "$release_tree" HEAD
ln -s "$source_tree/node_modules" "$release_tree/node_modules"
cd "$release_tree"
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH"
export GOFLAGS=-p=1 GOMAXPROCS=2 GOMEMLIMIT=256MiB GOTOOLCHAIN=local
export PATHFINDING_STAGE="$(mktemp -d "$HOME/releases/pathfinding-runtime-XXXXXXXX")"
node scripts/verify-pathfinding.mjs
npx tsc --noEmit
node --input-type=module -e 'import {build} from "vite"; await build({build:{outDir:process.env.PATHFINDING_STAGE+"/site",copyPublicDir:false}});'
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o "$PATHFINDING_STAGE/arkodia" ./cmd/arkodia)
mkdir -p "$PATHFINDING_STAGE/site/pathfinding"
cp docs/pathfinding/verification.md "$PATHFINDING_STAGE/site/pathfinding/"
node --input-type=module <<'JS'
import fs from 'node:fs';import {execFileSync} from 'node:child_process';
fs.writeFileSync(process.env.PATHFINDING_STAGE+'/site/pathfinding/release.json',JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),at:new Date().toISOString(),feature:'Player collision-safe routes and solo/co-op enemy A* detours'}));
JS
tar -czf "$PATHFINDING_STAGE.tgz" -C "$PATHFINDING_STAGE" .
node scripts/arkodia/publish-layer.mjs --tgz "$PATHFINDING_STAGE.tgz" --name "pathfinding-$(git rev-parse --short HEAD)"
