## Rift Runner skill mapping correction

Preserves the existing Pixi All Char tree, short-tap inspection, explicit Details/Equip actions, icons, progression and f9a755a0 Bolt swing suppression.

- Gameplay previously used procedural Rift Dash effects while the approved generated art existed only in its Pixi player. Combat now shares `RiftDashVfx` and preloads `/rift-dash/v2/departure.webp`, `arrival.webp`, `particles.webp`, and `trail.webp` before readiness. The old Dash slash/cast layers are excluded when that art is available. Terrain elevation and camera transforms apply to the shared art; effect age follows simulation time.
- Co-op Dash rendering used a hard-coded 1.5-tile endpoint. It now derives the distance from the authoritative confirmed destination.
- AoE spawning called the wall ray but discarded its corrected target. Trap position, telegraph, detonation and damage now use the corrected center.
- Generic shockwave zone colors selected the fire palette for Rift Runner. The palette and raster cache now distinguish the hero.
- Blessing copy described an automatic Dash, a fixed cooldown decrement and incorrect Slam radius scaling. Copy follows manual input and existing percentage scaling. Inspection includes actual base damage scales and Bolt projectile counts; it does not apply the separate visual-only Bolt rank proposal to combat.

- The Pixi player phase and replay actions updated only a temporary display time, which the next ticker frame overwrote from its internal clock. The existing player now synchronizes both values for phase holds, replay, aiming and Space.

## Verification

The original human image `reference-68699.png` was downloaded as DA2ca35bc4cb955e2447970c19 and inspected unmodified. `before-tree.png` is the compiled baseline. Browser reports exercise real Pixi taps, Details/Back, keyboard or touch drag Dash, actual enemy HP changes from Bolt/Trap/Cleave/Slam, a wall-ray position assertion, and automatic combat. Mobile coverage is Chromium touch emulation, not a physical device.

Run `RAYON_NUM_THREADS=2 npm run build`, then `SITE_DIR=<production build> WIDTH=390 node scripts/rift-skill-fix/verify.mjs`; `GAME=<public origin>` verifies the deployed release. The small test HTTP server serves compiled files without Vite development dependency scanning. Release through `scripts/rift-skill-fix/deploy.sh`, which uses the existing shared lock, cumulative client/server, Go tests, smoke test and supported Arkodia release publisher.

An initial hypothesis about continuous inspection control reconstruction was disproved by following the layout/refresh guards. No such UI change was made. Early development-server timeouts are diagnostic harness failures, not evidence of a public loading failure.
