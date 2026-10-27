#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p "$HOME/releases"
exec 9>"$HOME/releases/arkodia-deploy.lock"
flock -w 45 9 || { echo 'Arkodia deployment lock remained busy'; exit 1; }
node --input-type=module <<'JS'
import {publishLayer,readDir} from './scripts/arkodia/publish-layer.mjs';
const layer=await publishLayer({name:'frozen-terrain-review-v1',files:await readDir('public/frozen-terrain-review/v1'),prefix:'/frozen-terrain-review/v1',check:'/frozen-terrain-review/v1/manifest.json'});
console.log('Terrain review layer:',layer);
JS
