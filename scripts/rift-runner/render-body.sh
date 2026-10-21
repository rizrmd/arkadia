#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
RIFT_ACTION=${1:?action required}
RIFT_GROUP=${2:?group required}
RIFT_HASH=$(node scripts/rift-runner/source-hash.mjs)
RIFT_LOG="$HOME/attachments/rift-render-$RIFT_HASH-$RIFT_ACTION-$RIFT_GROUP.log"
rg -q "mode=='export'" scripts/rift-runner/rig.py
scripts/rift-runner/blender.sh scripts/rift-runner/rig.py export "$RIFT_ACTION" "$RIFT_GROUP" > "$RIFT_LOG" 2>&1
rg -q '^BODY_EXPORT ' "$RIFT_LOG"
RIFT_AFTER=$(node scripts/rift-runner/source-hash.mjs)
[ "$RIFT_HASH" = "$RIFT_AFTER" ] || { echo 'Source changed while rendering' >&2; exit 1; }
node --input-type=module - "$RIFT_HASH" "$RIFT_ACTION" "$RIFT_GROUP" <<'JS'
import fs from 'node:fs';const [hash,action,group]=process.argv.slice(2),p=`public/rift-runner/v2/exports/${hash}/${action}-${group}.json`,m=JSON.parse(fs.readFileSync(p));if(m.sourceHash!==hash||!m.clips.length||m.clips.some(c=>!c.frames.length))throw Error('Invalid export receipt');console.log(JSON.stringify({export:p,directions:m.clips.map(c=>c.direction),frames:m.clips.reduce((n,c)=>n+c.frames.length,0)}));
JS
