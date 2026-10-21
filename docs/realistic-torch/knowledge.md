## Realistic torch upgrade

The supplied screenshot showed a flat orange flame on a simple wall bracket. The game now uses a generated realistic torch with charred wood, forged iron and textured fuel. All 16 wall and courtyard torches use the new asset. The two flames embedded in the gateway artwork remain separate.

[Play Stronghold](https://arkadia-stronghold-whachat.fural.space/?time=0)

### Animation and lighting

Three softly blurred burning poses loop at 160 ms per frame, with phase offsets between torches. One unlit pose remains visible during the day. The lower handle stays baked in place; small local canvases animate the flame and glowing fuel region without rebuilding the world or its lightmap. Camera movement follows the same world transform. Hidden tabs skip flame drawing.

### Reference and generated source

![Original wall-torch reference](https://arkadia-stronghold-whachat.fural.space/realistic-torch/reference.png)

![Generated transparent torch sheet: three burning poses and one unlit pose](https://arkadia-stronghold-whachat.fural.space/realistic-torch/generated.png)

Created with the built-in imagegen tool. Prompt: generate a transparent horizontal four-cell realistic isometric medieval wall torch sheet, with three identical torch bodies showing left-curl, upright split and right-curl flames, then one unlit torch. Charred wood, forged iron basket, oil-soaked cloth, small wall bracket, grain, soot and rough metal. Three-quarter camera slightly above. Orange translucent flames with pale yellow cores and wispy tips. Lock body geometry, camera, scale and pivot. No wall, floor, cast shadows, text, labels, grid or background.

The packing script extracts registered cells, resizes them and preserves alpha. Source: assets-src/realistic-torch/generated.png. Runtime: public/realistic-torch/frame-0.webp through frame-3.webp. The generated upper basket and fuel have small pose differences; this is a simple three-frame loop.

### In-game appearance

![Nighttime torches](https://arkadia-stronghold-whachat.fural.space/realistic-torch/night.png)

![Flame close-up at game scale](https://arkadia-stronghold-whachat.fural.space/realistic-torch/flame-closeup.png)

![Daytime: unlit torches](https://arkadia-stronghold-whachat.fural.space/realistic-torch/day.png)

### Verification and release

Commit 6085eeb was pushed to feat/stronghold. A clean release build excluded peers' uncommitted changes and was deployed to the canonical Stronghold sandbox. TypeScript and Vite production build passed. Both local and deployed browser checks found 16 torch canvases, all three distinct frame IDs and pixel images, no lightmap rebuild during flame animation, daytime shutdown, and no JavaScript errors.

Run node scripts/verify-realistic-torch.mjs; set VERIFY_URL to the live URL to verify deployment. Evidence is in docs/realistic-torch/results.json. Repack with node scripts/pack-realistic-torch.mjs.

### FPS regression fix

The previous implementation updated sixteen 96 × 96 canvases even outside the viewport and while panning. Canvas writes could invalidate the broad parent layer, and the full-world glow opacity animation added continuous blending work.

Each flame now uses an isolated 32 × 24 canvas and copies from one of three cached frames. A mild 0.65 px blur is applied once during preparation, with no live blur filter. Offscreen flames skip drawing, flame uploads pause while the camera moves, and scheduling stops during daytime or in hidden tabs. Reduced-motion mode displays a static pose. The expensive full-world glow opacity animation has been removed; baked light pools remain.

The matched mobile simulation (390 × 844, CPU slowed 4×) measured idle p95 frame intervals of 100.1 → 66.6 ms and pan p95 of 66.7 → 33.4 ms. Idle flame copies fell from 528 to 54; pan copies fell from 1,376 to 3, with the final copies after movement settled. World light-paint counters stayed stable and no JavaScript errors occurred. A desktop smoke measurement and day/night/reduced-motion checks also passed. These headless measurements show an improvement, not guaranteed 60 FPS on every device.

![Optimized softly blurred flames in game](https://arkadia-stronghold-whachat.fural.space/realistic-torch/fps-night.png)

![Soft flame detail at game scale](https://arkadia-stronghold-whachat.fural.space/realistic-torch/fps-closeup.png)

Raw comparison reports are in docs/realistic-torch/performance-before.json and performance-after.json. Run node scripts/measure-torch-performance.mjs to measure again.
