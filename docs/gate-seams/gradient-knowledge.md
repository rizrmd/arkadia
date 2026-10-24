## Gateway snow, moss and soil transition

The lower-left and lower-right tower bases now blend into the surrounding ground with feathered snow, textured soil and moss, matching the adjoining walls. The foundation face is cached and composited into every animated frame before ambient lighting. The central doorway stays clear.

[Play Arkodia](https://ark-whachat.fural.space/)

Implementation `d2cab2d` is pushed and deployed. Production build, Go tests and co-op smoke checks passed. Public HTTPS browser checks passed for two-way passage, tower collision, animation reversal and a 390 × 844 viewport at 4× CPU slowdown. Animation p95 was 83.3 ms, with unchanged world/light/shadow rebuild counts and no browser errors. Traversal tests use offline mode so a co-op server spawn cannot override their saved starting position.

### Reported lower-corner seams

![Reported gateway lower corners](https://ark-whachat.fural.space/gate-seams/gradient-reference.png)

### Local result

![Local feathered gateway foundation](https://ark-whachat.fural.space/gate-seams/gradient-local.png)

### Deployed result

![Live gateway with snow, moss and soil at both tower bases](https://ark-whachat.fural.space/gate-seams/gradient-live.png)

## Seamless gate and wall joins

The supplied reference showed the gateway towers meeting visibly smaller wall ends. The final foreground wings were scaled to 270 px while the other ramparts used 356 px. This reduced their height and stone size and exposed their end caps beside the towers.

The terminal wings now use the same 356 px width as the other wall segments. Their existing placement lets the end caps overlap behind the gateway towers, giving continuous masonry at both joins while preserving the central passage.

![Human reference showing the gate and adjacent walls](https://ark-whachat.fural.space/gate-seams/reference.png)

![Before: smaller terminal wall segments](https://ark-whachat.fural.space/gate-seams/before.png)

![After: matching masonry scale and hidden end caps](https://ark-whachat.fural.space/gate-seams/after.png)

![Verified live: seamless gate and wall joins](https://ark-whachat.fural.space/gate-seams/live.png)

### Verification and release

Implementation commit `bf850b7` and live evidence commit `e0f009a` are pushed to `feat/stronghold`. The clean-checkout game release was deployed to [Play Stronghold](https://ark-whachat.fural.space/), followed by the evidence layer.

The TypeScript/Vite production build, Go server tests, local bidirectional gate traversal and tower collision checks passed. Local and live sprite checks found all 16 distinct door poses with zero changed stone pixels outside the aperture. The live browser capture was inspected to verify both wall joins. The gateway animation and passage remained intact.

Reproduce the screenshot with `DEMO_URL=https://ark-whachat.fural.space CAPTURE=live node scripts/verify-gate-seams.mjs`. Rendering implementation: [terrain.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fterrain.ts).

The gateway plays a complete 16-frame sprite sheet at crisp **768 × 512** resolution per frame (a **3072 × 2048** 4 × 4 atlas, 4× the pixel count of the earlier 384 × 256 frames). Both stone towers, the arch, banners, realistic hand-painted wrought-iron cresset torches, and both wooden door leaves are registered to one world rectangle (`270 × 180` world px) and pivot (`0.5, 0.97`). The doors open and close smoothly as the hero approaches or leaves, while the hero remains visible at low opacity (`~32%` ghost silhouette) whenever standing behind the gate towers, arch, or doors.

## Crisp 768 × 512 gateway redesign (v4), realistic cresset torches, and low-opacity hero occlusion

Current release: implementation `2ced180`, cache-busted `v4` asset & cell-dimension fix `c51ef40` (`game-c51ef40`), pushed to `feat/stronghold` and deployed to `https://ark-whachat.fural.space`.

### 1. Crisp 768 × 512 stonework, animated oak doors, and v4 cache-busting
- **Root cause of blurriness**: The previous `full-gateway-v3-sheet.webp` packed 16 frames at `384 × 256` extracted from a `1536 × 1024` 4 × 4 sheet where each gate occupied only `~368 × 232` px (`1.36` texels/world-px vs `2.93` texels/world-px on the adjacent `rampart-se.png` walls).
- **Fix**: [scripts/pack-full-gateway.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fpack-full-gateway.mjs) now composites the crisp `1200 × 749` hand-painted masonry from `gateway-grand.png` + clean stone piers [assets-src/full-gateway/piers-clean.jpg](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=assets-src%2Ffull-gateway%2Fpiers-clean.jpg) with the 16 high-resolution door poses from `assets-src/gate-animation/generated-sheet.png` at **`768 × 512` per frame** (`2.84` texels/world-px, matching the surrounding walls).
- **Cache-busting & 2×2 guard (`v4`)**: Because Cloudflare edge caches `.webp` files with `max-age=14400`, browsers that had cached the old `1536 × 1024` `full-gateway-v3-sheet.webp` while fetching the new `768 × 512` metadata would crop a 2 × 2 block of 4 gates. The high-resolution assets are now versioned as `full-gateway-v4-sheet.webp`, `full-gateway-v4-closed.webp`, `full-gateway-v4-open.webp`, and `full-gateway-v4-sheet.json`, and [src/stronghold/gate-doors.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fgate-doors.ts) derives source cell dimensions directly from `sheet.naturalWidth / meta.columns` and `sheet.naturalHeight / rows` so it always extracts exactly 1 gate cell regardless of image resolution.
- Every pixel outside the doorway aperture (`left: 280, right: 488, top: 190, bottom: 426`) is locked to frame 0, guaranteeing **0 changed stone pixels** across all 16 frames.

### 2. Realistic hand-painted cresset torches (unlit by day, animated flames by night)
- **Root cause**: The old gateway had blurry static yellow-orange blobs and permanent orange airbrush stains baked onto the stone piers even at 12:00 Noon, whereas the 16 wall & courtyard torches ([src/stronghold/torches.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Ftorches.ts)) used the realistic wrought-iron cresset torches (`/realistic-torch/frame-0..3.webp`). Furthermore, `shadeSprite` in [src/stronghold/lighting.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Flighting.ts) multiplied `#world-gate-doors` by the `0.35×` lightmap without redrawing sharp torch sconces and flames on top.
- **Fix**:
  - In daylight (`!torchesOn`), [src/stronghold/gate-doors.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fgate-doors.ts) composites clean unlit stone piers and the unlit forged-iron cresset sconces (`frame-3.webp`) from `full-gateway-v4-closed.webp` before shading.
  - At night (`torchesOn`), after `light.shade(source, canvas)` applies the world lightmap and warm firelight pools (authored at `(231, 277)` and `(537, 277)` in [src/stronghold/light-anchors.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Flight-anchors.ts)), `gate-doors.ts` draws the full-resolution firelit cresset sconces and cycles through the 3-frame animated flickering flames (`TORCH_FRAMES[0..2]`) at `(196, 253, 70, 112)` and `(502, 253, 70, 112)`.

### 3. Low-opacity hero silhouette when standing behind the gate
- **Root cause**: All other buildings sit on `#world-surface` underneath `#world-hero`, and `cutOut()` in [src/stronghold/hero.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fhero.ts) erases overlapping front buildings with `destination-out` at `globalAlpha = 0.68`, leaving a `~32%` low-opacity ghost silhouette. Because `#world-gate-doors` was placed *above* `#world-hero` in the DOM when `inside === true` and `front()` returned `false` for `p.id === 'gate'`, the opaque gateway canvas covered the hero at 100% opacity (0% hero visibility).
- **Fix**:
  - `order()` in [src/stronghold/gate-doors.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fgate-doors.ts) places `#world-gate-doors` *before* `#world-hero` when the hero is inside the threshold (`inside === true`) and *after* `#world-hero` when outside.
  - `gate` in [src/stronghold/world-view.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fworld-view.ts) attaches `occluder: doors.canvas`, and `front()` in [src/stronghold/hero.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fhero.ts) returns `py < (d < 36 ? 775 : gateTowerFront(Math.min(135, d)))` for `p.id === 'gate'`.
  - `cutOut()` uses `p.occluder ?? p.image` so the live animated gate frame cuts the hero (and revenants in [src/stronghold/encounters.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fencounters.ts)) to a clear low-opacity silhouette behind the towers, arch, and closed doors while remaining 100% visible through the open doorway.

![Gateway at noon — crisp 768x512 masonry and unlit cresset sconces](https://ark-whachat.fural.space/gateway-lighting/day.png)

![Gateway at night — realistic animated cresset flames and warm light pools](https://ark-whachat.fural.space/gateway-lighting/night.png)

![Open gateway during the day](https://ark-whachat.fural.space/gateway-lighting/open-day.png)

![Open gateway at night](https://ark-whachat.fural.space/gateway-lighting/open-night.png)

![Hero visible at low opacity behind the gateway tower and arch](https://ark-whachat.fural.space/walk-behind/gate-south.webp)

### Verification evidence
- **Asset stability** (`verify-gateway-stability.mjs` local & live on `full-gateway-v4-*`): `frames: 16`, `frame: {w: 768, h: 512}`, `stonePixelChanges: 0`, `distinctDoorPoses: 16`, `closedAlpha: 253`, `openAlpha: 0`.
- **Render stability** (`verify-gateway-render.mjs` day & night): `changedStonePixels: 0`, `movedBounds: 0` across all 16 frames `[0..15]`.
- **Lighting & torch transitions** (`verify-gateway-lighting.mjs`): `nightAmbient: 0.494`, `nightTorch: 1.650`, `fireLuma: 251.88`, `clockTransitionsPassed: true`.
- **Depth & low-opacity hero occlusion** (`verify-gateway-depth.mjs` local & live, `verify-walk-behind.mjs`): `inside: {front: true, behindCount: 1, lowAlphaPixels: 1582, opaquePixels: 0}`, `outside: {front: false, behindCount: 0, opaquePixels: 1261}`, `staticDraws: 0`.
- **Door animation & 16 wall torches** (`verify-gate-animation.mjs`, `verify-open-gate.mjs`, `verify-sharp-torches.mjs`): all passed with `0` errors.

## Rendered arch stability and restored lighting

Current release: implementation `664da53`, live evidence `b8e6c8c`, pushed to `feat/stronghold` and deployed. The browser identifies the current renderer as `gateway-lightmap-v3` and loads versioned `full-gateway-v3-*` assets.

The previous stone-pixel test excluded part of the inner arch. A new test of the actual deployed canvas, with the camera held fixed, reproduced **13,328 changed pixels** in that area. The tighter doorway aperture now freezes the complete inner stone rim and jambs while preserving the generated door movement. The new local and live render tests show **0 changed stone pixels and 0 moved bounds** at noon and at night. The complete sequence still contains 16 door poses.

The full gateway canvas had also bypassed local lighting and received only a flat ambient tint. It now receives the same world-space lightmap and emissive bloom as the rest of the Stronghold. Torch pools illuminate the gateway masonry and doors; flames stay bright at night. Switching night → noon → night resets the lightmap correctly and passed in the deployed UI.

![Current stable full gateway sheet](https://ark-whachat.fural.space/modular-stronghold/v2/full-gateway-v3-sheet.webp)

![Current gateway at noon](https://ark-whachat.fural.space/gateway-lighting/day.png)

![Restored torch lighting at night](https://ark-whachat.fural.space/gateway-lighting/night.png)

![Gateway at dusk](https://ark-whachat.fural.space/gateway-lighting/dusk.png)

![Open gateway at night](https://ark-whachat.fural.space/gateway-lighting/open-night.png)

![Open gateway during the day](https://ark-whachat.fural.space/gateway-lighting/open-day.png)

[Rendered daytime stability report](https://ark-whachat.fural.space/gateway-lighting/render.json) · [Rendered night stability report](https://ark-whachat.fural.space/gateway-lighting/render-night.json) · [Lighting measurements](https://ark-whachat.fural.space/gateway-lighting/lighting.json)

At night the unlit masonry retains about 27% of its daytime luminance, while masonry near the torch retains about 79%; flame luminance remains approximately 249/255. The final live 390 × 844 / 4× CPU animation check passed with p95 and maximum frame interval 33.4 ms, successful mid-swing reversal, unchanged world/light/shadow rebuild counters and no JavaScript errors. These are headless measurements rather than a frame-rate guarantee for every phone.

The production build and local collision/depth tests passed. The new render and lighting tests also passed live. Checks: `verify-gateway-render.mjs`, `verify-gateway-lighting.mjs`, `verify-gateway-stability.mjs`, `verify-gateway-depth.mjs`, `verify-open-gate.mjs`, and `verify-gate-animation.mjs`. Publish with `node scripts/publish-gateway-lighting.mjs` from the committed build. Reload an already open game once to load the new JavaScript and versioned atlas.

The sections below retain earlier release history and generation references; this section describes the current renderer.

## Stonework stability fix

Release `c77e48b` (integrated push `03d5eec`) fixes the report that the fortress wobbled while its doors animated. Registration alone had not removed generated changes to the masonry. The atlas packer now copies every pixel outside the fixed arched doorway from frame 0. All 16 frames therefore share exactly the same visible towers, arch, banners, torches and ground contact; the existing generated door poses remain inside the doorway. The result is still a full-gateway sprite sheet with the same timing, pivot and depth behavior.

The asset regression failed on the former atlas, detecting over one million changed stone pixels. It passes on the deployed atlas with **0 visible stone pixel changes** and **16 distinct door poses**. Fully transparent RGB bytes are ignored because they do not affect the rendered image. The center of the closed passage has alpha 253 and the open passage alpha 0.

![Stable full gateway sprite sheet](https://ark-whachat.fural.space/modular-stronghold/v2/full-gateway-sheet.webp)

![Stable open gateway frame](https://ark-whachat.fural.space/modular-stronghold/v2/full-gateway-open.webp)

[Deployed stability report](https://ark-whachat.fural.space/full-gateway/stability.json)

The production build, local depth and pivot check, local/live asset stability checks, and local/live animation/performance checks passed. Final live browser measurement at 390 × 844 with CPU slowed 4×: p95 frame interval 49.9 ms, maximum 66.6 ms, successful reversal and no JavaScript errors. World/light/shadow rebuild counters stayed at 2/2/2. These are headless measurements, not a guarantee of a specific frame rate on every phone.

Tower pixels are checked in the asset regression rather than read back from the GPU every runtime test frame. The performance check consequently measures playback without that additional readback overhead. An optional screenshot capture timed out, and an initial live regression reload timed out; the final live playback/reversal rerun passed.

Checks: `node scripts/verify-gateway-stability.mjs`, `node scripts/verify-gate-animation.mjs`, and `node scripts/verify-gateway-depth.mjs`. Repack with `node scripts/pack-full-gateway.mjs`. Deploy the asset-only patch with `node scripts/publish-gateway-stability.mjs`; it preserves the live app, knight and HUD bundles.

## Play

[Open Stronghold](https://ark-whachat.fural.space/)

## Full gateway animation

Generated with the built-in image generation tool from the closed and open gateway references. The sequence plays forward and backward at 20 fps, taking approximately 750 ms for a full swing. Reversal continues from the current frame.

![Full gateway runtime sprite sheet](https://ark-whachat.fural.space/modular-stronghold/v2/full-gateway-sheet.webp)

![Closed gateway](https://ark-whachat.fural.space/full-gateway/closed.png)

![Gateway opening with both doors](https://ark-whachat.fural.space/full-gateway/opening.png)

![Open gateway with the hero inside the arch](https://ark-whachat.fural.space/full-gateway/open.png)

![Gateway closing](https://ark-whachat.fural.space/full-gateway/closing.png)

## Position and depth

Every full frame uses one 270 × 180 world rectangle, centered at x 577 with its pivot at y 790. Packing registers whole gateway silhouettes and preserves complete tower tops, including the generated sheet's uneven margins. The gateway is drawn only on its animated canvas; there is no duplicate static gate under it in the world raster.

The full gateway stands in front of the hero while the hero is behind its ground edge. After crossing the threshold, the hero stands in front of it. The doorway uses a ground edge of y 770; the sides use the stone tower footprints. The former gate ghost mask is disabled so the displayed frame provides the matching silhouette. Picking samples the current frame. Passage collision opens at 80% of the sequence; both towers retain collision. Camera panning moves the entire frame with the same world transform.

## Verification and release

Implementation `cab26d0`, final integrated build `b7939ac`, was pushed to `feat/stronghold` and deployed to the canonical Stronghold sandbox. The build includes the concurrent HUD styling changes. Other sessions' uncommitted files were preserved by working in an isolated checkout.

Production build and browser checks passed locally and live: complete left/right tower content, frame playback, closed/open passage alpha, mid-swing reversal, unchanged world/light/shadow rebuild counters, two-way passage, tower collision, hero depth on either side, no duplicate static gate, and pivot alignment after camera panning. Position errors in the live test were below 0.001 pixels.

The final deployed 390 × 844 / 4× CPU test measured p95 frame interval 83.4 ms and maximum 116.6 ms. World/light/shadow counters remained 2/2/2 throughout the animation, and no JavaScript errors occurred. These headless measurements do not guarantee a particular frame rate on every device.

Checks: `node scripts/verify-gateway-depth.mjs`, `node scripts/verify-gate-animation.mjs`, and `node scripts/verify-open-gate.mjs`.

## Generation sources

Prompt: Create a transparent 4 by 4 sprite sheet of the complete reference gateway, with synchronized doors swinging inward behind the stone jambs. Keep both towers, arch, blue banners, torches, bases and wooden leaves in every frame. Progress from closed to 90 degrees open across 16 poses. Preserve camera, scale, baseline, framing, stationary stonework and 2:1 ground perspective. No floor, environment, people, labels or grid lines. Refinement: remove backdrop and floor shadows, including through the open arch, while preserving all poses.

Source: `assets-src/full-gateway/generated.png`. Runtime: `public/modular-stronghold/v2/full-gateway-sheet.webp` and its JSON manifest. Repack with `node scripts/pack-full-gateway.mjs`. Packing registers and extracts generated frames; it creates no new door poses.

![Initial full gateway generation](https://ark-whachat.fural.space/full-gateway/draft.png)

![Refined transparent full gateway generation](https://ark-whachat.fural.space/full-gateway/generated.png)

![Closed appearance reference](https://ark-whachat.fural.space/modular-stronghold/v2/gateway-grand.png)

![Open appearance reference](https://ark-whachat.fural.space/modular-stronghold/v2/gateway-open.png)

## Earlier door-only release

The following section records the superseded door-only release `8d25597` and preserves its source images and original report.

The Stronghold gate uses a generated 16-frame sprite sheet for its two wooden door leaves. It opens only when the hero approaches the central threshold, closes after departure, and reverses smoothly from its current pose if the hero turns around. The stone towers remain static and retain their ground hitboxes.

### Play

[Open Stronghold](https://ark-whachat.fural.space/)

### Generated sprite sheet

Created with the built-in image generation tool, using the existing closed castle gate as the visual reference. The 16 generated poses show changes in perspective, thickness and shading from closed to inward-open. Runtime plays these poses forward and backward at 20 fps, taking approximately 750 ms for a full swing. The packing step only extracts and resizes fixed cells; it does not generate the movement or warp closed door images.

![Original generated 4 by 4 sprite sheet](https://ark-whachat.fural.space/gate-generated/generated-sheet.png)

![Packed runtime atlas](https://ark-whachat.fural.space/modular-stronghold/v2/gate-generated-sheet.webp)

The generated source is saved in `assets-src/gate-animation/generated-sheet.png`. Runtime assets are `public/modular-stronghold/v2/gate-generated-sheet.webp` and `gate-generated-sheet.json`. Repack with `node scripts/pack-generated-gate.mjs`.

Prompt: Generate only the two arched oak-and-black-iron door leaves from the reference castle gate, with no masonry, torches, floor or backdrop. Produce a transparent 4 × 4 atlas of 16 consistent poses from closed to 90 degrees open, read row by row. Preserve the warm planks, cross braces, studs, ring handles, fixed scale and hinge positions. Render changing perspective, thickness, edges and shading as the doors swing inward; do not just shrink the closed image. No labels, borders or checkerboard.

### In-game frames

![Closed](https://ark-whachat.fural.space/gate-generated/closed.png)

![Opening](https://ark-whachat.fural.space/gate-generated/opening.png)

![Open](https://ark-whachat.fural.space/gate-generated/open.png)

![Closing](https://ark-whachat.fural.space/gate-generated/closing.png)

### Collision and rendering

The shortened front walls leave the archway clear. Tower ground hitboxes remain separate from the hollow passage. The passage becomes walkable at 80% open. The hero is layered behind the leaves while inside the gateway and in front after leaving it. Door frames draw into a small 136 × 148 canvas, tinted when ambient lighting changes. Opening and closing do not rebuild the world raster, light pools or shadow masks.

### Verification and release

Commit `8d25597` was pushed to `feat/stronghold` and deployed to the canonical Stronghold sandbox. Implementation was isolated from another session's uncommitted gate edits in the shared checkout.

The production TypeScript/Vite build passed. Local and deployed browser checks passed for generated-frame playback, closed/open pixel opacity, mid-animation reversal, exit and return through the gate, proximity closing, and tower collision. No JavaScript errors were reported.

The deployed performance check used a 390 × 844 viewport with CPU slowed 4×: 42 opening samples and 43 closing samples, p95 frame interval 33.3 ms, maximum observed interval 33.4 ms. World/light/shadow rebuild counters stayed unchanged at 2/2/2 throughout both transitions. These are headless test measurements, not a guarantee for every phone.

Checks: `node scripts/verify-gate-animation.mjs` and `node scripts/verify-open-gate.mjs`.

### Original report

The supplied phone screenshot showed a permanently open gate with protruding wall ends inside the passage. The latest release fixes that geometry, proximity behavior, collision, transition performance and sprite animation.

![Original phone report](https://ark-whachat.fural.space/gate-proximity/reference.jpg)

### Archived door-only sheet (not used at runtime)

Commit `e665805` saves the earlier door-only gate experiment, which had been left uncommitted in the shared checkout, as reference material: the sheet [public/modular-stronghold/v2/gate-doors-sheet.webp](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Fmodular-stronghold%2Fv2%2Fgate-doors-sheet.webp) with [public/modular-stronghold/v2/gate-doors-sheet.json](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Fmodular-stronghold%2Fv2%2Fgate-doors-sheet.json), the build scripts [scripts/prepare-gate-sheet.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fprepare-gate-sheet.mjs) and [scripts/capture-gate-sprite.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fcapture-gate-sprite.mjs), and captures in [docs/gate-sprite/contact.webp](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fgate-sprite%2Fcontact.webp), [docs/gate-sprite/opening.webp](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fgate-sprite%2Fopening.webp) and [docs/gate-sprite/closing-thud.webp](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fgate-sprite%2Fclosing-thud.webp). Its edits to `world-view.ts` and `gate-doors.ts` came from an older base: they would have removed co-op, hero selection and the loading bar, and the build failed with them. Those edits were not committed. The game still plays the `full-gateway-v3` sheet described above. The build passed after the push.