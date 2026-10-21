#!/bin/sh
set -eu
RIFT_ASSET_RELEASE="${RIFT_RELEASE_ROOT:-$HOME/projects/arkadia/releases/rift-runner-assets}"
if [ -d "$RIFT_ASSET_RELEASE" ]; then cd "$RIFT_ASSET_RELEASE"; fi
exec node scripts/rift-runner/publish-prototype.mjs
