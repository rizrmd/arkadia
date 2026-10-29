## Approved mobile HUD release

Game release `f2f57cf` includes implementation `485756a`, the scoped verification/asset-loading update, and the peer's committed Ember animation change `8e7be5b`. It was built from an isolated committed checkout and deployed with `scripts/fural-deploy.sh`. The boot log confirmed layer `1792801200065-game-f2f57cf-7b5b813c3bf2`; public `/healthz` passed.

At widths below 1024 CSS pixels, the live portrait and HP/GATE/XP meters sit left, with Gold/Time directly underneath. The live minimap sits at the top right with zone/FPS below. Skills remain inside the bottom-right safe area without connecting arcs. Desktop keeps its existing console, telemetry, action arcs and minimap placement. Existing hero portraits, full skill library, MSDF fonts, runtime meter masks, cooldowns, locked badges and upgrade badges remain in use.

The minimap continues using real stronghold, relief, building, tree, obstacle and boundary geometry and live player position/heading. Only mobile frame, arrow, transparency and placement change. Empty wilderness stays empty.

## Assets

Source approval: `assets-src/mobile-hud/v1/approved-mobile-portrait.png`. Generated source: `assets-src/mobile-hud/v1/mobile-hud-atlas.png` (1216×1294 RGBA). The reproducible export command is `node scripts/mobile-hud/slice.mjs`. Bounds, source scale, generation prompt summary and per-piece alpha counts are in `public/mobile-hud/v1/manifest.json`.

Nine consumed slices are preloaded in parallel: three crystal materials, socket ring, minimap frame, coin, clock, pin and navigation arrow. Additional exported plates and upgrade artwork are retained in the kit. Existing painted hero portraits and existing complete skill art are reused. No atlas sheet, baked fill track, portrait/level composite or baked numeric label is drawn as the HUD. Crystal crops provide fixed materials behind runtime fill masks; current values never stretch their material.

The minimap interior and skill-ring center are explicitly transparent. Near-transparent fringe pixels below alpha 24 are cleared to transparent black; gold antialiasing is retained. Exports were inspected in the game on light snow and darker paving. Exported PNGs use lossless compression.

## Verification

Local and live browser suites pass at 320×568, 390×844, 430×932, 844×390 and 1440×900, including resize back to desktop and mobile. There are 36 hero-portrait/value scenarios: empty, partial, full/over-maximum HP, GATE and XP; level 12; 9,999 Gold; live time; skill art changes and visible 3.2s cooldowns. The public run reports zero page errors.

The live suite verifies actual map movement, heading and reachable world edges. At 390×844, the minimap is 103×103 at (279,10); at 320×568, 85×85 at (227,10). Desktop remains 148×148 at (1284,139). Mobile connecting arcs are empty. Visible skill children stay within each viewport.

Real Chromium touch events move the hero, display and release the joystick, and avoid spawning it on a skill. The interaction suite loads the actual Ember hero, taps all three skill sockets at each mobile size, checks minimum 44-pixel touch diameters, and simulates 20/16/24/16-pixel safe-area insets. All checks pass. These are browser-emulated touch checks, not physical-phone measurements.

TypeScript/Vite build, Go tests, co-op release smoke and asset staging checks pass through the supported deployment script. Initial shared-clone testing encountered a concurrent unfinished terrain gradient change; final testing and deployment used the clean committed checkout, preserving peers' working files.

Run `VERIFY_DPR=1 node scripts/mobile-hud/verify.mjs` locally, or set `VERIFY_URL=https://ark-whachat.fural.space` for the public suite. Run `node scripts/mobile-hud/verify-interaction.mjs` for actual Ember, skill targets and safe-area checks.

## Evidence

`verification.json`: local suite. `live-verification.json`: public suite. `live-interaction.json`: actual Ember, touch targets and safe areas. PNGs include local/live five-size captures, both portrait identities, cooldown stress, touch and simulated safe-area evidence. These are published under `/mobile-hud-evidence/` and embedded inline in the existing Player Portrait and Status Bars Knowledge page.
