## Low stone-cluster companion

The map registered `rock-scatter` as flat ground dressing. Its 23 unrotated geometry variants had no directional cast and zero-height reception; a 327° placement was omitted from the shadow surface registry entirely. The source depicts raised stones, so that exclusion was incomplete.

All 24 placements now retain their ground painter band while using a capped camera-ray volume. The hand-authored cap is 0.35 logical frame height (6.538 world pixels at scale 1), with front/back support derived from original-alpha column support. It is an approximate cluster envelope, not measured geometry for individual stones. No RGB value supplies height. A paired-canvas recolor control retains exactly the same sampled geometry with identical alpha; both sides use the same canvas conversion to avoid comparing image/canvas resampling paths.

For a local source point `(lx, ly)`, source-camera rotation follows the production color transform: `x = cos(r) lx − 2 sin(r) ly`, `screenY = 0.5 sin(r) lx + cos(r) ly`. Physical height is applied once after this transform: `worldY = screenY + z`. Mirroring precedes the transform, and lift shifts the screen pivot while adding base height. The unrotated sampling path retains its previous arithmetic.

- All 24 actual placements match their production Pixi sprite transforms at 81 source coordinates each, plus 200 independent mirror/scale/lift/quarter-turn/arbitrary-angle controls: 2,144 checks.
- All 24 focused GPU variants pass three-sun cast and independent high/low receiver controls (72 cases).
- Full static regression: 314 variants / 942 sun cases / 942 actual receiver controls; zero failures. The existing 296 upright receiver records retain production painter order.
- All 290 non-rock variants retain identical corresponding picture pixels: 57,016,320 comparisons, zero RGB or alpha changes.
- Source atlas, map/catalog, prefab, frontend collision builder and server frontier collision are byte-identical to `78d5155e`; the eight previous solid companion models are unchanged.
- Four focused visual plates cover every changed/new variant, including the rotated placement. Original-alpha openings and edge softness remain; no new texture sampler or object filter was added.

The Canvas fallback still lacks depth-based object receiving and this new low-volume path. Hardware performance and the independent brazier flame/metal material mask remain separate open acceptance items. The static software-GPU tests are not physical-device FPS certification.
