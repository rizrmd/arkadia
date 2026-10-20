## Intent and reference diagnosis

Planning deliverable; no runtime changes are included. The human screenshot shows a maintained winter fortress, with warm paving inside and snow outside. Preserve that identity: weathered foundations, not an abandoned green ruin.

The reference already contains small moss patches. The missing element is continuity between each foundation and its surroundings. Current `terrain.ts` places isolated weeds-edge/paving-worn decals at fixed courtyard positions. Active `world-view.ts` draws a regular paving polygon, a uniform baked perimeter shadow, then ground/backdrop/world/foreground sprites. Existing ramparts already include some painted moss. Increasing scattered grass alone would leave the contact seams unresolved.

## Recommended visual treatment

Use a narrow, irregular foundation transition with three layers:

1. **Contact and soil:** a restrained dark crevice immediately against masonry, feathering into damp brown-grey dirt and fine grit. Follow actual visible foundation edges; avoid circular halos around whole sprites.
2. **Moss and sparse winter weeds:** muted olive moss following lower masonry joints, thicker at corners and sheltered recesses. Add occasional short straw/olive tufts. Keep most of the stone visible; avoid continuous green borders.
3. **Snow transition outside:** broken snow tongues and granular slush against exterior foundations, with exposed damp soil between them. Keep courtyard snow limited to small sheltered pockets. The gate approach remains visibly worn and clear.

Starting art targets, subject to screenshot review: soil extends roughly 0.1–0.3 ground tiles; moss usually stays within the lowest 5–12% of visible wall height. Cover about 20–35% of eligible sheltered edge length with vegetation, with substantial gaps. These are tuning ranges, not measured acceptance claims.

| Location | Treatment |
| --- | --- |
| Inner ramparts and bastions | Intermittent damp soil, moss joints, sparse weeds concentrated at corners |
| Outer walls | Uneven snow/slush shoulders, darker exposed soil, very little living grass |
| Forge | Dry grit, soot and worn approach; reduce vegetation near heat and entrance |
| Barracks and gateway | Compacted dirt at traffic routes; moss beside steps, never across thresholds |
| Mage tower and altar | Restrained moss at shaded stone bases; preserve steps and decorative geometry |
| Mine | Stone fragments and muddy grit merging into existing rocks |
| Expedition table | Small contact shadow and trampled ground; no wall-like moss band |

## Asset strategy

First prototype using existing `weeds-edge`, `paving-worn`, and `snowdrift-edge` at smaller, varied sizes with deterministic placement. They are reusable but broad; they do not provide a fitted climbing-moss edge. New generation is deferred until the contact-edge prototype establishes dimensions and masks, avoiding speculative art that cannot fit foundations.

If that prototype still exposes seams, generate a small transparent RGBA kit:

- Three irregular dirt/grit ground strips, with sparse pebbles and feathered alpha.
- Three low moss/weed clusters for ground corners, without baked paving.
- Two separately authored climbing-moss strips for the NE and SE visible wall faces, with broken height and clean alpha. Do not mirror directional lighting.
- Two snow/slush ground shoulders only if the existing drift cannot fit.

Use the inspected reference and existing assets as image references: detailed hand-painted medieval strategy art, 2:1 ground projection, warm limestone, desaturated winter olive/brown palette, restrained diffuse upper-left lighting, transparent background, no text, no complete buildings, no rectangular backing or strong baked cast shadows. Preserve originals, prompts, alpha and trimmed runtime variants. Inspect dark/light backgrounds for matte halos. No new image is necessary to communicate this plan.

## Implementation sequence

1. Define foundation-edge metadata independently from sprite bounding boxes. In `scene.ts`, existing `groundEdges` are calibration landmarks, not complete footprints; measure visible base polylines, entrances and corners for all buildings, wall segments, bastions and gate.
2. Add an isolated foundation-transition module with seeded placement derived from stable object IDs and edge coordinates. Place ground decals under the relevant structures; fit face moss to each calibrated wall plane. Avoid roof pixels, stairs, doors and foreground silhouettes.
3. Extend the baked settlement in `world-view.ts`: ground material → soil/contact underlay → existing ground details → depth-sorted structures and attached face overlays. Attach face overlays to their owner in the draw sequence so they cannot appear in front of unrelated nearer objects. Use local masks near the paving/snow boundary; do not soften the entire courtyard into a blurry diamond.
4. Bake static details with the existing surface cache. Rebuild only when assets or building state changes; no randomization, image decoding, filters or placement work during pan/zoom. Keep decorative details out of selection hit masks and collision logic.
5. Review one rear corner, forge base and front gateway before applying globally. Tune density and edge widths at mobile scale. Generate only missing fitted sprites after this review, then integrate and document them.
6. Coordinate with the separate lighting task: retain only tight contact darkening here, let lighting own directional cast shadows and time-of-day tint. Check transitions under both warm daylight and blue night lighting.

## Verification and acceptance

Implementation must pass the production build and existing Stronghold checks, then be visually reviewed at 390×844, 1536×1024 and 2560×1080, default view and zoomed-in view. Capture matching before/after views of the rear corner, forge, mine and gateway.

- Foundations connect to the ground without floating seams, broad dark halos or obvious repeating decal stamps.
- Vegetation follows visible base edges and wall joints; no moss floats over roofs, doors, stairs or front objects.
- Exterior snow blends irregularly; courtyard remains predominantly paving and the gate traffic route stays clear.
- No alpha fringes, stretched grass or mismatched projection; reload produces identical placement.
- Pan/zoom remains transform-only; compare frame timing and baked-surface memory against the same-device baseline before accepting additional texture cost.
- Building selection and upgrades still work; all forge states retain aligned foundation details.
- Day/night checks confirm that contact shadows do not double the lighting task's cast shadows.

## Human reference

![Human screenshot showing plain foundation transitions](/api/organizations/ORd5dd6f99b4308d6187031557/task-attachments/TA29ffc978bb9457f37f0fb1d5)
