#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/arkodia/deploy-lock.sh
acquire_arkodia_deploy_lock
trap release_arkodia_deploy_lock_metadata EXIT
receipt_dir="$(mktemp -d "$HOME/releases/walls-receipt-XXXXXXXX")"
cp docs/walls-panels/production.json "$receipt_dir/production.json"
node scripts/arkodia/publish-layer.mjs --dir "$receipt_dir" --prefix /walls-panels --name "walls-receipt-$(git rev-parse --short HEAD)"
