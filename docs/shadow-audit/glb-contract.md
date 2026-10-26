## Actual GLB frame contract

The source renderer uses a 114 × 103 raster cell plus 22 rows of headroom, multiplied by the quality profile's scale (1 or 2). Its returned sprite frame is `[0, 0, spriteW, spriteH]`; unused legacy-shadow rows below that frame are excluded. The destination gameplay cells differ: Ember Warden is 111 × 104 and Rift Runner 113 × 104, both with pivot `(57, 102)`. Never infer the destination cell from the source canvas size.

With display scale `D = 0.66`, destination headroom is `top = spriteTop × cell.h / (spriteH − spriteTop)`. The published frame has width `cell.w × D`, height `(cell.h + top) × D`, and normalized pivot `[pivot.x / cell.w, (pivot.y + top) / (cell.h + top)]`. Ground row and cached render results include the actual destination cell ratio and pivot.

### Deformation and reconstruction

The companion geometry copies the GLB's bind positions, joint indices, weights and triangle indices once. Every produced color frame publishes fresh bone matrices, model matrix, **current** inverse bind matrix and source view-projection matrix. Attached-skin inverse bind matrices change with the evaluated model transform; caching one from the first pose is incorrect.

The GPU evaluates the same linear skin as Three.js: `world = model × currentBindInverse × Σ(weight × bone × bind × position)`. The source camera projects that point to normalized source coordinates `(u, v)`. Those coordinates sample the **same post-process original alpha** uploaded synchronously on publication, before the shared Three canvas can be reused for another party member. The added GLB shadow path performs no JavaScript pixel readback and runs no independent shadow animation clock.

Camera `Pyy` and view `Vyy` determine height scale in destination world pixels:

`K = D × cell.h × spriteH / (spriteH − spriteTop) × 0.5 × Pyy × Vyy`.

For anchor `(ax, ay)`, terrain lift `L`, destination frame dimensions `(w, h)` and normalized pivot `(px, py)`, source-camera screen coordinates are `(ax + (u − px)w, ay − L + (v − py)h)`. Projected world height is `z = max(L, L + world.Y × K)`, clamping below-floor mesh vertices to the terrain floor. Ground reconstruction is `(screen.x, screen.y + z)` and the light ray is `ground + sun.xy × z`. This is a renderer pixel contract; a normalized Three model unit is not asserted to equal one terrain meter.

The diagnostic independently compares every evaluated vertex with `Three.SkinnedMesh.getVertexPosition()` and checks projected vertical displacement against `K`, plus ground-row/pivot parity. Source hashes bind the reports to the GLB and destination-cell manifest.

### Original alpha and the fringe companion

The actual mesh supplies body depth. Raster support and the post-process ink outline have alpha outside that mesh's exact camera silhouette. A small source-aligned geometry grid covers only those missing-alpha samples. Its vertex heights extend from the nearest owned real camera-height sample, searching up to three field texels. An explicit baseline is retained only when no nearby surface sample exists. Source alpha, not luminance, supplies coverage. The fringe is a geometry proxy for that raster/ink support, not claimed to be physical mesh depth.

### Fields, reception and limits

Fields retain 12-bit owners and half-pixel heights (0–2047.5) in raw RGBA8, without Canvas2D or premultiplication. Heights use float depth testing; a tiny depth bias allows height-zero receivers to survive the far clear plane without changing their stored height.

The secondary texture uses layout tag 0 for ordinary two-envelope actors and tag 2 for `[second, near-opaque]` gateway bands. With GLB actors, it stores those two light bands followed by shelf-packed, **per-owner** camera tiles. The tag is `10 + lightBandHeight / atlasHeight`; shader lookup uses the encoded ratio for both light bands. Each owner publishes its world camera bounds and normalized tile rectangle through a renderer-local registry. No actor can erase another actor's receiver data or fringe input.

