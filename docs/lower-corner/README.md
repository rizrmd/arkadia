## Lower ruin corner correction

The reported screenshot is the east settlement house's south wall corner, not the HUD frame. The south corner has been regenerated with built-in image_gen, retaining the kit's snowy limestone, lichen and upper-left light. The left plane is calibrated during export about the central vertical arris: baseline slopes +0.5000 and -0.5050 against the floor's ±0.5. Vertical masonry stays upright. Its pivot preserves the join to the arch. The snow bank is part of the generated asset, so it is not grounded a second time.

Source: assets-src/frozen-frontier/v4/corner-s.png. Export: public/frozen-frontier/v3/assets/corner-s.png. Rebuild with build-lower-corner.mjs then build-assets.mjs; the full ground-kit.mjs rebuild also reapplies this override. No runtime transform or extra draw call is needed.

Prompt (built-in image_gen, reference: previous v3 corner-s): Regenerate the same south/front convex L-shaped snowy ruined stone wall with 2:1 dimetric projection; perpendicular equal arms extend toward upper left/right from a central vertical corner; baseline and mortar courses follow ±26.565 degrees; preserve weathered limestone, ochre lichen, broken crenellations, blue-white snow caps and upper-left light; transparent background; no floor, arch, people, text, or extra props. Keep vertical edges upright and flat arm ends for modular joins.

Validation: TypeScript passed; atlas identity, packed frames and existing doorway baseline checks passed; local game loaded the new hashed atlas with all 43 occlusion masks and no page errors. An existing character shader compilation warning appeared identically before and after the corner change.
