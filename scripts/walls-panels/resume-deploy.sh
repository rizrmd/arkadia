#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/arkodia/deploy-lock.sh
acquire_arkodia_deploy_lock
trap release_arkodia_deploy_lock_metadata EXIT
: "${WALLS_RESUME_STAGE:?Set WALLS_RESUME_STAGE to the completed release directory}"
live_sha="$(curl -fsS --retry 2 --max-time 20 https://arkodia.online/healthz | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).build))')"
git merge-base --is-ancestor "$live_sha" HEAD
node scripts/arkodia/publish-layer.mjs --tgz "$WALLS_RESUME_STAGE.tgz" --name "walls-panels-$(node -p 'JSON.parse(require("fs").readFileSync(process.env.WALLS_RESUME_STAGE+"/site/walls-panels/release.json")).commit.slice(0,8)')"
cp "$WALLS_RESUME_STAGE/site/walls-panels/release.json" docs/walls-panels/release.json
