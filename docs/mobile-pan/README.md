## Mobile pan benchmark

Run `npm run build`, then `REPORT=/path/to/report.json node scripts/benchmark-mobile-pan.mjs`. Set `TOUCH=1` for CDP touch input. The script uses Chromium mobile emulation (390 × 844, DPR 3, 4× CPU slowdown). Mouse input produces 101 pointer events; the touch run produced 99 events through browser coalescing. Reports capture Canvas2D work, synchronous handler durations and sampled animation-frame intervals. Results include idle frames between inputs and are not a physical-device FPS guarantee.

`before.json` records the original renderer. `after.json` records the intermediate tile cache. `composited.json` and `touch.json` record the current compositor renderer. P95 frame interval moved from 266.6 ms to 50 ms to 16.8 ms. Canvas image draws during the measured gesture moved from 3884 to 2322 to zero.

The current renderer rasterizes the settlement once and applies camera transforms to that fixed surface. A separate repeated snow layer maintains world alignment outside the settlement. The settlement backing store stays within 32 MiB and 4096 pixels per dimension (currently 3787 × 2163, 32,765,124 bytes). Selection and building upgrades repaint; camera changes and resource ticks do not. Browser compositor memory and source artwork are additional to this canvas backing-store budget.

`node scripts/verify-composited-world.mjs` verifies ground decals below walls, Mine between the rear and front enclosure without changing its position, touch pinch, long panning without repaint, infinite snow, Forge upgrade invalidation, and four viewport sizes with all seven panels. `QUICK=1 PREVIEW_URL=https://...` runs the focused live checks. `node scripts/verify-canvas-building-hit.mjs` verifies opaque-roof selection and drag without accidental selection.
