## Gateway, piers and wall integration

The latest acceptance criteria require connecting pillars on both sides, continuous wall/gate foundations and joins, warm matching stone and consistent apparent texture sharpness. The earlier snowy blue gate looked separate from the beige walls; matching the material alone still left different raster densities.

Two plain coping piers now bridge the junctions at world x=445/709, y=769. Their warm beige stone, stepped mossy footings and coarse texture follow the existing ramparts. The terminal wings seat inside and behind the gate towers. The pillars render through the same cached upright, lighting, shadow and foundation pipeline as the walls. Their physical footprints are exported to both client and server navigation.

The animated gate now uses the world's backing density, approximately 1.37 pixels per world unit, rather than its source frame's 768/270 = 2.84. Both the source and shaded canvases share the smaller backing dimensions; picking and torch drawing account for that scale. Door sheet source detail remains intact, and panning still changes only compositor transforms. This corrects the over-sharp overlay rather than applying a camera-dependent blur.

### Sources and generation

Built-in image tool; material target is the existing closed gate and style reference is the actual rampart sprite. Prompt: preserve gate geometry and unlit fixtures, match the wall's warm beige limestone, cream top faces, muted olive moss, soft coarse painted texture and low contrast; no blue cast or snow. Rebuild the registered material pass with `node scripts/pack-seamless-gateway.mjs`.

Connecting pillar prompt: one isolated narrow square castle pier, plain overhanging coping and stepped splayed foot; five or six warm grey beige block courses, soft grey brown side shadows, muted olive moss; same material and coarse painted detail as the wall; elevated 2:1 dimetric camera, vertical edges; transparent background, no banners, flames or snow. The generated alpha is preserved, transparent margins trimmed and the source packed to 140×360 with `node scripts/pack-gate-connector.mjs`.

### Verification

`npm run build`, `node scripts/verify-seamless-gateway.mjs`, `node scripts/verify-gate-joins.mjs` (normal and PIXEL_RATIO=2 close captures), existing two-way traversal/collision tests and 390×844 mobile playback checks at 4× CPU slowdown passed. The latter reports p95 66.8 ms, max 83.3 ms, no browser errors, mid-animation reversal and no world/light/shadow rebuilds. All 16 source poses are distinct and stationary stonework remains identical. Density assertions compare actual gate and wall canvas backing dimensions, with under 0.005 pixels/world-unit tolerance. Navigation is regenerated via `node scripts/export-coop-nav.mjs`.

### Final shared plinth and alignment correction

The standalone pier was replaced by an attached pilaster with an inward foundation shoe, packed by `scripts/pack-shared-plinth.mjs`. Both inward shoes overlap the gate tower foundations. The shared world snow/apron replaces the former separate baked ground patch; gate and connectors now use the same soil intensity, snow frequency and contour fade. The apron's transition is wider and irregular rather than exposing a paving diamond.

The two main banner towers, arch and doors move 8 world px down together (gate pivot y=798, doorway proximity y=778). Solo and co-op tower/door footprints, client prediction, safe-zone/spawn origin, occlusion order and light sampling follow that placement. The connecting pilasters stay at their wall junctions.

Source-generated limestone was too bright even after the warm material pass. `gateway-palette.mjs` calibrates neutral stone midtones against a representative front-wall masonry sample while preserving coping highlights and avoiding blue cloth, oak and dark joints. Final RGB sample means are wall 135.84/114.41/93.67, gate 140.07/117.72/95.45 and pillar 139.86/117.64/95.42; each channel is within 5% of the reference wall. This is a defined material sample check, not a claim that every lit face has identical color. v7 gate and v3 pier URLs avoid stale caches.

The final 4× mobile check reports p95 50 ms and maximum 83.3 ms, zero errors, reversal passed and unchanged world/light/shadow counters. Both directions through the lowered doorway and tower collision passed, with the hero stopped at the new tower front y=807 in the side-collision scenario.

### Weathered sub-pillar calibration and borderless pillar join

Two visual seams remained at the main-tower/pilaster junction:
1. **Light border along the main-pillar/sub-pillar boundary:** The standalone gate tower texture retained a bright outer-corner rim highlight and top-lit outer plinth steps where it overlapped the sub-pillar, and `shadeSprite` in `src/stronghold/lighting.ts` multiplied an opaque daylight lightmap against semi-transparent edge pixels (`(1 - α) * C_lightmap` white bleed). `shadeSprite` now backs semi-transparent edge pixels with dark mortar (`#4a3f33`) before `multiply` and restores exact alpha via `destination-in`, and `scripts/pack-seamless-gateway.mjs` suppresses outer-edge rim highlights while cross-fading the outer tower/plinth boundary directly into the world-aligned sub-pillar masonry across all 16 frames.
2. **Sub-pillar brightness and saturation:** `scripts/pack-shared-plinth.mjs` now weathers and desaturates the left and right pilasters (`gate-connector-left-v3.png` and `gate-connector-right-v3.png`) to a dull ash-limestone tone (`meanRGB` 110.06/94.03/75.74 vs adjacent outer tower wall 103.80/87.32/71.42), adds contact ambient occlusion in the re-entrant corner against the main tower, and shifts the base moss to deep weathered olive.

### Seamless Flush Gate-to-Wall Rampart Connection (v2 Concept)

Based on the approved v2 concept (`gate-wall-seamless-v2.jpg`), the protruding intermediate buttresses, end-pillars, and flat-capped side connector pilasters (`gate-connector-left-v3`, `gate-connector-right-v3`) have been eliminated so the diagonal crenellated perimeter walls connect directly and flush into the left and right gatehouse towers:

1. **Buttress-free, phase-locked diagonal ramparts (`scripts/pack-shared-plinth.mjs`):**
   - Rebuilt `public/modular-stronghold/v2/rampart-se.png` and `public/modular-stronghold/v2/rampart-ne.png` (`1200 × 960`) from the clean crenellated masonry span of the v2 rampart source without protruding intermediate buttresses or end-pillars.
   - Locked the two-bay merlon/crenel period to `Px = 1200 * 80 / 356 = 269.6629` source px (`80` world px = `2` bays) and source slope `m = 0.4700` (world slope `0.47 + 0.03 = 0.5000`), so adjacent perimeter wall segments (`320` world px = `8` bays and `240` world px = `6` bays) overlap with zero vertical step and exact course/merlon phase continuity.
2. **Collinear perimeter placement without connector pilasters (`src/stronghold/terrain.ts`, `src/stronghold/foundations.ts`):**
   - Removed the two `gate-connector` sprites and the previous `±16, -8` world-pixel offset on the terminal wall wings (`n === 10`), placing the terminal wings on the exact `v = 15.5` and `u = 15.5` perimeter lines (`u = 11.25, v = 15.5` on the left; `u = 15.5, v = 11.25` on the right) with symmetric `--foot:70%;--wall-shear:±.03;`.
   - Removed duplicate soil/moss foundation decals under `rampart-*` so the painted mossy base plinths sit cleanly in the snow with a soft perimeter shadow.
3. **Direct flush wall-to-tower masonry weld (`scripts/pack-seamless-gateway.mjs`):**
   - Replaced sub-pillar sampling with world-aligned sampling of `rampart-se.png` and `rampart-ne.png`, trimmed the freestanding second outer plinth protrusion (`gx < 35.5` on the left, `gx > 732.5` on the right), and preserved the overhanging upper tower corbels (`gy < 138`) and all 16 animated door poses (`stonePixelChanges: 0`, `distinctDoorPoses: 16`).
   - Preserved all four iron torch sconces (two on the gate towers and two on the left/right diagonal walls) in both daylight and night lighting.
