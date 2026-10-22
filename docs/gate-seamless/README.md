## Gateway, piers and wall integration

The latest acceptance criteria require connecting pillars on both sides, continuous wall/gate foundations and joins, warm matching stone and consistent apparent texture sharpness. The earlier snowy blue gate looked separate from the beige walls; matching the material alone still left different raster densities.

Two plain coping piers now bridge the junctions at world x=445/709, y=769. Their warm beige stone, stepped mossy footings and coarse texture follow the existing ramparts. The terminal wings seat inside and behind the gate towers. The pillars render through the same cached upright, lighting, shadow and foundation pipeline as the walls. Their physical footprints are exported to both client and server navigation.

The animated gate now uses the world's backing density, approximately 1.37 pixels per world unit, rather than its source frame's 768/270 = 2.84. Both the source and shaded canvases share the smaller backing dimensions; picking and torch drawing account for that scale. Door sheet source detail remains intact, and panning still changes only compositor transforms. This corrects the over-sharp overlay rather than applying a camera-dependent blur.

### Sources and generation

Built-in image tool; material target is the existing closed gate and style reference is the actual rampart sprite. Prompt: preserve gate geometry and unlit fixtures, match the wall's warm beige limestone, cream top faces, muted olive moss, soft coarse painted texture and low contrast; no blue cast or snow. Rebuild the registered material pass with `node scripts/pack-seamless-gateway.mjs`.

Connecting pillar prompt: one isolated narrow square castle pier, plain overhanging coping and stepped splayed foot; five or six warm grey beige block courses, soft grey brown side shadows, muted olive moss; same material and coarse painted detail as the wall; elevated 2:1 dimetric camera, vertical edges; transparent background, no banners, flames or snow. The generated alpha is preserved, transparent margins trimmed and the source packed to 140×360 with `node scripts/pack-gate-connector.mjs`.

### Verification

`npm run build`, `node scripts/verify-seamless-gateway.mjs`, `node scripts/verify-gate-joins.mjs` (normal and PIXEL_RATIO=2 close captures), existing two-way traversal/collision tests and 390×844 mobile playback checks at 4× CPU slowdown passed. The latter reports p95 66.8 ms, max 83.3 ms, no browser errors, mid-animation reversal and no world/light/shadow rebuilds. All 16 source poses are distinct and stationary stonework remains identical. Density assertions compare actual gate and wall canvas backing dimensions, with under 0.005 pixels/world-unit tolerance. Navigation is regenerated via `node scripts/export-coop-nav.mjs`.
