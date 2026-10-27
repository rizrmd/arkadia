#!/usr/bin/env bash
# Additive compiled-client release; retain the deployed server and static assets.
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p "$HOME/releases"
exec 9>"$HOME/releases/arkodia-deploy.lock"
flock -n 9 || { echo 'Another Arkodia deployment holds the lock'; exit 1; }
git diff --quiet -- src scripts server || { echo 'Commit source before deploying'; exit 1; }
export DEV_RELEASE_STAGE="$(mktemp -d "$HOME/releases/dev-startup-XXXXXXXX")"
npx tsc --noEmit
node --input-type=module -e 'import {build} from "vite";await build({build:{outDir:process.env.DEV_RELEASE_STAGE+"/site",copyPublicDir:false}});'
SITE_DIR="$DEV_RELEASE_STAGE/site" node scripts/dev-startup/verify.mjs
mkdir -p "$DEV_RELEASE_STAGE/site/dev-startup"
git rev-parse HEAD > "$DEV_RELEASE_STAGE/site/dev-startup/commit.txt"
tar -czf "$DEV_RELEASE_STAGE.tgz" -C "$DEV_RELEASE_STAGE" site
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {sandboxId,publishRelease} from './scripts/arkodia/publish-layer.mjs';
const run=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',maxBuffer:16e6}));
assert.equal(run(['organization','home-files','file','--custom-sandbox',sandboxId(),'--path','gateway.mjs']).content,fs.readFileSync('scripts/arkodia/gateway.mjs','utf8'),'Reconcile live gateway before publishing');
await publishRelease({name:'game-'+execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).trim(),tgz:process.env.DEV_RELEASE_STAGE+'.tgz'});
JS
