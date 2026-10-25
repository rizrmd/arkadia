## Native cemetery faces and source-space solid proxies

Four cemetery families and both fallen-column orientations now use the actual numeric box recipes from `ground-kit.mjs`. Their source-camera projection is `(64(u-v),32(u+v)-z)`. These source shapes use **37 world pixels per authored metre**, while terrain relief uses 24; the boxes already store world-pixel `z`, so no metre conversion is applied again. Placement horizontal/vertical scale, mirror, lift and shear are applied once, using the catalog frame and pivot.

Each box face is clipped to occupied original-alpha source cells in camera space before being projected into light space. This avoids the false curtains produced by interpolating a sampled silhouette depth to zero. Top, +u and +v faces receive; all six closed faces cast. Among faces of one visible object, the receiver map keeps the greatest height along the camera ray; different objects still follow production painter order. Actual gaps between broken column pieces are retained. Standing pillars and stairs are untouched.

The crate uses an authored eight-vertex closed proxy measured in normalized source-frame coordinates; the barrel retains its authored cap and camera-ray volume. Neither proxy derives heights from RGB. The current control has zero enclosed bright components of four or more pixels on all four cemetery families, crate and barrel. The alternate fallen column retains a four-pixel component at a real separation between pieces. These scoped controls do not prove perfect subpixel edge agreement on every frame.

The latest 293-variant GPU audit passes all 879 directional receiving controls, with zero color/receiver order mismatches. Native box projection regression also checks mirrors, vertical scale, shear, lift, three lights, below/above receivers; total field assertions are now 49,491.

## Exact-byte depth uploads and closed solids

The current static field uploads packed RGBA bytes using `BufferImageSource` with `rgba8unorm`, nearest sampling and no alpha premultiplication. Canvas2D is unsuitable for numeric RGB with partial alpha: its internal premultiplied representation damaged 6,206 RGB bytes in the 4,096-texel regression control. The direct buffer preserves all 24,576 RGB/alpha channel comparisons on the GPU, including every alpha byte. Both primary and second fields use this path.

`solid-shadow-companions.json` adds authored cap heights and front/back camera-ray intervals for crate, barrel and both fallen-column orientations. Source/alpha/frame hashes and atlas revision are tracked. Height is geometric; no RGB brightness is interpreted as depth. Local cap height is multiplied by logical frame height and vertical scale once. Source alpha supplies each occupied cell and its unchanged coverage. Back and connecting faces cast only; visible front faces receive. Original openings are retained. This remains an explicit proxy, not reconstructed mesh depth.

The 18-float Worker record uses flag bit 0 for cast and bit 1 for receive. Physical static owner is index+1. Near-opaque samples (alpha >=240, retaining the original value) also contribute a second envelope at owner `2*N + physicalOwner`; source interiors are frequently 250–253. Actual IDs must stay below 3000, where live actor IDs begin. `uCamera.w=2*N` is updated only when that scene revision is applied and survives camera placement. The shader treats those aliases as the same caster only for physical static owners, suppressing volumetric self-shadow above height 2 while retaining ground/contact shadow. Dynamic actors cannot alias static geometry.

Both eligible depth layers contribute the maximum alpha coverage; a partial upper layer cannot erase a lower opaque caster. Two envelopes are still a bounded approximation: more overlapping translucent layers are not fully integrated. Receiver triangles use pixel-center coverage; conservative triangle expansion is reserved for casters to prevent tears. The coarse receiver grid can still differ from the displayed alpha at a few outline pixels; zero visual error is not claimed.

The latest all-building audit covers 456 registered surfaces plus three supplements, 293 geometry variants and 879 directional receiving controls. All 296 upright receiver entries match color painter order. Contact sheets render the source art through the actual GPU filter. These controls are not a proof of every animation frame or physical mobile performance.

## Current runtime

The renderer now uses an original-alpha light-space depth field, reconstructed static receiver heights, and batched actor receivers. See [runtime integration](depth-integration.md) and [sampling-tear correction](tear-rasterization.md). The sections below record the original audited baseline and its limitations before this integration.

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
