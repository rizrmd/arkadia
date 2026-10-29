#!/usr/bin/env bash
set -euo pipefail
exec 9>"$HOME/releases/arkodia-deploy.lock"
flock -w 45 9
export MINE_RELEASE_ROOT="$PWD"
export MINE_LAYER_PUBLISHER="${MINE_LAYER_PUBLISHER:-$HOME/projects/arkadia/farm/scripts/arkodia/publish-layer.mjs}"
node --input-type=module <<'JS'
import {pathToFileURL} from 'node:url';
const {publishLayer,readDir}=await import(pathToFileURL(process.env.MINE_LAYER_PUBLISHER));
await publishLayer({name:'mine-painted-'+Date.now(),files:await readDir(process.env.MINE_RELEASE_ROOT+'/public/buildings/mine/painted'),prefix:'/buildings/mine/painted'});
await publishLayer({name:'mine-viewer-'+Date.now(),files:{'/index.html':Buffer.from('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mine painted asset review</title><style>html,body{margin:0;overflow:hidden}canvas{display:block}</style><script type="module" src="/buildings/mine/painted/viewer.mjs"></script></html>').toString('base64')},prefix:'/sprite-player/mine'});
JS
