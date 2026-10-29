#!/usr/bin/env bash
# Additive concept review assets only; never replace runtime or map data.
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p "$HOME/releases"
exec 9>"$HOME/releases/arkodia-deploy.lock"
flock -w 45 9 || { echo 'Deployment lock remained busy for 45 seconds'; exit 1; }
node --input-type=module <<'JS'
import {publishLayer,readDir} from './scripts/arkodia/publish-layer.mjs';
await publishLayer({name:'world-map-review-v1',files:await readDir('public/world-map-review/v1'),prefix:'/world-map-review/v1',check:'/world-map-review/v1/manifest.json'});
JS
