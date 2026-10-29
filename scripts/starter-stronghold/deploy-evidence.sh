#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/arkodia/deploy-lock.sh
acquire_arkodia_deploy_lock
trap release_arkodia_deploy_lock_metadata EXIT
node --input-type=module <<'JS'
import fs from 'node:fs/promises';import {publishLayer} from './scripts/arkodia/publish-layer.mjs';
const files={};for(const f of await fs.readdir('docs/starter-stronghold'))if(/\.(md|json|webp)$/.test(f))files['/'+f]=(await fs.readFile('docs/starter-stronghold/'+f)).toString('base64');await publishLayer({name:'starter-stronghold-evidence',prefix:'/starter-stronghold',files,check:'/starter-stronghold/production-browser.json'});
JS
