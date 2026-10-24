#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Prefix-only review layer; preserve latest game release and installed gateway.
node scripts/arkodia/publish-layer.mjs --dir public/frozen-frontier/v2 --prefix /environment-corners/frozen-frontier/v2 --name frozen-frontier-v2
