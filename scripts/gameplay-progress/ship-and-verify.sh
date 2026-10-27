#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p "$HOME/releases"
exec 9>"$HOME/releases/arkodia-deploy.lock"
flock -n 9 || { echo 'Another Arkodia deployment holds the lock'; exit 1; }
export ARKODIA_DEPLOY_LOCK_HELD=1
# Hold the shared lock through live browser acceptance and evidence publication.
bash scripts/gameplay-progress/deploy.sh
node scripts/gameplay-progress/verify-release.mjs
VERIFY_URL=https://ark-whachat.fural.space ONLY=desktop-rift-runner SKIP_HERO_SWITCH=1 node scripts/gameplay-progress/browser.mjs
VERIFY_URL=https://ark-whachat.fural.space ONLY=mobile-ember-warden SKIP_HERO_SWITCH=1 node scripts/gameplay-progress/browser.mjs
node --input-type=module <<'REPORT'
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const reports=await Promise.all(['desktop-rift-runner','mobile-ember-warden'].map(async name=>JSON.parse(await fs.readFile(`docs/gameplay-progress/browser-live-${name}.json`,'utf8'))));
assert(reports.every(r=>r.cases.length===1&&r.errors.length===0));
await fs.writeFile('docs/gameplay-progress/browser-live.json',JSON.stringify({base:reports[0].base,cases:reports.flatMap(r=>r.cases),errors:[],method:'Actual public release: persistent Chromium browser shutdown/relaunch and two exact refreshes; desktop Rift Runner and touch Ember Warden.'},null,2));
REPORT
node scripts/gameplay-progress/publish-knowledge.mjs
git add docs/gameplay-progress
git commit -m "Record full gameplay persistence acceptance and English Knowledge updates"
git push origin fix/complete-gameplay-progress
node --input-type=module <<'EVIDENCE'
import {publishLayer,readDir} from './scripts/arkodia/publish-layer.mjs';import {execFileSync} from 'node:child_process';
await publishLayer({name:'gameplay-evidence-'+execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).trim(),files:await readDir('docs/gameplay-progress'),prefix:'/gameplay-progress/evidence'});
for(const file of ['browser-local.json','browser-live.json','faults.json','coop.json','release-verification.json','knowledge.json']){const r=await fetch('https://ark-whachat.fural.space/gameplay-progress/evidence/'+file,{cache:'no-store'});if(r.status!==200)throw Error('Public evidence unavailable: '+file);}
EVIDENCE
CHECK_ONLY=1 node scripts/gameplay-progress/verify-release.mjs
echo 'GAMEPLAY_RELEASE_AND_ACCEPTANCE_COMPLETE'
