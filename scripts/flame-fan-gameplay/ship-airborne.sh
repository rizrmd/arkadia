#!/usr/bin/env bash
# Run the committed isolated source through the organization-supported ship command.
set -euo pipefail
source_tree="${FLAME_FAN_AIRBORNE_TREE:-$HOME/projects/arkadia/flame-airborne}"
cd "$source_tree"
git diff --quiet -- src server scripts || { echo 'Commit airborne source before shipping'; exit 1; }
git fetch origin
git merge-base --is-ancestor origin/feat/stronghold HEAD || { echo 'Merge current remote before releasing'; exit 1; }
exec bash scripts/flame-fan-gameplay/deploy-airborne.sh
