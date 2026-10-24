## Frozen Frontier map placement

Every Frozen Frontier sprite (v1 ruins kit, 15; v2 landmarks and winter plants, 14) stands on the live snow map
around the Stronghold: three landmarks joined by flagstone paths, a pillar courtyard, two ruined houses, a watch
outpost and groves of varied density. Knowledge: Environment > Frozen Frontier Ruins > Frozen Frontier Map Placement.

- Data: `src/world/maps/frozen-frontier.json` (kit layers and solid footprints, 249 placements in map tiles), written by
  `node scripts/frozen-frontier-map/layout.mjs`, which rejects props on raised terrain, behind the hills or court
  sprites, on paths, in the combat clearing before the gate, or overlapping each other.
- Art: `node scripts/frozen-frontier-map/build-assets.mjs` trims and resizes the reviewed PNGs (26.7 MB) and packs
  all 29 into one 2048 px WebP atlas (1.2 MB) at 2.5 px per world px, with `src/world/maps/frozen-frontier-sprites.json`.
- Rendering: `src/stronghold/frontier-view.ts` (GPU sprites from the atlas, ground and depth-sorted layers batched
  with their neighbours, camera culling, ambient tint; the atlas is fetched once play starts, after the loading screen). Occlusion and collision join the hero's scene (`hero.ts`, now
  bucketed by screen x).
- Collision: `src/world/frontier.ts` turns footprints into 4 px columns; the co-op prediction adds them to
  `nav.json`'s, and `server/internal/sim/frontier.go` builds the same columns from a byte-identical copy
  (`go test ./internal/sim -run Frontier`: copy, browser parity, off-relief, solid/paths/spawn arc/gate passage).
- QA: `node scripts/frozen-frontier-map/verify.mjs` (screenshots, keyboard walks, page errors, parity export;
  `BASE_URL=https://ark-whachat.fural.space` for live), `bench.mjs` (frame cost and draw calls, before/after),
  `plan.mjs` (placement map), `usage.mjs` (usage tables), `calibrate.mjs` (footprint calibration sheet).
