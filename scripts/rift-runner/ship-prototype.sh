#!/bin/sh
set -eu
if [ -n "${RIFT_RELEASE_ROOT:-}" ]; then cd "$RIFT_RELEASE_ROOT"; fi
exec node scripts/rift-runner/publish-prototype.mjs
