#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Supported review layer: keeps the latest combined game release and gateway intact.
node scripts/arkodia/publish-layer.mjs --dir public/frozen-frontier/v1 --prefix /frozen-frontier/v1 --name frozen-frontier-v1
