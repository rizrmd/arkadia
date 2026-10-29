#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/arkodia/deploy-lock.sh
acquire_arkodia_deploy_lock
trap release_arkodia_deploy_lock_metadata EXIT
node --input-type=module <<'JS'
import {publishLayer,readDir} from './scripts/arkodia/publish-layer.mjs';
await publishLayer({name:'frozen-terrain-application-evidence',files:await readDir('docs/frozen-terrain-apply'),prefix:'/frozen-terrain-apply/evidence',check:'/frozen-terrain-apply/evidence/live-verification.json'});
JS
