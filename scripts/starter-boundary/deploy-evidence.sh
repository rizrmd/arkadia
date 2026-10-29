#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/arkodia/deploy-lock.sh
acquire_arkodia_deploy_lock
trap release_arkodia_deploy_lock_metadata EXIT
node -e 'const fs=require("fs");const r=JSON.parse(fs.readFileSync("docs/starter-boundary/release-verification.json"));if(!r.pass)throw Error("Production verification required");fetch("https://arkodia.online/healthz").then(r=>r.json()).then(h=>{if(h.build!==r.releaseCommit)throw Error("Runtime changed; verify latest deployment first")}).catch(e=>{console.error(e.message);process.exit(1)})'
stage="$(mktemp -d "$HOME/releases/starter-boundary-evidence-XXXXXXXX")"
mkdir -p "$stage/site/starter-boundary"
cp -R docs/starter-boundary/. "$stage/site/starter-boundary/"
tar -czf "$stage.tgz" -C "$stage" site
node scripts/arkodia/publish-layer.mjs --tgz "$stage.tgz" --name "starter-boundary-evidence-$(git rev-parse --short HEAD)"