Each tight camera ROI uses a half-world-pixel grid by default, independent of the light angle or terrain field resolution. It moves with the destination frame, allowing translation to reuse the camera bitmap. A memory reserve can coarsen that grid for many actors. Actual mesh camera data uses its own depth target. The complete camera target is color-only: raw bytes are copied once, then the original-alpha fringe fills only missing coverage with depth testing disabled. Fragment heights clamp to the terrain lift, including interpolation roundoff at height zero. This avoids both far-plane floor tears and expensive fragment-depth writes.

Near-opaque coverage is at least 250/255. Each completed camera tile is copied byte-for-byte to the secondary atlas: re-rasterizing geometry into a taller framebuffer can change subpixel edge decisions. Native actor batches keep four reserved field samplers and their existing source-texture batch capacity. Anchor, owner and camera-tile transforms are per-quad vertex attributes, not per-texture uniforms: actors sharing a source atlas retain independent receiver heights. The stock six-word position/UV/color/texture payload is preserved bit-for-bit and extended by twelve float words. Metadata is refreshed before Pixi’s existing vertex upload so cached color quads follow anchor/tile-only updates without extra draws or texture copies. Native receivers reconstruct exact framebuffer pixel coordinates from the active orthographic projection and physical target resolution, rather than interpolating pre-rasterized quad coordinates.

Scenery retains its gateway-only receiver map: an actor's height must not replace the terrain underneath it. Field dimensions respect the actual GPU limit and the profile cap (4096 high / 2048 low), including all atlas bands. Packed fields reduce the logical pixel budget to account for their additional color/depth storage. Statistics report active map storage and geometry bytes separately; these are estimates of those resources, not total browser/GPU memory.

This implementation is for directional sun fields. It does not add point-light shadow maps, arbitrary multilayer transmission or volumetric self-shadowing. A two-owner coincident-silhouette test verifies independent camera heights and upper/lower receiver controls, including 2× → 1× → 2× source resizing and translation without a new pose. The GLB path requires WebGL2, as does the modern Three renderer. Hardware performance, continuous blend/transition coverage and remaining inventory exclusions remain separate acceptance work.

### Verification scope

Stable depth probes exclude the measured raster subpixel uncertainty and possible front-surface boundaries. Partial-alpha comparisons use bilinear bounds over that footprint. Full source-alpha coverage is checked separately. Passing a sampled GPU matrix is not described as an exhaustive test of every real-valued animation time.

### Complete production-source journal and normal transitions

The final source journal contains 24,736 frame/heading cases: every authored key and interval midpoint, eight requested headings, both heroes and 1×/2× producer profiles. Each frame checks 32 distributed vertices plus the strongest-weight vertex for every used joint, deduplicated (56 vertices in these assets). All 12,368 matching low/high pairs have identical pose-matrix SHA-256 and height scales. The journal records original post alpha separately from pose matrices. Independent projected-height and ground/pivot errors remain below 0.000002 world pixels.

A separate normal-update journal exercises mixer fades, run/cast stride phase-lock, procedural arm raising, recovery, hit and death, continuous yaw and day/night tint. It uses the production update path without forced `auditPose` times. The 4,704 requested ticks produce 4,698 source publications and six intentional idle-cache reuses. Source/skin/height checks pass for those publications. These journals do not claim an exhaustive proof over real-valued time or replace the separate GPU cast/receiver controls. The current models each have one skinned mesh, opaque material and no morph primitives or unhandled rigid mesh attachments.

### Final detailed GPU matrix

The final GPU matrix covers 576 poses / 1,728 directional cases: start, midpoint and near-end of every clip, eight headings, two heroes and two field-quality profiles. Each pose independently compares every skinned vertex and projected height against Three (15,268,320 vertex comparisons). CPU triangle rasterization checks camera height and cast coverage on receiver planes 0 and 20; original-alpha coverage, raw camera-atlas byte copies, and high/middle/low native actor receiver controls are checked separately. Every case passes. Maximum camera-height discrepancy is 0.267 world pixels, consistent with half-pixel packing and raster interpolation.

These sampled GPU controls complement the all-authored-key/midpoint source journals. They are not an exhaustive claim over every real-valued animation time or a hardware performance benchmark.
