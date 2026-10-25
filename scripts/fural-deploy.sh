#!/usr/bin/env bash
# Release the game as one deployable into the one Arkodia sandbox (https://ark-whachat.fural.space): the
# Go game server (server/) with the built Vite client, behind scripts/arkodia/gateway.mjs, which also serves every
# review page. Published as a release layer (scripts/arkodia/publish-layer.mjs) with this commit's gateway.
#   scripts/fural-deploy.sh                      (also what `fural-agent repos ship` runs)
# Needs Node (npm ci done), Go 1.25 (organization runtime installs it in ~/.local/go) and the Playwright Chromium
# that scripts/organization-setup.sh prepares (used to list the files the game loads).
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH"
STAGE="$(mktemp -d)"
DIST_DIR="$(mktemp -d)"
list="$(mktemp)"
trap 'rm -rf "$STAGE" "$DIST_DIR" "$list"' EXIT

node scripts/shadow-audit/test.mjs
node scripts/shadow-audit/test-field.mjs
node scripts/android-stutter/test.mjs
node scripts/android-stutter/test-cadence.mjs
node scripts/android-stutter/verify-flame-gpu.mjs
node scripts/android-stutter/verify-alpha-cache.mjs
npx tsc --noEmit && npx vite build --outDir "$DIST_DIR"
# The organization shares 1 GiB of RAM across sessions: compile one package at a time under a memory limit.
export GOFLAGS=-p=1 GOMAXPROCS=2 GOMEMLIMIT=256MiB GOTOOLCHAIN=local
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o "$DIST_DIR/arkodia" ./cmd/arkodia)
cp -f "$DIST_DIR/arkodia" server/bin/arkodia 2>/dev/null || true
ARKODIA_BIN="$DIST_DIR/arkodia" SITE_DIR="$DIST_DIR" node scripts/coop-smoke.mjs >/dev/null

