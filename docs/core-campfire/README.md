## Approved level-1 Core integration

The existing starting campfire is the single Stronghold Core at level 1. Gameplay, alpha hit testing, camera focus and the Pixi environment editor share its 320 px width and stone-ring pivot (887,545) on the unchanged 1774 × 887 original asset. The persisted building ID remains `expedition`; completed Core levels remain in `strongholdCore.completedLevel`. No save migration, economy change, court expansion or new mechanic is included.

The asset manifest and English Pixi review map level 1 to `/buildings/starting-campfire/campfire-v1.png`. Levels 2–30, including the previous monument used by levels 2–4, retain their exact original composition and repair decals. Historical level-01 artwork remains available for those compositions. The 6 × 6 m future reservation remains documented; the currently released campfire hot-ring collision and safe spawn are unchanged.

Checks: TypeScript; all 29 higher-level compositions compared against the prior release; fresh/legacy save round trips at missing, 1, 2, 4, 12 and 30 completed levels; existing faction building-tree regression suite. The first local browser attempt loaded the correct campfire but timed out at 98% GPU preparation with no page errors; this is not counted as loaded gameplay acceptance. Production browser and release checks are recorded separately.

## Release evidence — 29 October 2026

Implementation commit `e33a75701e2d74f3d3b25b342f4d91046d479b66` was pushed to `feat/stronghold` and published as `1793254997987-core-campfire-e33a7570-9bd14cdf2e94` through the existing release-layer publisher under `arkodia-deploy.lock`. Production health identifies this exact build; 67 game/editor/review files matched the release receipt SHA-256 values. TypeScript and Go tests/build passed in the release process.

Production Chromium verified the English Pixi review at levels 1, 2 and 30: level 1 uses the original campfire with pivot (887,545), level 2 retains the previous monument and one repair plate. The native Pixi editor loaded the campfire without requesting the old Core monument. Fresh gameplay requested only the campfire and exposed a single `expedition` Core plus `gate` in navigation. No page errors were observed.

Full gameplay loading/movement was **not** accepted in this session: two bounded local attempts stalled at 97–98% preparation, and the bounded production attempt remained at 95% world drawing. Save round trips and all higher-level composition comparisons passed independently. No production save or published map was modified by verification. No new screenshot was attached to chat, so no additional inline Knowledge image was needed; the approved source images remain in both Knowledge pages.

See `release.json` for byte hashes and `production.json` for actual browser observations, including the explicit gameplay limitation. The failed local attempt is retained in `validation.json`.
