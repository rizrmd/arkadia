#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
# Run after the body queue has finished; study and body exports share a temp frame.
while [ ! -f public/ember-warden/v1/metadata/death-3.json ]; do sleep 3; done
scripts/ember-warden/blender.sh scripts/ember-warden/render-initial-study.py
node scripts/ember-warden/assemble.mjs
node scripts/ember-warden/report.mjs
node scripts/ember-warden/verify.mjs
node scripts/ember-warden/report.mjs
printf 'LOCAL_PIPELINE_COMPLETE\n'