# Stage the binary and only the files the game loads (dist/ also carries hundreds of MB of documentation renders).
SITE_DIR="$DIST_DIR" ARKODIA_BIN="$DIST_DIR/arkodia" node scripts/coop-site-files.mjs > "$list"
rm -rf "$STAGE"; mkdir -p "$STAGE/site"
cp "$DIST_DIR/arkodia" "$STAGE/arkodia"
while IFS= read -r f; do mkdir -p "$STAGE/site/$(dirname "$f")"; cp -p "$DIST_DIR/$f" "$STAGE/site/$f"; done < "$list"
# Keep lazy compiled diagnostics available alongside their matching runtime.
mkdir -p "$STAGE/site/assets"
for f in "$DIST_DIR"/assets/*.js "$DIST_DIR"/assets/*.css; do [[ -f "$f" ]] || continue; cp "$f" "$STAGE/site/assets/"; done
SITE_DIR="$STAGE/site" "$STAGE/arkodia" --warm-webp
# The co-op and hero-picker screenshots, test reports and UI frame sources embedded in Knowledge.
mkdir -p "$STAGE/site/coop/docs"; cp docs/coop/*.webp docs/coop/*.json "$STAGE/site/coop/docs/"
mkdir -p "$STAGE/site/hero-select"; cp docs/hero-select/*.webp docs/hero-select/*.json "$STAGE/site/hero-select/"
mkdir -p "$STAGE/site/solo-offline"; cp docs/solo-offline/*.webp docs/solo-offline/*.json "$STAGE/site/solo-offline/"
mkdir -p "$STAGE/site/hero-picker-size"; cp docs/hero-picker-size/*.webp docs/hero-picker-size/*.json "$STAGE/site/hero-picker-size/"
mkdir -p "$STAGE/site/foot-shadow"; cp docs/foot-shadow/*.webp docs/foot-shadow/*.png "$STAGE/site/foot-shadow/"
mkdir -p "$STAGE/site/hero-night-visibility"; cp docs/hero-night-visibility/*.webp docs/hero-night-visibility/*.json "$STAGE/site/hero-night-visibility/"
mkdir -p "$STAGE/site/realistic-torch"; cp public/realistic-torch/* "$STAGE/site/realistic-torch/"
mkdir -p "$STAGE/site/torch-placement"; cp docs/torch-placement/*.png docs/torch-placement/*.json "$STAGE/site/torch-placement/"
mkdir -p "$STAGE/site/sharp-torches"; cp docs/sharp-torches/*.png docs/sharp-torches/*.json "$STAGE/site/sharp-torches/"
mkdir -p "$STAGE/site/gateway-lighting"; cp docs/gateway-lighting/*.png docs/gateway-lighting/*.json "$STAGE/site/gateway-lighting/"
mkdir -p "$STAGE/site/gate-seams"; cp docs/gate-seams/*.png "$STAGE/site/gate-seams/"
mkdir -p "$STAGE/site/gate-seamless"; cp public/gate-seamless/* "$STAGE/site/gate-seamless/"
mkdir -p "$STAGE/site/full-gateway"; cp docs/full-gateway/*.json "$STAGE/site/full-gateway/"
mkdir -p "$STAGE/site/walk-behind"; cp docs/walk-behind/*.webp "$STAGE/site/walk-behind/"
mkdir -p "$STAGE/site/combat-vfx"; cp docs/combat-vfx/*.webp docs/combat-vfx/*.json "$STAGE/site/combat-vfx/"
mkdir -p "$STAGE/site/nixie-fx" "$STAGE/site/docs/nixie-fx" "$STAGE/site/assets/docs"; cp docs/nixie-fx/*.webp docs/nixie-fx/*.jpg docs/nixie-fx/*.json "$STAGE/site/nixie-fx/"; cp docs/nixie-fx/*.webp docs/nixie-fx/*.jpg docs/nixie-fx/*.json "$STAGE/site/docs/nixie-fx/"; cp public/assets/docs/*.jpg "$STAGE/site/assets/docs/"
mkdir -p "$STAGE/site/three-slot-autocast"; cp docs/three-slot-autocast/*.webp docs/three-slot-autocast/*.json "$STAGE/site/three-slot-autocast/"
mkdir -p "$STAGE/site/remove-default-aoe"; cp docs/remove-default-aoe/*.webp "$STAGE/site/remove-default-aoe/"
mkdir -p "$STAGE/site/monster-scaling"; cp docs/monster-scaling/*.webp docs/monster-scaling/*.json "$STAGE/site/monster-scaling/"
mkdir -p "$STAGE/site/locked-zoom-aoe"; cp docs/locked-zoom-aoe/*.webp docs/locked-zoom-aoe/*.json docs/assets/locked-zoom-aoe-ref.png "$STAGE/site/locked-zoom-aoe/"
mkdir -p "$STAGE/site/soul-pickups"; cp docs/soul-pickups/*.webp docs/soul-pickups/*.json "$STAGE/site/soul-pickups/"
mkdir -p "$STAGE/site/go-webp-cache"; cp docs/go-webp-cache/*.webp docs/go-webp-cache/*.json "$STAGE/site/go-webp-cache/"
mkdir -p "$STAGE/site/cast-raise"; cp docs/cast-raise/*.webp docs/cast-raise/*.json "$STAGE/site/cast-raise/"
mkdir -p "$STAGE/site/fps-tracelog"; cp docs/fps-tracelog/*.webp docs/fps-tracelog/*.json "$STAGE/site/fps-tracelog/"
mkdir -p "$STAGE/site/fps-tracelog-3d-hero"; cp docs/fps-tracelog-3d-hero/*.webp docs/fps-tracelog-3d-hero/*.json "$STAGE/site/fps-tracelog-3d-hero/"
mkdir -p "$STAGE/site/frame-cap"; cp docs/frame-cap/*.webp docs/frame-cap/*.json "$STAGE/site/frame-cap/"
mkdir -p "$STAGE/site/loading-screen"; cp docs/loading-screen/*.webp docs/loading-screen/*.json "$STAGE/site/loading-screen/"
mkdir -p "$STAGE/site/pixi-ui"; cp docs/pixi-ui/*.webp docs/pixi-ui/*.json "$STAGE/site/pixi-ui/"
mkdir -p "$STAGE/site/environment-corners"; cp docs/environment-corners/*.webp docs/environment-corners/*.json "$STAGE/site/environment-corners/"
mkdir -p "$STAGE/site/typography/v2"; cp docs/typography/v2/*.webp docs/typography/v2/*.json "$STAGE/site/typography/v2/"
mkdir -p "$STAGE/site/hud-topright-mobile"; cp docs/hud-topright-mobile/*.png "$STAGE/site/hud-topright-mobile/"
mkdir -p "$STAGE/site/ui"; cp assets-src/ui/hero-card-frame*.png "$STAGE/site/ui/"
mkdir -p "$STAGE/site/map-prefab"; cp docs/map-prefab/*.webp docs/map-prefab/*.json "$STAGE/site/map-prefab/"
mkdir -p "$STAGE/site/terrain-height"; cp docs/terrain-height/*.webp docs/terrain-height/*.json "$STAGE/site/terrain-height/"
mkdir -p "$STAGE/site/frozen-frontier-map"; cp docs/frozen-frontier-map/*.webp docs/frozen-frontier-map/*.json "$STAGE/site/frozen-frontier-map/"
mkdir -p "$STAGE/site/frontier-rendering"; cp docs/frontier-rendering/*.webp docs/frontier-rendering/reference.png docs/frontier-rendering/verification.json "$STAGE/site/frontier-rendering/"
mkdir -p "$STAGE/site/southern-cemetery"; cp docs/southern-cemetery/*.webp docs/southern-cemetery/*.json "$STAGE/site/southern-cemetery/"
mkdir -p "$STAGE/site/frontier-shadows"; cp docs/frontier-shadows/*.webp docs/frontier-shadows/*.json "$STAGE/site/frontier-shadows/"
mkdir -p "$STAGE/site/minimap"; cp docs/minimap/*.png docs/minimap/*.json "$STAGE/site/minimap/"
mkdir -p "$STAGE/site/thumb-pad"; cp docs/thumb-pad/*.webp docs/thumb-pad/*.json "$STAGE/site/thumb-pad/"
mkdir -p "$STAGE/site/stick-pan"; cp docs/stick-pan/*.webp docs/stick-pan/*.json "$STAGE/site/stick-pan/"
mkdir -p "$STAGE/site/world-map"; cp docs/world-map/*.webp docs/world-map/*.json "$STAGE/site/world-map/"
mkdir -p "$STAGE/site/hud-telemetry-desktop"; cp docs/hud-telemetry-desktop/*.png "$STAGE/site/hud-telemetry-desktop/"
mkdir -p "$STAGE/site/skill-tree"; cp docs/skill-tree/*.webp docs/skill-tree/*.png docs/skill-tree/*.json "$STAGE/site/skill-tree/"
# Shadow audit data and inspector ship with their matching companion/atlas release.
cp -R public/shadow-audit "$STAGE/site/shadow-audit"
node scripts/shadow-audit/stage-sources.mjs "$STAGE/site"
# Settings audio icons load only when the menu opens.
mkdir -p "$STAGE/site/ui/settings"; cp public/ui/settings/*.webp "$STAGE/site/ui/settings/"
# Inspection loads lazily; the desktop scan cannot discover phone/tablet DPR variants.
cp -R public/skill-tree/. "$STAGE/site/skill-tree/"
mkdir -p "$STAGE/site/ember-warden-review/tree-implementation"; cp docs/ember-tree/*.webp docs/ember-tree/*.png docs/ember-tree/*.json "$STAGE/site/ember-warden-review/tree-implementation/"
echo "Staged $(wc -l < "$list") files, $(du -sh "$STAGE" | cut -f1) in $STAGE"

# Run review, 3D Hero Lab, and both Sprite Player URLs ship with the same character atlas release.
cp -R public/3d-hero-lab "$STAGE/site/3d-hero-lab"
mkdir -p "$STAGE/site/docs/3d-heroes" "$STAGE/site/3d-heroes"
cp docs/3d-heroes/* "$STAGE/site/docs/3d-heroes/" 2>/dev/null || true
cp docs/3d-heroes/* "$STAGE/site/3d-heroes/" 2>/dev/null || true
mkdir -p "$STAGE/site/assets/characters"
cp -R public/assets/characters/3d "$STAGE/site/assets/characters/3d"
cp -R public/run-cadence "$STAGE/site/run-cadence"
mkdir -p "$STAGE/site/rift-runner"
cp -R public/sprite-player "$STAGE/site/sprite-player"
cp -R public/rift-runner/sprite-player "$STAGE/site/rift-runner/sprite-player"
mkdir -p "$STAGE/site/run-cadence/verification"
cp docs/run-cadence/*.json docs/run-cadence/*.webp "$STAGE/site/run-cadence/verification/"

# Flame Fan player and its evidence travel with the matching gameplay/VFX release.
node scripts/flame-fan/build.mjs
mkdir -p "$STAGE/site/ember-warden-review/flame-fan-levels/evidence"
cp -R dist-flame-fan/. "$STAGE/site/ember-warden-review/flame-fan-levels/"
cp docs/flame-fan/*.png docs/flame-fan/*.json docs/flame-fan/*.md "$STAGE/site/ember-warden-review/flame-fan-levels/evidence/"

# The compact connected sheet player and actual-game scale evidence ship with combat.
node scripts/flame-fan-preview/build.mjs
mkdir -p "$STAGE/site/ember-warden-review/flame-fan-preview/evidence" "$STAGE/site/ember-warden-review/flame-fan-gameplay"
cp -R dist-flame-fan-preview/. "$STAGE/site/ember-warden-review/flame-fan-preview/"
cp docs/flame-fan-preview/*.png docs/flame-fan-preview/*.json docs/flame-fan-preview/*.md "$STAGE/site/ember-warden-review/flame-fan-preview/evidence/"
for f in docs/flame-fan-gameplay/*.png docs/flame-fan-gameplay/*.json docs/flame-fan-gameplay/*.md; do
 [[ -f "$f" ]] || continue
 cp "$f" "$STAGE/site/ember-warden-review/flame-fan-gameplay/"
done

# One versioned tarball, uploaded in parts and applied by the gateway at boot (the release also writes www/index.html).
mkdir -p "$HOME/releases"
# Concurrent sessions can release the same commit. Never let one tar writer replace a file
# another publisher is reading; retain a unique completed archive for each invocation.
tgz="$(mktemp "$HOME/releases/arkodia-game-$(git rev-parse --short HEAD)-XXXXXXXX.tgz")"
python3 - "$STAGE" "$tgz" <<'PY'
import sys, tarfile
with tarfile.open(sys.argv[2], 'w:gz', format=tarfile.USTAR_FORMAT) as archive:
    archive.add(sys.argv[1], arcname='.')
PY
tar -tzf "$tgz" >/dev/null
node scripts/arkodia/publish-layer.mjs --tgz "$tgz" --name "game-$(git rev-parse --short HEAD)"
