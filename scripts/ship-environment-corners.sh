#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Publish only this artwork gallery through the project's existing release-layer workflow.
node scripts/arkadia/publish-layer.mjs --dir public/environment-corners/v1 --prefix /environment-corners/v1 --name environment-corners-v1
