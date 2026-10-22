## Realistic torch release

Generated with the built-in imagegen tool, replacing the simple canvas silhouette in the supplied wall-torch reference. Three lit poses run at 120 ms per frame, offset across 16 torches. The unlit lower body remains baked; small 96 × 96 canvases update only the flame and glowing fuel region, without rebuilding world lighting. Daytime hides the flame layer. Free-standing torches retain their support posts. Gateway torches embedded in the gate artwork are separate assets.

Source: `assets-src/realistic-torch/generated.png`. Runtime: `public/realistic-torch/frame-{0,1,2,3}.webp` (three burning frames and one unlit frame). The packing script extracts and registers source cells, resizes them, and preserves alpha. The generated upper basket/fuel has small pose differences; this is a simple three-frame loop, not a fluid simulation.

Generation prompt: Generate a transparent horizontal four-cell realistic isometric medieval wall torch sheet: three identical torch bodies with left-curl, upright split, and right-curl flame poses, then one unlit torch. Charred wood, forged iron basket, oil-soaked cloth, small wall bracket, grain, soot and rough metal. Three-quarter camera slightly above. Orange translucent flames with pale yellow cores and wispy tips. Lock body geometry, camera, scale and pivot. No wall, floor, shadows, text, labels, grid or background.

Validation: `npm run build` and `node scripts/verify-realistic-torch.mjs`. Browser verification checks all 16 canvases, three distinct frame IDs and pixel images, unchanged lighting bake counter during animation, daytime shutdown and absence of page errors. Screenshots and results are in this folder.

## FPS and soft flame fix

The flame canvases are now 32 × 24 instead of 96 × 96, each isolated with paint/layout containment and its own compositing surface. Three soft flame frames are prepared once with 0.65 px blur; runtime only copies cached frames at 160 ms intervals. Offscreen torches skip redraws, camera movement freezes flame uploads until 180 ms after movement, and daytime/hidden tabs stop scheduling. Reduced-motion settings keep a static pose. Removed the full-world glow opacity animation; the lighting pools remain and small torch flames supply the movement.

A matched 390 × 844, 4× CPU headless comparison after startup found idle p95 100.1 → 66.6 ms and pan p95 66.7 → 33.4 ms. Pan flame draw calls fell from 1,376 to 3 (the final calls occur after movement settles); idle flame draw calls fell from 528 to 54. These are measured frame intervals in this headless environment, not a promise of 60 FPS on every device. No page errors; unchanged light-paint counters during measurement. Raw reports: performance-before.json, performance-after.json and performance-desktop.json. Re-run with `node scripts/measure-torch-performance.mjs`; CPU_RATE, VIEW_WIDTH, VIEW_HEIGHT, REPORT and VERIFY_URL select the measurement environment.

## Hand-painted stone-wall style redesign

Redesigned and regenerated `assets-src/realistic-torch/generated.png` and `public/realistic-torch/frame-{0,1,2,3}.webp` in the hand-painted isometric medieval art style matching `assets-src/modular-stronghold-v2/rampart-se.png`, `gateway-grand.png` and `paving-warm.png`:
- Crisp dark charcoal outlines (`#161210`), faceted wrought-iron cresset bowl, double-bracket wall mount with rivets, warm golden-amber firelight rim highlights on the three burning frames, and cool forged iron with dark charred wood/coals on the daytime unlit frame.
- Sculpted hand-painted three-pose flames (left-curling tongue, tall central cleft flame, right-curling tongue) with a creamy-yellow core, golden-amber mid-layer, and vermilion-orange outer tongues, plus glowing red-orange coals inside the cresset basket.
- Registered the sconce body across all three burning frames (`y >= 295` locked to the canonical lit sconce) and updated `src/stronghold/torches.ts` and `src/stronghold/lighting.ts` so the lower sconce (`y = 132..290`) is composited after `torchBloom` at night while `#torch-flames` animates the upper flame and glowing basket (`y = 0..132`), eliminating the horizontal bloom-washout seam across the basket.
