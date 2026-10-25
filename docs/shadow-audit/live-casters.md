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
