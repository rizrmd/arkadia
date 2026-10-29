#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p "$HOME/releases"
exec 9>"$HOME/releases/arkodia-deploy.lock"
flock -w 45 9
node scripts/arkodia/publish-layer.mjs --dir public/frozen-terrain-review/editor-concept-v1 --prefix /frozen-terrain-review/editor-concept-v1 --name frozen-terrain-editor-concept-v1
