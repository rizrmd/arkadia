#!/usr/bin/env bash
# Release the game as one deployable into the one Arkadia sandbox (https://ark-whachat.fural.space): the
# Go game server (server/) with the built Vite client, behind scripts/arkadia/gateway.mjs, which also serves every
# review page. Published as a release layer (scripts/arkadia/publish-layer.mjs) with this commit's gateway.
#   scripts/fural-deploy.sh                      (also what `fural-agent repos ship` runs)
# Needs Node (npm ci done), Go 1.25 (organization runtime installs it in ~/.local/go) and the Playwright Chromium
# that scripts/organization-setup.sh prepares (used to list the files the game loads).
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH"
STAGE="$HOME/releases/arkadia-game"

npm run build
# The organization shares 1 GiB of RAM across sessions: compile one package at a time under a memory limit.
export GOFLAGS=-p=1 GOMAXPROCS=2 GOMEMLIMIT=256MiB
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o bin/arkadia ./cmd/arkadia)
node scripts/coop-smoke.mjs >/dev/null

# Stage the binary and only the files the game loads (dist/ also carries hundreds of MB of documentation renders).
list="$(mktemp)"; trap 'rm -f "$list"' EXIT
node scripts/coop-site-files.mjs > "$list"
rm -rf "$STAGE"; mkdir -p "$STAGE/site"
cp server/bin/arkadia "$STAGE/arkadia"
while IFS= read -r f; do mkdir -p "$STAGE/site/$(dirname "$f")"; cp "dist/$f" "$STAGE/site/$f"; done < "$list"
# The co-op and hero-picker screenshots, test reports and UI frame sources embedded in Knowledge.
mkdir -p "$STAGE/site/coop/docs"; cp docs/coop/*.webp docs/coop/*.json "$STAGE/site/coop/docs/"
mkdir -p "$STAGE/site/hero-select"; cp docs/hero-select/*.webp docs/hero-select/*.json "$STAGE/site/hero-select/"
mkdir -p "$STAGE/site/hero-picker-size"; cp docs/hero-picker-size/*.webp docs/hero-picker-size/*.json "$STAGE/site/hero-picker-size/"
mkdir -p "$STAGE/site/foot-shadow"; cp docs/foot-shadow/*.webp docs/foot-shadow/*.png "$STAGE/site/foot-shadow/"
mkdir -p "$STAGE/site/hero-night-visibility"; cp docs/hero-night-visibility/*.webp docs/hero-night-visibility/*.json "$STAGE/site/hero-night-visibility/"
mkdir -p "$STAGE/site/realistic-torch"; cp public/realistic-torch/* "$STAGE/site/realistic-torch/"
mkdir -p "$STAGE/site/sharp-torches"; cp docs/sharp-torches/*.png docs/sharp-torches/*.json "$STAGE/site/sharp-torches/"
mkdir -p "$STAGE/site/gateway-lighting"; cp docs/gateway-lighting/*.png docs/gateway-lighting/*.json "$STAGE/site/gateway-lighting/"
mkdir -p "$STAGE/site/gate-seams"; cp docs/gate-seams/*.png "$STAGE/site/gate-seams/"
mkdir -p "$STAGE/site/full-gateway"; cp docs/full-gateway/*.json "$STAGE/site/full-gateway/"
mkdir -p "$STAGE/site/walk-behind"; cp docs/walk-behind/*.webp "$STAGE/site/walk-behind/"
mkdir -p "$STAGE/site/combat-vfx"; cp docs/combat-vfx/*.webp docs/combat-vfx/*.json "$STAGE/site/combat-vfx/"
mkdir -p "$STAGE/site/three-slot-autocast"; cp docs/three-slot-autocast/*.webp docs/three-slot-autocast/*.json "$STAGE/site/three-slot-autocast/"
mkdir -p "$STAGE/site/monster-scaling"; cp docs/monster-scaling/*.webp docs/monster-scaling/*.json "$STAGE/site/monster-scaling/"
mkdir -p "$STAGE/site/locked-zoom-aoe"; cp docs/locked-zoom-aoe/*.webp docs/locked-zoom-aoe/*.json docs/assets/locked-zoom-aoe-ref.png "$STAGE/site/locked-zoom-aoe/"
mkdir -p "$STAGE/site/soul-pickups"; cp docs/soul-pickups/*.webp docs/soul-pickups/*.json "$STAGE/site/soul-pickups/"
mkdir -p "$STAGE/site/ui"; cp assets-src/ui/hero-card-frame*.png "$STAGE/site/ui/"
echo "Staged $(wc -l < "$list") files, $(du -sh "$STAGE" | cut -f1) in $STAGE"

# One versioned tarball, uploaded in parts and applied by the gateway at boot (the release also writes www/index.html).
tgz="$HOME/releases/arkadia-game-$(git rev-parse --short HEAD).tgz"
tar -C "$STAGE" -cz . > "$tgz"
node scripts/arkadia/publish-layer.mjs --tgz "$tgz" --name "game-$(git rev-parse --short HEAD)"
