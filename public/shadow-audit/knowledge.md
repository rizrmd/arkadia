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
