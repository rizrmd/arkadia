#!/usr/bin/env bash
# Frontend-only game release. Existing server, saves, maps and public artwork remain in place.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/arkodia/deploy-lock.sh
acquire_arkodia_deploy_lock
stage=$(mktemp -d)
trap 'rm -r "$stage"; release_arkodia_deploy_lock_metadata' EXIT
npm run build
mkdir -p "$stage/site/assets" "$stage/site/compact-resource-hud" "$HOME/releases"
cp dist/index.html "$stage/site/index.html"
cp dist/assets/* "$stage/site/assets/"
cp docs/compact-resource-hud/* "$stage/site/compact-resource-hud/"
node --input-type=module -e 'import fs from "node:fs";import {execFileSync} from "node:child_process";fs.writeFileSync(process.argv[1],JSON.stringify({commit:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),resourceScale:.3,order:["Gold","Wood","Food","Time"],frontendOnly:true}));' "$stage/site/compact-resource-hud/release.json"
archive=$(mktemp "$HOME/releases/arkodia-resource-hud-XXXXXXXX.tgz")
tar -czf "$archive" -C "$stage" site
node scripts/arkodia/publish-layer.mjs --tgz "$archive" --name "game-$(git rev-parse --short HEAD)"
