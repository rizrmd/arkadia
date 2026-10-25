#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p "$HOME/releases"
# Shared member sandbox: serialize this preview's upload and single restart.
exec 9>"$HOME/releases/arkodia-deploy.lock"
flock -n 9 || { echo 'Another Arkodia deployment holds the shared lock'; exit 1; }
if ps -eo args | grep -E 'node scripts/(arkodia/publish-layer|flame-fan-gameplay/publish-evidence)|bash scripts/fural-deploy.sh' | grep -v grep; then
 echo 'A peer deployment is active; retry after it finishes.'; exit 1
fi
node scripts/flame-fan-flipbook/deploy.mjs
