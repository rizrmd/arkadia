#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/arkodia/deploy-lock.sh
acquire_arkodia_deploy_lock
trap release_arkodia_deploy_lock_metadata EXIT
node scripts/arkodia/publish-layer.mjs --dir docs/kitchen-panels --prefix /kitchen-panels --name "kitchen-evidence-$(git rev-parse --short HEAD)"
