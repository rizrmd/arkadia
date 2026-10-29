## Starting campfire spawn

The approved raster campfire replaces the level-1 Stronghold Core artwork in the persisted `expedition` slot. Levels 2–30 retain the established Core artwork/repair progression. No save schema, resources, timers, building unlocks, hero position, published map, or economy values change. Existing level-1 saves receive the same starter landmark without resetting their progress.

Original built-in imagegen RGBA: `public/buildings/starting-campfire/campfire-v1.png` (1774 × 887). Source pivot (887, 545) lands at court center (577, 320); display width 320. Hero initial/respawn remains (590, 420), clear of fire and gate route. The hot stone ring alone blocks movement (27 columns); the snowy ground decal and smoke do not. Server/client co-op navigation copies match; all other columns are retained. Fire has an emissive mask and warm ground pool. The ground decal does not cast an upright depth shadow.

Generate prompt and concept/source links: `knowledge.md`. `verify.mjs` checks a fresh start and saved Core level 12, actual keyboard walking, spawn/gate clearance, artwork loading, and retained progression. `validation.json` records results; PNGs show spawn and after walking. The screenshot font wait is disabled because paused test clocks prevent its completion.

Deployment: `bash scripts/starting-campfire/deploy.sh` from a clean committed release worktree. It takes the existing shared deployment lock, checks production ancestry, runs TypeScript/server tests, builds the cumulative client/editor/server, and publishes a normal release layer. The existing gateway preserves `GAME_SAVE_DIR=$HOME/game-saves` and authored map revisions. Runtime asset/bundle hashes are published at `/starting-campfire/release.json`.
