#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/arkodia/deploy-lock.sh
acquire_arkodia_deploy_lock
trap release_arkodia_deploy_lock_metadata EXIT
# This scoped documentation layer does not replace game bundles, backend or saves.
evidence="$(mktemp -d "$HOME/releases/farm-evidence-XXXXXXXX")"
cp docs/farm-panels/{production.json,knowledge.md,README.md} "$evidence/"
node scripts/arkodia/publish-layer.mjs --dir "$evidence" --prefix /farm-panels --name farm-panels-evidence
