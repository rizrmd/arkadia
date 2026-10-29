## Rift Bolt level animation player

Live: https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/

```html
<iframe src="https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/" title="Rift Bolt Level 1–5 Animation Player" height="560"></iframe>
```

The responsive English player provides levels 1–5, Play/Pause, Replay, Loop, a progress bar and day/night backdrops. Query parameters: `level=1..5`, `loop=0|1`, `autoplay=0|1`. The sequence is 2.6 seconds: casting wind-up to 0.42 s, travel for 5.2 / 7.5 seconds, then impact and dissipating particles. The longer review timeline separates phases; it is not a combat cooldown change.

### Approved visual progression

| Level | Primary targets | Projectile / impact size | Cast area | On-hit behavior |
| --- | --- | --- | --- | --- |
| 1 | 1 | 1.00× / 1.00× | 1.00× | Focused impact |
| 2 | 1 | 1.22× / 1.30× | 1.18× | Stronger focused impact |
| 3 | 1 | 1.48× / 1.65× | 1.36× | On-hit AoE blast around the primary target |
| 4 | 2 | 1.48× / 1.65× | 1.54× | Twin volley with on-hit AoE |
| 5 | 3 | 1.60× / 1.80× | 1.72× | Triad volley with on-hit AoE |

This is the human-corrected animation specification: levels 1–3 keep one primary target and one projectile; level 3 adds area damage on impact, not more aimed targets. Additional targets start at level 4 (two), then level 5 (three). Levels 1–3 progress through a larger cast ring, thicker projectile and stronger impact. Lv. 3–5 also trigger the existing `rift-bolt.impact.ground` shockwave/crater effect at the impact point. It never appears before a hit. Levels 1–2 have no AoE ground blast.

The preview uses angles 0 rad for levels 1–3, −0.12/+0.12 rad for level 4 and −0.22/0/+0.22 rad for level 5. These supersede the earlier 1/2/3/3/3 preview progression. The area formula still follows `1 + (rank − 1) × .18`. Projectile emitter travel is compensated for visual scale so stronger bolts still land at the same endpoint.

This task changes animation rendering and its documented targeting design. It does not apply damage, splash hit detection, cooldown or progression changes to combat. The current combat implementation still uses its earlier volley schedule; integrating the revised targeting and AoE damage into combat is separate from this animation preview. No Split Bolt, Void Bolt or Rift Lance evolution is introduced.

### Reuse and assets

`src/fx/rift-bolt-levels.ts` exports `riftBoltLevel()`, `RIFT_BOLT_TIMING`, and `createRiftBoltAnimation(stage, rank, origin)`. Advance an instance with simulation `dt`; inspect its `phase` and `complete`, and `dispose()` it before replacing it. Pausing freezes particle simulation and sprite frames. The preview preserves pixel alignment between the window-sized FX planes and the shorter viewport, and the camera leaves space around the impact area on phones. Replay drains released particles before the new take. Each endpoint target is a preview dummy that shows that spear's impact position, not an added game enemy.

The renderer uses the actual game `FxStage` and the exported `rift-runner/rift-bolt.cast`, `.bolt`, `.impact`, and ground casting/impact effects NixieFX effects from `/vfx/skills.bin`, with existing ShaderGraph materials, cyan-violet LUT, animated Sub-UV burst textures, ribbons and shards. Hero and Revenant frames load from the game `/assets/characters/manifest.json` and its atlases. No screenshot is used as an animation. The preview source imports shared rendering; gameplay does not yet call this visual adapter.

### Build, test and deploy

Run from repository root with dependencies installed:

- `node scripts/rift-bolt/build.mjs` — TypeScript check and standalone Vite bundle.
- `node scripts/rift-bolt/verify.mjs` — temporary foreground test server and Chromium; it closes both before exiting.
- `node scripts/rift-bolt/deploy.mjs` — supported durable Arkodia gateway review layer at `/rift-runner/rift-bolt-levels/`, preserving current gameplay and peer releases.
- `VERIFY_URL=https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/ node scripts/rift-bolt/verify.mjs` — repeat against production, including cross-origin iframe loading.

The page depends on the existing Arkodia game asset paths on the same origin. Deployment uses the repository's supported layer publisher and custom sandbox boot process, never a background member server. Keep this prefix when publishing a new game release.

### Verification

The browser checks the actual rendered primary-target counts 1/1/1/2/3 and live projectile emitter counts, verifies on-hit AoE starts at Lv. 3 and occurs only after impact, and checks all five levels at 1440×900, 390×844 and 320×560; each level must produce particles in casting, travel and impact with no missing textures. Checks include pause freezing time, resume advancing, replay starting over, single-shot completion, loop repetition, day backdrop, controls at least 42 px high, no horizontal overflow, no page errors and no failed HTTP responses. An actual cross-origin iframe is loaded and its level selector is operated. JSON reports and phase screenshots are in this directory.
