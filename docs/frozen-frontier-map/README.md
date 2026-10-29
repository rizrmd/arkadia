## Frozen Frontier map placement

The Frozen Frontier dresses the live snow map around the Stronghold: three landmarks joined by worn flagstone
trails, a temple on a half-buried podium, two ruined houses on sunk floors, a walled watchtower yard and groves of
varied density. Knowledge: Environment > Frozen Frontier Ruins > Frozen Frontier Map Placement.

Ruins that sit in the snow (2026-10-24, "the ruin parts look unnatural"): `node scripts/frozen-frontier-map/ground-kit.mjs`
derives a grounded v3 kit from the reviewed v1 art (`public/frozen-frontier/v3`, recipes in its manifest): snow banks
and contact shadows baked at every module's base, one consistent snow cap on every top edge (the v1 cap strips are
retired), sunk floors, flagstone clusters, stone chips, drifts and trampled-snow decals. `layout.mjs` composes the
ruins as buildings (back corners from the walls' clean ends, arches joined to wall remnants, stairs against the
podium and tower, a colonnade on the podium) with rubble, drifts and plants at their feet, and lays trails as
overlapping turned flagstones over trampled snow. `preview.mjs` draws any area offline for composing.
Before/after shots: `ruins-before-*.webp` and `ruins-after-*.webp`.

Pillars and stairs on the 2:1 grid (2026-10-24, "stairs and pillars angle looks off"): the v1 pillars were drawn face-on
and the v1 stairs in perspective, so their edges ran at 14-35° instead of the map's 26.57°. `ground-kit.mjs` now models
`pillar-intact`, `pillar-broken`, `stairs-nw`, `stairs-ne` and the new `column-fallen`/`column-fallen-v` as stone
blocks in true 2:1 isometric (`iso-solid.mjs`: map-space boxes projected like the map, z-buffered, the v1 pillar's
stone on their faces, lit like the walls), then grounds them like every other module. `stairs-nw` climbs -u onto the
temple podium's +u edge, as high as its lift (25.3 px); `stairs-ne` climbs -v to the watchtower door's sill (46 px);
`layout.mjs` places both flush from those edges (`flightAt`), and the shrine forecourt lies square before the
shrine's steps. `angle-check.mjs` measures the stone edges of the kit's uprights against the grid and fails if a
2:1 piece drifts (`angle-check.json`/`.webp`; `angle-check-before.*` is the old kit, which fails). Shots:
`angles-{before,after,compare}-{desktop,portrait,landscape,closeup}-{pillar-courtyard,watchtower,snowy-shrine}.webp`.

- Data: `src/world/maps/frozen-frontier.json` (kit layers, draw bands and solid footprints; 509 placements in map
  tiles, each optionally sized, mirrored `f` or, for ground decals, turned `r`), written by
  `node scripts/frozen-frontier-map/layout.mjs`, which rejects props on raised terrain, behind the hills or court
  sprites, on paths, in the combat clearing before the gate, or overlapping each other.
- Art: `node scripts/frozen-frontier-map/build-assets.mjs` trims and resizes the reviewed PNGs (v1, v2 and the grounded
  v3 kit, which replaces v1 exports by id) and packs all 41 into one 2048 px WebP atlas (1.1 MB) at 2.35 px per world
  px, with `src/world/maps/frozen-frontier-sprites.json`.
- Rendering: `src/stronghold/frontier-view.ts` (GPU sprites from the atlas, ground and depth-sorted layers batched
  with their neighbours, camera culling, ambient tint; the atlas is fetched once play starts, after the loading screen). Occlusion and collision join the hero's scene (`hero.ts`, now
  bucketed by screen x).
- Collision: `src/world/frontier.ts` turns footprints into 4 px columns; the co-op prediction adds them to
  `nav.json`'s, and `server/internal/sim/frontier.go` builds the same columns from a byte-identical copy
  (`go test ./internal/sim -run Frontier`: copy, browser parity, off-relief, solid/paths/spawn arc/gate passage).
  A mirrored placement swaps its footprint's u and v offsets, the same rule on both sides.
- QA: `node scripts/frozen-frontier-map/verify.mjs` (screenshots, keyboard walks, page errors, parity export;
  `BASE_URL=https://ark-whachat.fural.space` for live), `bench.mjs` (frame cost and draw calls, before/after),
  `plan.mjs` (placement map), `usage.mjs` (usage tables), `calibrate.mjs` (footprint calibration sheet),
  `angle-check.mjs` (edge angles of the kit's uprights against the 2:1 grid; exit 1 on drift).
