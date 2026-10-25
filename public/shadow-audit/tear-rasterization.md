## Torn-shadow rasterization correction

The player reported repeated missing patches and a dotted lattice in otherwise solid platform, wall and arch shadows. The light-space field projected only pixel-centre samples into fixed 2×2 texel splats. That coverage was not guaranteed when the support profile, shear or sun stretched a source cell. The receiver height map used the same point approximation.

Each sampled source cell now carries all four geometry corners. Two triangles cover its projected footprint, interpolate height, and retain the source cell's original alpha. The receiver-height map rasterizes the same geometry in screen projection. Conservative pixel-edge tests close sampling gaps without flood-fill or brightness-derived heights; actual transparent arch openings remain open. A scanline half-plane rasterizer avoids scanning the large empty bounding boxes of thin oblique triangles. Empty packed-map cells no longer allocate temporary encoding arrays.

## Evidence

- Field regression: **47,683 checks pass**. The old point-splat control leaves **5,774 interior holes** in the oblique support-plane fixture; the triangle mesh leaves **zero** across 12 sun vectors. The real alpha-aperture check remains open. Instance/height/coverage packing and the 4096 texture-dimension bound are checked.
- Actual GPU readback fixture passes raised and ground receivers, alpha holes, mirrored holes, rejection of a caster below the receiver, and native actor-batch receiving.
- Desktop visual checks completed at the temple podium (afternoon), the ruined gateway (morning and afternoon), and the settlement enclosure beside the podium (afternoon), with no recorded page/console errors. The reported dotted/tearing pattern is absent in the corrected captures.
- TypeScript passes. Original sprites/atlas alpha, collision, authored map geometry and pillar/stair assets are unchanged.

Performance remains under investigation: the captured environment uses SwiftShader and is not hardware desktop/mobile proof. This correction resolves the reported sampling tears; it does not claim the entire broader shadow task is finished.
