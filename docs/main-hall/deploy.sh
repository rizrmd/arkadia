#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$HOME/releases"
exec 9>"$HOME/releases/arkodia-deploy.lock"
flock -w 45 9
node "$HOME/projects/arkadia/farm/scripts/arkodia/publish-layer.mjs" --dir docs/main-hall --prefix /design/main-hall --name main-hall-design --check /design/main-hall/concept-v1.png
