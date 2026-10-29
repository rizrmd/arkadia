#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/arkodia/deploy-lock.sh
acquire_arkodia_deploy_lock
trap release_arkodia_deploy_lock_metadata EXIT
# This scoped documentation layer does not replace game bundles, backend or saves.
evidence="$(mktemp -d "$HOME/releases/lumber-evidence-XXXXXXXX")"
cp docs/lumber-panels/{production.json,knowledge.md,release.json,README.md} "$evidence/"
node scripts/arkodia/publish-layer.mjs --dir "$evidence" --prefix /lumber-panels --name lumber-panels-evidence
