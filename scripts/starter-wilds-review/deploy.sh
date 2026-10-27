#!/usr/bin/env bash
# Additive review layer only: no client, server, maps, saves or runtime catalogs.
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p "$HOME/releases"
exec 9>"$HOME/releases/arkodia-deploy.lock"
flock -w 45 9 || { echo 'Deployment lock remained busy for 45 seconds'; exit 1; }
node --input-type=module <<'JS'
import {publishLayer,readDir} from './scripts/arkodia/publish-layer.mjs';
await publishLayer({name:'starter-wilds-review-v1',files:await readDir('public/starter-wilds-review/v1'),prefix:'/starter-wilds-review/v1',check:'/starter-wilds-review/v1/manifest.json'});
JS
