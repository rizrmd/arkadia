## Deliverables

Frozen Frontier Ruins concept sheet and initial 15-sprite transparent kit, generated with the built-in image_gen tool. Review gallery: https://ark-whachat.fural.space/frozen-frontier/v1/

The kit contains NE/SE ruined walls, two L corners, NE/SE broken arches, intact/broken pillars, NE/NW stairs, foundation, paving, rubble and NE/SE detachable snow caps. Source PNGs are preserved in `assets-src/frozen-frontier/v1/`; individual exports and pivot/scale metadata are in `public/frozen-frontier/v1/`. Two rejected snow-cap candidates are retained for provenance; final caps contain snow only.

## Audit and art direction

Read the Environment parent, Court & Snow Corner Assets and Technical Handoff & Future Areas Knowledge pages before generation. Examined the existing stronghold screenshot and `assets-src/modular-stronghold-v2/wall-broken.png`. `src/isometric.ts` specifies 2:1 dimetric axes at ±0.5 (not 30-degree isometric), 64/32 pixel half-axes. The prefab defines a 3 m tile. Existing hero display uses 0.66 × an approximately 101 px foot pivot, giving an approximately 67 px human height.

Match weathered grey/beige limestone, ivory snow, muted blue shadows, sparse ochre lichen and soft upper-left light. Variant sprites were generated independently, without mirroring light. `prompts.json` preserves the actual generation prompts; snow-cap corrective edits removed the stone wall from each candidate and kept only the floating snow strip.

## Placement contract

`manifest.json` records each sprite's cropped dimensions, source crop, footprint pivot in export pixels, recommended display scale and intended physical dimensions. Draw at `position - pivot * scale`. A snow cap uses its center as an attachment pivot, positioned on a wall ledge rather than on the ground. The gallery uses actual exported sprites for the courtyard assembly and shows cyan pivot crosses.

Dimensions are initial design targets. Generated painted shapes have perspective and proportion variation; modular joins, exact physical scale, collision polygons and occlusion require calibration in the later placement phase. Paving/foundation are 6 m review footprints, after fitting the existing 128 × 64 tile convention. No gameplay placements or preload imports were added.

## Validation and release

Run `node scripts/build-frozen-frontier.mjs`, then `node scripts/verify-frozen-frontier.mjs`. Validation checks real transparency, solid pixels, pivots within bounds, all 15 browser images, zero page errors, the pivot toggle and a 390 px mobile layout without horizontal overflow. Browser screenshots provide the assembled and checkerboard kit previews.

Ship only the prefixed review layer using `fural-agent repos ship RPe11327fbfe413dbeba246526 --mode script --script scripts/ship-frozen-frontier.sh`. This preserves the latest combined game and deployed gateway, including peer memory fixes, and does not rebuild peer work in progress. The prefixed review layer persists alongside later full game releases.
