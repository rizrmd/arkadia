#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p "$HOME/releases"
exec 9>"$HOME/releases/arkodia-deploy.lock"
flock -n 9 || { echo 'A peer publication owns the shared deployment lock'; exit 1; }
if ps -eo args | grep -E 'node scripts/(arkodia/publish-layer|flame-fan-gameplay/publish-evidence)|bash scripts/fural-deploy.sh' | grep -v grep; then
 echo 'A peer publication is active'; exit 1
fi
node scripts/burn-soil/publish-evidence.mjs
