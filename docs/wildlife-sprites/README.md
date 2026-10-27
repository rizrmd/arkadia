## Wildlife PNG sprite release

Exactly two current huntable species were found by auditing `WILDLIFE_RULES`, the gathering renderer, scene placement and existing motion-preview assets: deer and crocodile. Enemies are separate combat actors, not wildlife. No species or gameplay rules were added.

Built-in imagegen created both transparent source sheets from the inspected approved concept DA4064125914dcacd356bd431c. Originals and prompt specification are under `assets-src/wildlife`. Paint, spotted brown/ivory deer, olive crocodile, lighting and elevated orthographic facing follow that reference. Generated gait poses have minor silhouette variation; physical inverse kinematics is not claimed.

`node scripts/wildlife-sprites/pack.mjs` reproducibly packs the sheets into `public/wildlife/imagegen-atlas.png`: 2048×1024 RGBA, four rows of eight 256×256 frames. Rows are deer walk/run and crocodile crawl/swim; durations remain 1600/800/2400/2000ms. Species retain constant scale and normalized .5/.82 pivots. Existing game facing and clip selection are preserved. No roaming, retaliation, HP or death clip was introduced; existing hunting transitions directly into meat loot.

The production renderer loads PNG directly. Obsolete game-only meshes, Three runtime, model baker and model-derived atlas were retired. The old standalone `/wildlife-motion` review remains historical material, outside the gameplay renderer. Existing deploy scripts stage the new PNG so later releases cannot omit it.

Gameplay code remains unchanged apart from texture/frame selection. Automatic proximity melee, Food 100/500 only after collection, 1/3-day respawn, simulation clock, Axe/tree rules, loot and save behavior pass the existing regression suites.

## Verification

- TypeScript check; eight gathering rules scenarios.
- Actual Pixi controller: chopping, range, Axe, interruptions, both species, exactly-once loot/reload, simulation-day respawn, storage rollback; three viewport layouts.
- Full local game: real scene/collision/save harvest, reload and genuine automatic melee deer hunt.
- `node scripts/wildlife-sprites/verify.mjs`: 32 distinct transparent frames, safe frame bounds/pivots, all four clips in actual Pixi, eight distinct rendered poses, zero browser errors.
- Release uses the supported additive publisher and existing `arkodia-deploy.lock`; published release ancestry guard protects prior gameplay. Existing maps, saves and peer routes are retained.

See `atlas.json`, `verification.json`, `controller-results.json`, `local-smoke.json` and `deployment.json` for evidence.

Live production smoke passed with zero page errors, real automatic deer melee hunting, harvest/save/reload, and three viewport captures. The live audit passed 47 checks: matching build/manifest, exact JS/CSS hashes, all visible RGBA and alpha values equal to the source PNG, and retained Environment Editor, FX Lab and world-concept routes. The existing server transcodes PNG responses to lossless WebP; PNG originals remain the production source and alpha/visible pixels are exact.
