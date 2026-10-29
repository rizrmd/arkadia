## Walls panels through level 30

Generated bitmap portrait composed with the shared Core v2 bitmap kit in Pixi. Read-only Farm scope; no build transactions or save writes. Target X requires only completed Core >= X. Costs remain direct-baseline 25 Gold, 30 Wood, 1 minute with 1.25 resource and 1.20 duration growth.

Run `npx tsc --noEmit`, `node scripts/walls-panels/test.mjs`, and `node scripts/walls-panels/browser.mjs`. Browser captures cover all 30 targets, exact text, visible glyph row centers, mobile pointer opening and all registered external badge suppression/restoration. Deployment uses `scripts/walls-panels/deploy.sh`, live ancestry guard and the shared Arkodia lock.

Original imagegen prompt and SHA-256 are in `public/walls-panels/kit/manifest.json`; original RGBA PNG and manifest are archived in `source-kit.zip`. All shared decorative components retain Core provenance. World wall/gate sprites, collisions, economy, save schema and maps are unchanged.

All six native modules pass the shared modal lifecycle suite. The bounded full-world attempt reached 97% Preparing visibility with no page errors; it did not complete within 60 seconds. This is recorded in world-browser.json and is not represented as a successful full-world gameplay check. Native Pixi rendering, pointer interactions and compiled/public integration are the alternate checks.

Live cumulative release: `7b6c3851cde1cb8531ad419e2d469c14eb3537c5`. All 37 public Walls artifact checks pass; compiled game chunk includes six panel hooks and matches the manifest hash. Transport reset during first publish was recovered by resuming the same archive under lock.
