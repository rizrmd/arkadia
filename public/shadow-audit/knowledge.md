## Live actor coverage correction — 3d4b8655

Release `1792963225332-game-3d4b8655-e8afeaa28f55` is live. Its entry, game module and actor-audit chunk match the clean-worktree build: `index-D-RM3c1d.js`, `main-CZA4gFJl.js`, `shadow-actor-frame-audit-DoZAhW23.js`. HTTP health is 200. The compiled diagnostic passes eight sample frames / 48 cases from all four source atlases, verifies their original-alpha hashes and leaves the main game renderer working, with no browser errors.

[Live compiled-frame report](https://ark-whachat.fural.space/shadow-audit/actor-live-3d4b8655/report.json) · [All 445 frames](https://ark-whachat.fural.space/shadow-audit/actor-frame-gallery.html)

![Live cemetery after isolated actor diagnostics](https://ark-whachat.fural.space/shadow-audit/actor-live-3d4b8655/cemetery-after-diagnostics.png)

Atlas-frame acceptance is now proven for its declared 2D/crossed-body geometry. The remaining checklist still includes the stabilized gateway producer, all GLB clips/poses, explicit exclusions and hardware performance. No claim of full task completion is made.

## Actor atlas frame acceptance and dynamic alpha correction — deployed, live-verified

- [x] Audit every one of 445 original atlas frames, both mirrors and three suns: 2,670 GPU casting cases pass.
- [x] Match all 445 decoded original-alpha hashes to the tracked inventory.
- [x] Check 728,988 stable opaque, 135,862 partial-alpha and 34,649,331 clear caster/receiver probes, with zero coverage/depth failures. Bounds account for the measured GPU raster subpixel grid and exact bilinear extrema over its UV footprint.
- [x] Native actor-batch receiving passes every frame/mirror with a higher caster plane and rejects a lower plane. These are 890 frame/mirror control pairs; they are not 2,670 independent directional reception tests.
- [x] Reproduce a genuine overlap regression on the original 33a61b6f shader: a partial-alpha front body plane yields RGB 155/159/165 instead of the opaque control 137/142/150. The corrected shader matches the opaque control, including near-zero source alpha.
- [x] Repeat all 293 static geometry variants after the shader precision change: 879 directional controls pass; 296 receiver/color entries match.
- [x] Push/deploy 3d4b8655 and exercise its compiled diagnostic live: eight frames, 48 casting cases, all source-alpha hashes match, no browser errors. Main game renderer remains operational after isolated GPU diagnostics.
- [ ] Audit the 16 stabilized gateway frames and 12 GLB animation clips/poses through their actual runtime producers.
- [ ] Complete controlled dense-scene and physical desktop/mobile performance evidence, and remaining explicit caster exclusions.

The GPU caster rejects alpha that would quantize to zero before writing depth. Its second pass retains a more opaque rear sample from the same physical body, instead of discarding every sample with that owner. Numeric shadow shaders explicitly use highp float precision. No new render pass or field sampler is added; original alpha, atlas frames, source art, collision, color occlusion and native batching remain intact.

The renderer still stores only two depth/alpha envelopes. More eligible translucent layers, including combinations of partial self coverage and other actors, can exceed that bound; full multilayer transmission and volumetric self-shadowing are not implemented. The 445-frame proof covers the declared 2D/crossed-body proxy, not GLB mesh depth or every continuous 3D pose. The partial-alpha bounds are a raster-support acceptance interval, not a claim of exact subpixel equality.

[Per-frame report](https://ark-whachat.fural.space/shadow-audit/actor-frames-final/report.json) · [Actor frame inspector](https://ark-whachat.fural.space/shadow-audit/actor-frame-gallery.html) · [Targeted regression](https://ark-whachat.fural.space/shadow-audit/actor-fixture/gpu-live-fixture.json)

![Four source actor families and actual two-layer GPU caster fields](https://ark-whachat.fural.space/shadow-audit/actor-frames-final/frames-0.png)

## Live native-geometry cemetery correction — 33a61b6f

The native-face correction is deployed as release `1792960385498-game-33a61b6f-a27de720abe2`. Desktop and emulated mobile cemetery load without browser errors and pass both isolated GPU cast/receive fixtures. Visual comparison at the same camera confirms that the broad torn grave-shadow streaks in 49806970 are absent in 33a61b6f; the new shadows are solid and retain the cross profile. The live entry/chunk identity matches the clean-worktree build. The 293-variant / 879-directional-control audit was repeated on this geometry. Full animation-frame proof and controlled hardware profiling remain open.

[Release identity](https://ark-whachat.fural.space/shadow-audit/live-33a61b6f/deployment.json) · [Live verification](https://ark-whachat.fural.space/shadow-audit/live-33a61b6f/verification.json) · [Latest family gallery](https://ark-whachat.fural.space/shadow-audit/family-gallery.html)

### Before: folded grave projections in 49806970

![Before, live mobile cemetery](https://ark-whachat.fural.space/shadow-audit/live-49806970/mobile-cemetery-0.3.png)

### After: source-authored faces clipped to original alpha

![After, live mobile cemetery](https://ark-whachat.fural.space/shadow-audit/live-33a61b6f/mobile-cemetery-0.3.png)

![After, live desktop cemetery](https://ark-whachat.fural.space/shadow-audit/live-33a61b6f/desktop-cemetery-0.3.png)

## Cemetery geometry correction — deployed, live-verified

Live screenshot review of `49806970` exposed remaining tears on grave shadows despite passing cast/receive controls. Those controls verified reception, not solid volume correctness. The correction now uses the actual source-authored box faces for all four grave families and both fallen columns; an eight-vertex authored proxy also closes the crate. Original alpha clips the geometry, preserving real openings and broken-piece separation. Pillar/stair art and collision are unchanged.

- [x] Establish the source 64/32 projection and world-pixel heights (37 px per authored metre for these shapes; distinct from 24 px/m relief).
- [x] Clip actual faces to original-alpha source cells; avoid interpolating source-camera depth to zero across silhouette edges.
- [x] Keep nearest visible native face within one receiver, preserving painter order across objects.
- [x] Native source recipe/hash alignment, 49,491 field assertions, 49,358 companion checks and isolated static/dynamic GPU fixtures pass.
- [x] Re-run all 293 static variants: 879 directional receiving controls pass, 296 receiver/color entries match.
- [x] Scoped morning control finds no enclosed bright components >=4 pixels for crate, barrel or any of the four cemetery families. The alternate fallen column retains a four-pixel component at a real piece separation.
- [x] Push/deploy the native-face correction; live desktop/mobile GPU fixtures pass. Screenshot review is recorded in this page.
- [ ] Complete every animation-frame/mirror GPU proof and controlled hardware performance evidence.

![Native faces compared with folded source proxies](https://ark-whachat.fural.space/shadow-audit/native-volume-control/control.png)

## Native cemetery volume experiment

The actual authored box recipes now supply per-ray front/back height intervals for all four cemetery families and both fallen-column orientations. This replaces inferred height on these families. The control remains under visual review; original alpha and collision are unchanged.

![Native cemetery and fallen-column control](https://ark-whachat.fural.space/shadow-audit/native-volume-control/control.png)

## Live evidence for commit 49806970

Release `1792958638651-game-49806970-3aa6a0d53eee` is live at [Arkodia](https://ark-whachat.fural.space). The served entry is `/assets/index-BH7qfnRe.js`; the shadow runtime is `/assets/main-Bo0oRiol.js`, matched to the clean-worktree build. Health is HTTP 200. Desktop and emulated mobile cemetery at sun time 0.3 passed both isolated static and live GPU fixtures, including 24,576 exact packed-byte comparisons, with no browser errors.

[Live verification report](https://ark-whachat.fural.space/shadow-audit/live-49806970/verification.json) · [Release identity](https://ark-whachat.fural.space/shadow-audit/live-49806970/deployment.json)

![Live desktop cemetery after coverage correction](https://ark-whachat.fural.space/shadow-audit/live-49806970/desktop-cemetery-0.3.png)

![Live emulated mobile cemetery after coverage correction](https://ark-whachat.fural.space/shadow-audit/live-49806970/mobile-cemetery-0.3.png)

The software GPU run measured 806 draw calls over eight desktop frames and 610 over eight emulated mobile frames. Median RAF intervals were 166.7 ms and 766.6 ms respectively, with substantial stalls. These are constrained headless software measurements and **do not establish acceptable desktop or mobile hardware performance**. Controlled dense-scene hardware profiling and full actor/gateway frame proof remain open; the task is not complete.

## Latest shadow coverage correction — deployed and live-verified

- [x] Replace Canvas2D numeric texture staging with direct RGBA byte uploads. The old control corrupts 6,206 RGB bytes; 24,576 GPU channel checks now match exactly.
- [x] Preserve lower opaque occlusion behind a partial-alpha upper caster.
- [x] Add authored closed alpha-solid companions for crate, barrel and both fallen-column orientations, with source/alpha/frame hashes.
- [x] Separate receiver pixel-center rasterization from conservative caster coverage.
- [x] Repeat all 293 static geometry variants: 879 directional receive controls pass; 296 upright receiver/color entries have zero order mismatches.
- [x] Pass 47,691 field assertions, 49,358 companion projection checks, and isolated static/dynamic GPU fixtures without browser errors.
- [x] Deploy runtime `49806970` and verify live desktop/mobile cemetery and both isolated GPU fixtures without browser errors.
- [ ] Complete every actor/gateway frame and mirror GPU audit, dense-scene profiling, and controlled physical desktop/mobile measurements.

The broad hollow crate/barrel projections are corrected. Residual outline disagreements remain in the coarse receiver control (crate 25- and 5-pixel enclosed white components; the ground-only solid control has none). The fallen-column control retains one four-pixel component, potentially a real source opening. These are recorded rather than claiming perfect silhouettes or full task acceptance. Collision and pillar/stair geometry are unchanged.

[Latest 293-variant GPU report](https://ark-whachat.fural.space/shadow-audit/family-solid-final/report.json) · [GPU byte and cast/receive fixture](https://ark-whachat.fural.space/shadow-audit/solid-volume-control/gpu-live-fixture.json) · [Family gallery](https://ark-whachat.fural.space/shadow-audit/family-gallery.html)

![Original, ground-only, closed-solid and solid-ground controls](https://ark-whachat.fural.space/shadow-audit/solid-volume-control/control.png)

## Closed volume experiment (not yet accepted)

The latest comparison uses the original folded surface, a ground-only receiver control, and a closed alpha-solid volume. Small enclosed bright regions remain; this experiment is not yet a complete fix.

![Closed solid volume comparison](https://ark-whachat.fural.space/shadow-audit/solid-volume-control/control.png)

## Solid-prop geometry review

Visual review identified hollow projections on the solid crate and barrel, and a thin/hollow projection on fallen columns. A ground-only receiver control shows almost no wrongly suppressed shadow pixels outside the art (crate 4 of 4,152, barrel 1 of 5,632, fallen column 0 of 1,667). This points to the folded-billboard geometry rather than a broad receiver-alpha masking failure. Authored cap/side geometry is being evaluated; original alpha will remain the silhouette mask.

![Original crate source](https://ark-whachat.fural.space/modular-stronghold/crate.png)

![Original barrel source](https://ark-whachat.fural.space/modular-stronghold/barrel.png)

![Original frontier atlas used for fallen-column landmarks](https://ark-whachat.fural.space/frozen-frontier/game/atlas-5083a8ebd8c8bb4b.webp)

## Static family acceptance

The current layout registers 447 static surfaces. Its 285 distinct geometry variants, including explicit unused foundation and forge-level fixtures, pass 855 directional cases. The all-building/legacy layout registers 456 static surfaces; 293 distinct variants including the supplements pass 879 directional cases. Every case uses the production GPU filter, Worker, original alpha and registered geometry. Each visible asset receives an independent higher caster and rejects a lower caster at an actual GPU receiver pixel. Ground-cast coverage, exclusions and available raised-receiver probes are checked separately.

All current geometry signatures are represented in the legacy gallery. Numeric reports retain actual placement coordinates in both layouts, rather than claiming the screenshots cover every placement. Rotated zero-height decals use the common terrain receiver and intentionally have no independent height/caster surface. The unused foundation is labeled as a catalog fixture; it is not claimed as a placed object.

### Receiver order correction

The previous frontier receiver list followed placement-file order, while its color layer sorts by depth and cap offset. This could choose an occluded surface's height/owner at overlapping pixels. The receiver list now uses the exact stable color order. Both layouts compare all 296 upright color sprites against receiver records with zero mismatches. A separate GPU overlap fixture confirms that changing the visible receiver order changes the shadow result appropriately. Collision, navigation, source art, pillar/stair geometry and strip counts are unchanged.

Four preliminary probes selected CPU height texels at alpha boundaries. Those coordinates did not identify the same GPU pixel after float32 camera reconstruction. Final probes read the packed GPU receiver output, choose a visible interior receiver pixel and position independent higher/lower casters on that exact ray. The rock cases and full current/legacy audits then pass. The superseded observations remain in `family-probe-diagnostics.json`; they are not presented as four renderer bugs.

### Visual review gallery

The gallery includes 66 family/source groups and every one of the 293 geometry variants. Images are lossless WebP with decoded RGBA bytes checked against the original production-renderer PNG. The unlit source art is composited over the actual production shadow result for inspection. This is an explicit geometry-proxy audit, not a claim of measured volumetric self-shadowing.

<iframe src="https://ark-whachat.fural.space/shadow-audit/family-gallery.html" title="Shadow family and geometry variant acceptance" height="760"></iframe>

### Checklist

- [x] Current-layout static cast/receive controls, three sun vectors.
- [x] Legacy/all-building static cast/receive controls, three sun vectors.
- [x] Forge levels and unused foundation catalog fixture.
- [x] Receiver order matches all 296 actual color sprites in both layouts.
- [x] GPU overlap-order regression.
- [x] Source alpha, frame, pivot, lift and mirror metadata retained.
- [ ] Finish visual review of all family plates and resolve findings.
- [ ] Exercise every actor atlas frame and gateway animation frame on GPU.
- [ ] Complete dense dynamic-caster profiling and consolidate real-device telemetry.
- [ ] Push, deploy and revalidate this receiver-order correction live.

### Review plates

![Static family review plate 1](https://ark-whachat.fural.space/shadow-audit/family-review/families-0.png)

![Static family review plate 2](https://ark-whachat.fural.space/shadow-audit/family-review/families-1.png)

![Static family review plate 3](https://ark-whachat.fural.space/shadow-audit/family-review/families-2.png)

![Static family review plate 4](https://ark-whachat.fural.space/shadow-audit/family-review/families-3.png)

![Static family review plate 5](https://ark-whachat.fural.space/shadow-audit/family-review/families-4.png)

![Static family review plate 6](https://ark-whachat.fural.space/shadow-audit/family-review/families-5.png)

![Static family review plate 7](https://ark-whachat.fural.space/shadow-audit/family-review/families-6.png)

![Static family review plate 8](https://ark-whachat.fural.space/shadow-audit/family-review/families-7.png)

![Static family review plate 9](https://ark-whachat.fural.space/shadow-audit/family-review/families-8.png)



## Verified dynamic integration delivery

### Frame ownership and fixture lifecycle correction

Party members share the Three body canvas. Each published frame now uploads immediately to a private GPU source owned by that actor, before another actor can overwrite the canvas. A regression renders an alpha opening for the first actor and a solid second frame into the same canvas; the first actor retains its opening while the second remains solid. There is no CPU canvas snapshot or runtime pixel readback.

Live verification of the first integration passed every numeric receiver assertion but captured `Cannot read properties of null (reading ids)` after fixture cleanup. A normal live cemetery run without fixtures had no errors. The stack identified a HUD nine-slice retaining a pooled batch destroyed by the QA Application's global cleanup. Fixture renderers now stop their tickers, use independent GPU state and explicitly retain global resources when destroyed. A control deliberately retires a batch then destroys another renderer with global release; it reproduces the same error. Cleanup without global release passes the same check and preserves rendering. No Pixi prototype patch is used.

The corrected local settlement run at afternoon `.72`, with both fixtures enabled, completes with zero console/page errors. Initial failing reports are retained under `live-casters-live` and `live-casters-isolated-local`; corrected evidence is `live-casters-isolated-fixed`. Source-level batching and collision behavior remain intact.

### Final live delivery

Code commits `8470959f` and `b5837c44` were pushed. Supported game layer `1792947617120-game-b5837c44-151ee9301777` passed its health check. The final live cemetery test uses the morning sun `.3` and emulated phone viewport; it passes both GPU fixtures and records zero console/page errors. The dynamic fixture confirms private shared-canvas ownership and renderer isolation on the deployed build. The build also includes the committed tent/UI changes present in `b5837c44`; later peer ground-plane changes are a separate delivery and are not overwritten by this evidence layer.

The final software sample remains slow: eight RAF intervals, median 3816.6 ms, p95 23924.4 ms and 616 total draw calls. It does not establish physical-device performance or isolate the cost of shadows. Do not infer a performance pass from the GPU submission timing.

![Final live cemetery with both GPU fixtures verified](https://ark-whachat.fural.space/shadow-audit/live-casters-final-live/mobile-cemetery-0.3.png)

[Final live report](live-casters-final-live/verification.json), [final live GPU assertions](live-casters-final-live/gpu-live-fixture.json), [deployment record](live-casters-deployment.json).


## Dynamic casting checklist

- [x] Same-frame actor and gateway GPU depth integration.
- [x] Native actor batch receiving; original alpha holes and mirrors preserved.
- [x] GPU fixture verifies cast/receive, animation, removal and depth peeling.
- [x] Refresh 547 tracked inventory dispositions.
- [ ] Complete all-family multi-angle visual acceptance.
- [ ] Complete dense-combat and physical-device performance acceptance.
- [x] Push, deploy and verify dynamic integration live; final cemetery run passes both GPU fixtures with zero browser errors.

## Same-frame dynamic shadow integration

The torn static shadows were corrected by the continuous source-cell triangle rasterizer in `7b8719ba`. This change fills the next integration gap: actors now cast onto static object/terrain receivers, and gateway animation no longer waits for a CPU Worker to rasterize each frame.

### Geometry and source contract

The light ray is `(groundX + sun.dx*z, groundY + sun.dy*z)`. A screen point `(x,y)` reconstructed at height `h` queries `(x+sun.dx*h, y+(1+sun.dy)*h)`. Heights remain world pixels; source scale is applied once. The original source alpha supplies coverage, including holes and partial edges. RGB brightness never supplies height.

Actors publish the current original atlas rectangle or raw 3D body canvas crop, logical display size, normalized pivot, mirror, revision and current ground/lift anchor. The 3D crop excludes its old ground-shadow area. Two explicit crossed billboard body planes have a nine-world-pixel ground-depth span; this avoids collapse at near-horizontal sun angles. This is an authored proxy, not reconstructed volumetric mesh depth.

The gateway uses its stabilized, foundation-faded, unlit current frame and the same closed-frame ground support as before. A 17-column, three-row hinge mesh retains frame alpha and separates source top, support and bottom. Its receiver-height pass uses that exact geometry and alpha. Closed support is intentionally stable during opening; this is not per-door volumetric depth.

A shared GPU pass builds nearest primary depth and a second distinct-owner layer before the root color render. Actors own IDs 3000–3998; gateway geometry starts at 4000. Height and owner packing remains identical to the static field. Normal GPU depth testing selects the highest surface. The second pass rejects the first layer's owner, allowing receivers to ignore their own proxy while retaining another caster behind it.

The native Pixi receiver batch retains sprite geometry, alpha, tint and occlusion. Existing four field sampler slots are reused. There are no per-actor filters and no runtime CPU readbacks. The old 3D projected foot-shadow passes and 2D projected shadow composition are suppressed only while unified casting is active, preventing doubled shadows. Mode changes invalidate relevant caches. Enemy culling includes the directional shadow reach, so offscreen casters are retained when their shadows can enter the viewport.

### Validation

- TypeScript passes.
- 47,683 static depth/packing assertions pass; old point splats produce 5,774 interior holes in the regression control versus zero for continuous triangles.
- 49,358 companion/frame alignment samples pass across 547 inventory rows, including 445 actor frames and 46 frontier families.
- Actual Pixi GPU fixture passes actor cast onto raised/ground receivers, original alpha opening, same-render mirror and animation changes, above-caster rejection, overlapping owners, distinct-owner depth peeling, gateway mesh cast/receive, removed-caster clearing, and a near-horizontal sun case. Blocked RGB is `[137,142,150]`; lit pixels are `[255,255,255]`.
- Desktop settlement at afternoon `.72` and emulated phone cemetery at morning `.3` load without console/page errors and pass the existing static/actor receiver fixture.
- Collision, navigation thresholds, authored terrain data and pillar/stair geometry are unchanged.

### Performance evidence and limits

These are software SwiftShader measurements, not physical desktop/Android performance acceptance. Desktop settlement recorded 8 frames with median RAF interval 1816.6 ms and 762 draw calls total. Phone cemetery recorded 8 frames with median 1299.9 ms and 616 draw calls total. These slow, short, software samples must not be represented as a hardware frame-rate result or a causal before/after comparison. Dynamic pass CPU submission in the desktop snapshot was 0.6 ms for one actor plus gateway, 59 vertices and 500,864 map pixels; allocated color/depth estimate was 8,427,008 bytes. This timing excludes asynchronous GPU execution.

Remaining acceptance: per-family visual review at all requested angles/variants/animation states, dense-combat profiling, physical-device performance, and full occlusion comparisons. Static clipmap Worker rebuilds remain asynchronous. Canvas retains legacy ground shadows and cannot provide GPU object reception. Same-owner volumetric self-shadowing is not implemented. The refreshed inventory reports available integration separately from pending visual acceptance.

### Evidence

![Desktop settlement with continuous scenery shadows and unified actor casting](https://ark-whachat.fural.space/shadow-audit/live-casters-local/desktop-settlement-0.72.png)

![Emulated phone cemetery, morning sun](https://ark-whachat.fural.space/shadow-audit/live-casters-mobile/mobile-cemetery-0.3.png)

[GPU live fixture](live-casters-local/gpu-live-fixture.json), [desktop report](live-casters-local/verification.json), [phone report](live-casters-mobile/verification.json).


## Torn-shadow rasterization correction

The player reported repeated missing patches and a dotted lattice in otherwise solid platform, wall and arch shadows. The light-space field projected only pixel-centre samples into fixed 2×2 texel splats. That coverage was not guaranteed when the support profile, shear or sun stretched a source cell. The receiver height map used the same point approximation.

Each sampled source cell now carries all four geometry corners. Two triangles cover its projected footprint, interpolate height, and retain the source cell's original alpha. The receiver-height map rasterizes the same geometry in screen projection. Conservative pixel-edge tests close sampling gaps without flood-fill or brightness-derived heights; actual transparent arch openings remain open. A scanline half-plane rasterizer avoids scanning the large empty bounding boxes of thin oblique triangles. Empty packed-map cells no longer allocate temporary encoding arrays.

## Evidence

- Field regression: **47,683 checks pass**. The old point-splat control leaves **5,774 interior holes** in the oblique support-plane fixture; the triangle mesh leaves **zero** across 12 sun vectors. The real alpha-aperture check remains open. Instance/height/coverage packing and the 4096 texture-dimension bound are checked.
- Actual GPU readback fixture passes raised and ground receivers, alpha holes, mirrored holes, rejection of a caster below the receiver, and native actor-batch receiving.
- Desktop visual checks completed at the temple podium (afternoon), the ruined gateway (morning and afternoon), and the settlement enclosure beside the podium (afternoon), with no recorded page/console errors. The reported dotted/tearing pattern is absent in the corrected captures.
- TypeScript passes. Original sprites/atlas alpha, collision, authored map geometry and pillar/stair assets are unchanged.

Performance remains under investigation: the captured environment uses SwiftShader and is not hardware desktop/mobile proof. This correction resolves the reported sampling tears; it does not claim the entire broader shadow task is finished.


## Report and corrected captures

![Player report: torn platform and pillar shadows](https://ark-whachat.fural.space/shadow-audit/reported-shadow-tears/temple-platform.png)

![Player report: dotted enclosure shadows](https://ark-whachat.fural.space/shadow-audit/reported-shadow-tears/ruined-enclosure.png)

![Corrected temple podium, afternoon](https://ark-whachat.fural.space/shadow-audit/tears-fixed-podium/desktop-pillar-courtyard-0.72.png)

![Corrected enclosure beside the podium, afternoon](https://ark-whachat.fural.space/shadow-audit/tears-fixed-settlement/desktop-settlement-0.72.png)

![Additional corrected ruined gateway, afternoon](https://ark-whachat.fural.space/shadow-audit/tears-fixed-enclosure/desktop-ruined-gate-0.72.png)

## Previous integration checkpoint

## Runtime integration checkpoint

The current candidate replaces the static world shadow path with an original-alpha light-space depth field. Court sprites use measured alpha support profiles; frontier props reuse registered ground profiles. Terrain receiver height follows authored relief geometry. A camera clipmap keeps the active textures near 8 MB in the tested cemetery viewport instead of the initial 28 MB full-map maps. Depth work runs in Web Workers.

Static scenery receives by reconstructed per-pixel height. The native actor sprite batch now receives scenery shadows for the hero, party and enemies, preserving frame alpha/tint and multi-texture batching; it reserves four texture units for light-depth maps instead of installing per-actor filters. The gateway publishes its current unlit frame into a separate dynamic depth field with the original closed-frame support profile. Dynamic worker latency during rapid gate animation is still to be measured and optimized.

GPU fixture passed object and ground reception, original alpha holes, mirrored holes, above-caster rejection, and native actor-batch receiving. Blocked pixels read RGB 137/142/150, while the alpha opening and above-caster receiver remained RGB 255/255/255. Numeric field tests pass 10,935 assertions; existing geometry tests pass 49,358 samples.

Source alpha, atlas packing, map geometry, collisions and pillar/stair assets remain unchanged. Self-proxy acne is suppressed by the instance ID and second distinct-owner depth; same-owner material self-shadowing above the contact region is deliberately suppressed because these are folded billboard proxies, not measured solids. Heights are packed at 0.5 world-pixel precision with a 2047.5 px maximum and 4095 instance IDs per clipmap.

## Honest remaining work

- Project dynamic actor casts onto other geometry, rather than only their existing actor-local ground-shadow canvases.
- Precompute gateway light maps if needed to guarantee all rapid animation frames without worker latency.
- Finish all-map/family exclusion inventory refresh and visual validation at multiple angles, including terrain slopes and all animated/mirrored variants.
- Complete performance optimization and measurements. SwiftShader emulation is not hardware mobile/desktop proof; the actor-shader test exposed a software-rendering slowdown and further optimization remains required.

This is a deployable checkpoint requested for human inspection. The full goal remains active and incomplete.


## Diagnostic images for this checkpoint

![Initial diagnostic: proxy self-shadow acne, corrected later](https://ark-whachat.fural.space/shadow-audit/depth-local/mobile-cemetery-0.52.png)

![Owner depth correction diagnostic before camera clipmap](https://ark-whachat.fural.space/shadow-audit/depth-local-owner/mobile-cemetery-0.52.png)

![Worker integration diagnostic before camera clipmap](https://ark-whachat.fural.space/shadow-audit/depth-worker/mobile-cemetery-0.52.png)

![Camera clipmap and alpha-hole GPU fixture checkpoint](https://ark-whachat.fural.space/shadow-audit/depth-clipped-fixed/mobile-cemetery-0.52.png)

![Native actor receiver integration checkpoint](https://ark-whachat.fural.space/shadow-audit/depth-actors/mobile-cemetery-0.52.png)

## Earlier audit record

## Renderer contract and integration limits

This records the actual implementation, not a proposal for a physically complete shadow renderer. The generated companions model the **existing piecewise vertical billboard**. A photograph/sprite and its alpha cannot uniquely determine volumetric depth. No RGB brightness is interpreted as height. AI raster generation would not establish registration or measured geometry, so it is not used for these numeric companions.

### Coordinates and units

`src/isometric.ts`: map tiles `(u,v)` project to `(64(u-v),32(u+v))`; add `STRONGHOLD.court.origin` for court-local world pixels. This is 2:1 dimetric. Camera translation, zoom and DPR happen afterwards. Relief uses 24 world pixels per metre; map ground tiles are 3 metres. Ground-axis distance and screen-vertical height have distinct scales.

For source-frame pixel `(a,b)`, frame size `(fw,fh)`, normalized pivot `(ax,ay)`, placement `(X,Y)`, lift `L`, shear `q`, and signed horizontal scale `sx = width/fw * (flip ? -1 : 1)`, `sy = height/fh`:

- Drawn screen-world point: `x = X + sx(a-ax*fw)`, `y = Y-L + q*sx(a-ax*fw) + sy(b-ay*fh)`.
- Geometry companion baseline `B(a)` interpolates 17 unmirrored source-space ground samples. Mirroring changes `sx`, never the frame or ground array.
- Billboard proxy height `z = L + sy(B(a)-b)`. Below-base halo pixels may have negative local height; retain original alpha and signed projection for parity, rather than silently thresholding or modifying art.
- Reconstructed projected ground: `gx = x`, `gy = y+z`. At a known height this yields tiles `u=((gx-Ox)/64+(gy-Oy)/32)/2`, `v=((gy-Oy)/32-(gx-Ox)/64)/2`.
- For receiver height `R`, projection is `(gx + sun.dx*(z-R), gy-R + sun.dy*(z-R))`. Frontier replaces `sun.dy` by `sign(dy)*max(abs(dy),.12)` to avoid a collapsed strip. This artistic minimum differs from an exact physical light projection.
- A strip approximates `B` by a line between rounded frame x endpoints. Therefore the per-pixel reconstruction and current strip rasterization agree at endpoints; their interior may differ across an unsampled ground-line bend. Cemetery/pillar/stair strips use all 16 segments. Other families use 1–8 strips and remain approximations.
- A slab uses a constant authored 25.3 px top elevation at scale 1. It is **not** a volumetric depth map for front/side faces.

### Depth, alpha, and receivers

Depth order for frontier uprights is ground pivot `p.y`; caps add .05. Hero occlusion uses footprint columns plus cropped sprite alpha (alpha below 150 removed for occlusion only), not a scene depth buffer. Collision remains the map's authored footprint columns and relief; generated shadow companions never feed navigation.

Frontier casts sample the original atlas alpha, including partial edges and existing translucent contact artwork. Original art, atlas packing, pivots, strips, texture source, batching and collision remain unchanged. Companions are bundled JSON, so no extra runtime texture/request is needed. Atlas SHA and frame/pivot/world/ground tuples are checked before creating scenery.

Snow and the temple podium top are the implemented receiver planes. Only elevated Temple props get the podium receiver pass. General shadows onto grave tops, walls, trees, actors, other raised terrain, and mutual/self shadowing are unavailable. Ambient lightmap tint is not object shadow reception. No scene-wide per-pixel world position/depth texture exists. Source inspection cannot validate unavailable functionality.

Court buildings and props use convex hulls extruded from footprint columns; they do not preserve alpha holes. The gateway uses its static closed proxy through the 16 door frames. Actors use per-frame alpha foot profiles; the 3D hero projects rendered alpha rather than mesh shadow rays, and low quality uses contact shadows. These paths need separate integration for full acceptance.

### Tracked coverage

`inventory.json` enumerates every current frontier catalog family (placed or unused), every prefab prop (including legacy layout), unique building level asset, all 16 gateway frames, every character manifest frame and clip membership, and all map relief features. The two world-map definitions are a base map and its overlay, not independent worlds. Strategic expedition markers and asset/character review entry points are recorded separately; they are not gameplay sprite maps. Review-only wall catalogs, parallax decoration, VFX, pickups and procedural torch animation still need a dedicated audit before claiming every possible visual entry point is covered.

### Acceptance checklist

- [x] Inspect renderer and establish actual coordinate, pivot, height and depth contract.
- [x] Track 46 frontier families and frame-level character/gateway alignment with source/alpha hashes.
- [x] Generate explicit geometry companions with atlas revision validation; consume baselines in frontier renderer.
- [x] Preserve existing pillar/stair resolution, map/collision definitions and source alpha.
- [ ] Visually approve cemetery cast **and object reception** at morning/noon/afternoon angles.
- [ ] Complete scene-wide receiver/depth reconstruction and height-aware terrain intersection.
- [ ] Replace court convex-hull and animated gate static proxies with alpha-aligned casters.
- [ ] Audit review-only catalogs, parallax, procedural flames/VFX and pickups for intentional caster exclusion.
- [ ] Approve all families/mirrors/animations and alpha edges visually after receiver integration.
- [ ] Measure hardware desktop/mobile GPU performance; browser emulation is only a limited software measurement.

Task acceptance remains incomplete while the unchecked renderer integration and validation items remain.

## Evidence and delivery

Local validation completed eight cemetery captures: desktop 1440×900 and mobile 390×844, at morning (.3), noon (.52), afternoon (.72), and night (0). Each reports 297 casters and 1,619 strips; daytime shadows are visible and night has zero shown casters. No page errors were recorded. This does not establish object reception. The initial 30-frame run timed out at 300 seconds after six captures; the completed repeat uses eight RAF samples per case. SwiftShader software medians range from 416.6 to 733.3 ms: unsuitable for real desktop/mobile performance acceptance.

The inventory contains 547 rows, including 445 sprite actor frames and 12 live 3D hero clips. Numeric validation passes 49,358 samples, including baseline parity and screen reconstruction, and checks source frame bounds/alpha, clip indices, and stale revision rejection.

[Renderer contract](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fshadow-audit%2Fcontract.md) · [Per-asset inventory](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fshadow-audit%2Finventory.json)

[Geometry inspector](https://ark-whachat.fural.space/shadow-audit/) (available after deployment; diagnostic only).

![Local desktop cemetery at time 0.3; cast-shadow diagnostic, not receiver acceptance](https://ark-whachat.fural.space/shadow-audit/local/desktop-cemetery-0.3.png)

![Local desktop cemetery at time 0.52; cast-shadow diagnostic, not receiver acceptance](https://ark-whachat.fural.space/shadow-audit/local/desktop-cemetery-0.52.png)

![Local desktop cemetery at time 0.72; cast-shadow diagnostic, not receiver acceptance](https://ark-whachat.fural.space/shadow-audit/local/desktop-cemetery-0.72.png)

![Local desktop cemetery at time 0; cast-shadow diagnostic, not receiver acceptance](https://ark-whachat.fural.space/shadow-audit/local/desktop-cemetery-0.png)

![Local mobile cemetery at time 0.3; cast-shadow diagnostic, not receiver acceptance](https://ark-whachat.fural.space/shadow-audit/local/mobile-cemetery-0.3.png)

![Local mobile cemetery at time 0.52; cast-shadow diagnostic, not receiver acceptance](https://ark-whachat.fural.space/shadow-audit/local/mobile-cemetery-0.52.png)

![Local mobile cemetery at time 0.72; cast-shadow diagnostic, not receiver acceptance](https://ark-whachat.fural.space/shadow-audit/local/mobile-cemetery-0.72.png)

![Local mobile cemetery at time 0; cast-shadow diagnostic, not receiver acceptance](https://ark-whachat.fural.space/shadow-audit/local/mobile-cemetery-0.png)

Game release `1806122` was pushed and deployed from a clean worktree using `scripts/fural-deploy.sh`; layer `1792929563738-game-1806122-c3cf9f721a70`. Companion checks, TypeScript/Vite, all Go tests (including simulation parity), and co-op smoke passed. Gateway route fix: `3276e37`, deployed with the supported gateway publisher. A commit API attempt returned Cloudflare 524; the route fix was subsequently committed locally using the configured human identity.

Live desktop and mobile cemetery noon checks passed with no page errors, 297 casters and 1,619 strips. Inspector selected all 46 families and exercised mirror/sun controls without page errors. JSON SHA256 checks match the committed companion and inventory data. Software frame timings remain unsuitable for hardware performance acceptance.

No map/collision files changed; pillar/stair strip policy is preserved. General object receiving, court/gateway alpha caster integration, full exclusion audit and full-family visual/hardware validation remain open. **Task status: review, not done.**


## Live and companion previews

![Live cemetery cast-only validation](https://ark-whachat.fural.space/shadow-audit/live/desktop-cemetery-0.52.png)

![Live cemetery cast-only validation](https://ark-whachat.fural.space/shadow-audit/live/mobile-cemetery-0.52.png)

![Geometry proxy diagnostic; not measured depth](https://ark-whachat.fural.space/shadow-audit/live/geometry-preview.png)

![Geometry proxy diagnostic; not measured depth](https://ark-whachat.fural.space/shadow-audit/live/geometry-mirrored-preview.png)


Compatibility: the depth-field path is enabled only on WebGL. The newly added Canvas renderer fallback retains the legacy ground-shadow path; depth-based object receiving is unavailable there.

## Live verification of the torn-shadow correction

Correction `7b8719ba` was pushed and deployed in game release `bf62a635`, layer `1792941854890-game-bf62a635-29aa0b8b31d9`. Build, Go tests and deployment co-op smoke passed. Live desktop settlement/enclosure at afternoon (.72) loaded the depth field and completed the GPU fixture with zero page/console errors. Raised/ground/actor receivers, mirrored alpha holes and above-caster rejection pass. The initial live attempt encountered transient manifest/worker HTTP 502 responses; it is archived separately rather than counted as a pass. A fresh retry after both endpoints returned 200 passed.

![Verified live: continuous enclosure and platform shadows, with true arch openings retained](https://ark-whachat.fural.space/shadow-audit/tears-live/desktop-settlement-0.72.png)

The full task remains active: dynamic actors casting onto object receivers, gate-frame latency, inventory refresh/full-family visual coverage and performance work are still open.