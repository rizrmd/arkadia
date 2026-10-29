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

### Frame ownership and fixture lifecycle correction

Party members share the Three body canvas. Each published frame now uploads immediately to a private GPU source owned by that actor, before another actor can overwrite the canvas. A regression renders an alpha opening for the first actor and a solid second frame into the same canvas; the first actor retains its opening while the second remains solid. There is no CPU canvas snapshot or runtime pixel readback.

Live verification of the first integration passed every numeric receiver assertion but captured `Cannot read properties of null (reading ids)` after fixture cleanup. A normal live cemetery run without fixtures had no errors. The stack identified a HUD nine-slice retaining a pooled batch destroyed by the QA Application's global cleanup. Fixture renderers now stop their tickers, use independent GPU state and explicitly retain global resources when destroyed. A control deliberately retires a batch then destroys another renderer with global release; it reproduces the same error. Cleanup without global release passes the same check and preserves rendering. No Pixi prototype patch is used.

The corrected local settlement run at afternoon `.72`, with both fixtures enabled, completes with zero console/page errors. Initial failing reports are retained under `live-casters-live` and `live-casters-isolated-local`; corrected evidence is `live-casters-isolated-fixed`. Source-level batching and collision behavior remain intact.

### Final live delivery

Code commits `8470959f` and `b5837c44` were pushed. Supported game layer `1792947617120-game-b5837c44-151ee9301777` passed its health check. The final live cemetery test uses the morning sun `.3` and emulated phone viewport; it passes both GPU fixtures and records zero console/page errors. The dynamic fixture confirms private shared-canvas ownership and renderer isolation on the deployed build. The build also includes the committed tent/UI changes present in `b5837c44`; later peer ground-plane changes are a separate delivery and are not overwritten by this evidence layer.

The final software sample remains slow: eight RAF intervals, median 3816.6 ms, p95 23924.4 ms and 616 total draw calls. It does not establish physical-device performance or isolate the cost of shadows. Do not infer a performance pass from the GPU submission timing.

![Final live cemetery with both GPU fixtures verified](https://ark-whachat.fural.space/shadow-audit/live-casters-final-live/mobile-cemetery-0.3.png)

[Final live report](live-casters-final-live/verification.json), [final live GPU assertions](live-casters-final-live/gpu-live-fixture.json), [deployment record](live-casters-deployment.json).
