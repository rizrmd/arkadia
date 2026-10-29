#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
for action in idle run flame-fan flame-fan-moving cinder-step ember-snare furnace-heart hurt death; do
 scripts/ember-warden/blender.sh scripts/ember-warden/rig.py "$action"
done
