#!/usr/bin/env bash
# Bootstrap for the linked organization clone; task source lives in an isolated worktree.
set -euo pipefail
exec bash "$HOME/projects/arkadia/core-center/scripts/core-center/deploy.sh"
