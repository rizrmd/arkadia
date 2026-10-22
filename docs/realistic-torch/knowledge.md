## Realistic torch upgrade

The supplied screenshot showed a flat orange flame on a simple wall bracket. The game now uses a generated realistic torch with charred wood, forged iron and textured fuel. All 16 wall and courtyard torches use the new asset. The two flames embedded in the gateway artwork remain separate.

[Play Stronghold](https://ark-whachat.fural.space/?time=0)

### Animation and lighting

Three softly blurred burning poses loop at 160 ms per frame, with phase offsets between torches. One unlit pose remains visible during the day. The lower handle stays baked in place; small local canvases animate the flame and glowing fuel region without rebuilding the world or its lightmap. Camera movement follows the same world transform. Hidden tabs skip flame drawing.

### Reference and generated source

![Original wall-torch reference](https://ark-whachat.fural.space/realistic-torch/reference.png)

![Generated transparent torch sheet: three burning poses and one unlit pose](https://ark-whachat.fural.space/realistic-torch/generated.png)

Created with the built-in imagegen tool. Prompt: generate a transparent horizontal four-cell realistic isometric medieval wall torch sheet, with three identical torch bodies showing left-curl, upright split and right-curl flames, then one unlit torch. Charred wood, forged iron basket, oil-soaked cloth, small wall bracket, grain, soot and rough metal. Three-quarter camera slightly above. Orange translucent flames with pale yellow cores and wispy tips. Lock body geometry, camera, scale and pivot. No wall, floor, cast shadows, text, labels, grid or background.

The packing script extracts registered cells, resizes them and preserves alpha. Source: assets-src/realistic-torch/generated.png. Runtime: public/realistic-torch/frame-0.webp through frame-3.webp. The generated upper basket and fuel have small pose differences; this is a simple three-frame loop.

### In-game appearance

![Nighttime torches](https://ark-whachat.fural.space/realistic-torch/night.png)

![Flame close-up at game scale](https://ark-whachat.fural.space/realistic-torch/flame-closeup.png)

![Daytime: unlit torches](https://ark-whachat.fural.space/realistic-torch/day.png)

### Verification and release

Commit 6085eeb was pushed to feat/stronghold. A clean release build excluded peers' uncommitted changes and was deployed to the canonical Stronghold sandbox. TypeScript and Vite production build passed. Both local and deployed browser checks found 16 torch canvases, all three distinct frame IDs and pixel images, no lightmap rebuild during flame animation, daytime shutdown, and no JavaScript errors.

Run node scripts/verify-realistic-torch.mjs; set VERIFY_URL to the live URL to verify deployment. Evidence is in docs/realistic-torch/results.json. Repack with node scripts/pack-realistic-torch.mjs.

### FPS regression fix

The previous implementation updated sixteen 96 × 96 canvases even outside the viewport and while panning. Canvas writes could invalidate the broad parent layer, and the full-world glow opacity animation added continuous blending work.

Each flame now uses an isolated 32 × 24 canvas and copies from one of three cached frames. A mild 0.65 px blur is applied once during preparation, with no live blur filter. Offscreen flames skip drawing, flame uploads pause while the camera moves, and scheduling stops during daytime or in hidden tabs. Reduced-motion mode displays a static pose. The expensive full-world glow opacity animation has been removed; baked light pools remain.

The matched mobile simulation (390 × 844, CPU slowed 4×) measured idle p95 frame intervals of 100.1 → 66.6 ms and pan p95 of 66.7 → 33.4 ms. Idle flame copies fell from 528 to 54; pan copies fell from 1,376 to 3, with the final copies after movement settled. World light-paint counters stayed stable and no JavaScript errors occurred. A desktop smoke measurement and day/night/reduced-motion checks also passed. These headless measurements show an improvement, not guaranteed 60 FPS on every device.

![Optimized softly blurred flames in game](https://ark-whachat.fural.space/realistic-torch/fps-night.png)

![Soft flame detail at game scale](https://ark-whachat.fural.space/realistic-torch/fps-closeup.png)

Raw comparison reports are in docs/realistic-torch/performance-before.json and performance-after.json. Run node scripts/measure-torch-performance.mjs to measure again.

The optimized release is commit 186bb38, pushed and verified on the live game. Live 4× CPU smoke measurements recorded idle p95 50.1 ms and pan p95 66.7 ms, with 48 idle flame copies and 7 pan copies, unchanged lighting counters and no errors. Live frame timing varies with host load; the controlled local before/after comparison above should not be read as a guaranteed live FPS.

### Smaller, sharper torches — October 22

The new reference showed an oversized wall torch with soft, blurry flames. Fixtures now render at 24 × 39 world pixels instead of 32 × 52 (25% smaller). The flame crop keeps the same proportions as the body, uses a 72 × 54 backing canvas, and no longer applies the artificial 0.65 px blur. Cached poses, offscreen culling, camera movement pauses, daytime shutdown and reduced-motion support remain. This supersedes the earlier soft-flame presentation described above.

![User reference: blurry oversized torch](https://ark-whachat.fural.space/sharp-torches/reference.png)

![Verified live nighttime scene with smaller sharp torches](https://ark-whachat.fural.space/sharp-torches/night.png)

![Verified live daytime fixtures](https://ark-whachat.fural.space/sharp-torches/day.png)

Release e97c345 was pushed to feat/stronghold and deployed through the canonical game release script. Production build, Go tests and co-op smoke checks passed. The live browser check verified 16 canvases at 72 × 54 backing resolution / 24 × 17.75 CSS pixels, three flame poses, stable lighting paint count, daytime shutdown, reduced-motion freeze and no JavaScript errors. Run VERIFY_URL=https://ark-whachat.fural.space node scripts/verify-sharp-torches.mjs.

### Hand-painted stone-wall art style redesign — October 22

The user-supplied screenshot highlighted two visual problems with the previous wall torch: its gritty photorealistic wood/rust texture and wispy photographic fire clashed with the hand-painted isometric stone walls and paving, and the lower half of the torch on `#world-surface` was washed out by `torchBloom` screen-blending while `#torch-flames` drew the un-screened upper half (`y = 0..132`), creating a visible horizontal seam right across the iron basket.

![User chat reference: photorealistic torch and horizontal bloom-washout seam on the stone wall](https://ark-whachat.fural.space/realistic-torch/style-reference.png)

Both the torch sconce (`obor`) and three-frame animated flame (`kobaran api`) were redesigned and regenerated in the hand-painted isometric medieval art style of the Stronghold walls ([rampart-se.png](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=assets-src%2Fmodular-stronghold-v2%2Frampart-se.png), [gateway-grand.png](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=assets-src%2Fmodular-stronghold-v2%2Fgateway-grand.png)) and courtyard floor ([paving-warm.png](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=assets-src%2Fmodular-stronghold-v2%2Fpaving-warm.png)):

- **Hand-painted wrought-iron sconce**: Crisp dark charcoal outlines (`#161210`), faceted octagonal iron shaft, double-arm wall bracket with rivets, and flared crenellated cresset bowl. The three burning frames feature warm golden-amber firelight rim highlights and glowing red-orange coals, while the daytime unlit frame ([frame-3.webp](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Frealistic-torch%2Fframe-3.webp)) shows cool forged iron and dark charred wood/coals.
- **Sculpted hand-painted flames**: Three distinct animated poses (left-curling tongue, tall central cleft flame, right-curling tongue) painted with a luminous creamy-yellow core, rich golden-amber mid-layer, and warm vermilion-orange outer tongues ([generated.png](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=assets-src%2Frealistic-torch%2Fgenerated.png)).
- **Seamless night compositing**: All three burning frames share the exact pixel-locked lower sconce body (`y >= 295`). In [torches.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Ftorches.ts) and [lighting.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Flighting.ts), the lower sconce (`y = 132..290`) is composited onto `#world-surface` after `torchBloom` at night while `#torch-flames` animates the upper flame and basket (`y = 0..132`), completely eliminating the horizontal seam and bloom washout.

![Redesigned hand-painted 4-frame torch and flame sheet](https://ark-whachat.fural.space/realistic-torch/generated.png)

![Redesigned wall torch and flame close-up at night on the stone wall](https://ark-whachat.fural.space/realistic-torch/wall-closeup-night.png)

![Redesigned unlit wall torch close-up in daylight on the stone wall](https://ark-whachat.fural.space/realistic-torch/wall-closeup-day.png)

![Animated flame close-up at game scale](https://ark-whachat.fural.space/realistic-torch/flame-closeup.png)

![Verified live nighttime Stronghold with redesigned hand-painted torches](https://ark-whachat.fural.space/realistic-torch/night.png)

![Verified live daytime Stronghold with unlit forged-iron sconces](https://ark-whachat.fural.space/realistic-torch/day.png)

Verified locally and on `https://ark-whachat.fural.space` with `node scripts/verify-realistic-torch.mjs`, `node scripts/verify-sharp-torches.mjs`, and `node scripts/verify-night-torches.mjs` (16 torch canvases at `72 × 54` backing / `24 × 17.75` CSS px, 3 distinct animated flame poses, 1 light bake during animation, daytime flame shutdown, reduced-motion freeze, and 0 errors).
