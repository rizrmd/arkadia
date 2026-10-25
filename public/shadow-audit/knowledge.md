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
