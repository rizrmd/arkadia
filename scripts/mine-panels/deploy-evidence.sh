#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/arkodia/deploy-lock.sh
acquire_arkodia_deploy_lock
trap release_arkodia_deploy_lock_metadata EXIT
live_sha="$(curl -fsS --max-time 20 https://arkodia.online/healthz | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).build))')"
git merge-base --is-ancestor c3355066 "$live_sha" || { echo 'Production must include Mine before evidence'; exit 1; }
# This scoped documentation layer does not replace game bundles, backend or saves.
evidence="$(mktemp -d "$HOME/releases/mine-evidence-XXXXXXXX")"
cp docs/mine-panels/{production.json,integration.json,knowledge.md,README.md} "$evidence/"
node scripts/arkodia/publish-layer.mjs --dir "$evidence" --prefix /mine-panels --name mine-panels-evidence
