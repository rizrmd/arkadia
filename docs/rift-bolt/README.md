## Rift Bolt level animation player

Live: https://ark-whachat.fural.space/rift-bolt-levels/

```html
<iframe src="https://ark-whachat.fural.space/rift-bolt-levels/" title="Rift Bolt Level 1–5 Animation Player" height="560"></iframe>
```

The responsive English player provides levels 1–5, Play/Pause, Replay, Loop, a progress bar and day/night backdrops. Query parameters: `level=1..5`, `loop=0|1`, `autoplay=0|1`. The sequence is 2.6 seconds: casting wind-up to 0.42 s, travel for 5.2 / 7.5 seconds, then impact and dissipating particles. The longer review timeline separates phases; it is not a combat cooldown change.

### Approved visual progression

| Level | Volley | Cast area |
| --- | --- | --- |
| 1 | Single spear, 0 rad | 1.00× |
| 2 | Twin spears, −0.12 / +0.12 rad | 1.18× |
| 3 | Triad, −0.22 / 0 / +0.22 rad | 1.36× |
| 4 | Triad with expanded casting ring | 1.54× |
| 5 | Triad with maximum casting ring | 1.72× |

These offsets match `src/stronghold/combat-vfx.ts`; area follows `1 + (rank − 1) × .18` from `progression.ts`. Impact size grows modestly (1.00–1.18×) as a visual accent. Projectile count remains capped at three. No Split Bolt, Void Bolt or Rift Lance evolution is implemented; these remain proposals in the Ascension Tree document. No combat, damage, cooldown, hit radius, target detection or progression files are changed.

### Reuse and assets

`src/fx/rift-bolt-levels.ts` exports `riftBoltLevel()`, `RIFT_BOLT_TIMING`, and `createRiftBoltAnimation(stage, rank, origin)`. Advance an instance with simulation `dt`; inspect its `phase` and `complete`, and `dispose()` it before replacing it. Pausing freezes particle simulation and sprite frames. Replay drains released particles before the new take. Each endpoint target is a preview dummy that shows that spear's impact position, not an added game enemy.

The renderer uses the actual game `FxStage` and the exported `rift-runner/rift-bolt.cast`, `.bolt`, and `.impact` NixieFX effects from `/vfx/skills.bin`, with existing ShaderGraph materials, cyan-violet LUT, animated Sub-UV burst textures, ribbons and shards. Hero and Revenant frames load from the game `/assets/characters/manifest.json` and its atlases. No screenshot is used as an animation. The preview source imports shared rendering; gameplay does not yet call this visual adapter.

### Build, test and deploy

Run from repository root with dependencies installed:

- `node scripts/rift-bolt/build.mjs` — TypeScript check and standalone Vite bundle.
- `node scripts/rift-bolt/verify.mjs` — temporary foreground test server and Chromium; it closes both before exiting.
- `node scripts/rift-bolt/deploy.mjs` — supported durable Arkodia gateway review layer at `/rift-bolt-levels/`, preserving current gameplay and peer releases.
- `VERIFY_URL=https://ark-whachat.fural.space/rift-bolt-levels/ node scripts/rift-bolt/verify.mjs` — repeat against production, including cross-origin iframe loading.

The page depends on the existing Arkodia game asset paths on the same origin. Deployment uses the repository's supported layer publisher and custom sandbox boot process, never a background member server. Keep this prefix when publishing a new game release.

### Verification

The browser checks all five levels at 1440×900, 390×844 and 320×560; each level must produce particles in casting, travel and impact with no missing textures. Checks include pause freezing time, resume advancing, replay starting over, single-shot completion, loop repetition, day backdrop, controls at least 42 px high, no horizontal overflow, no page errors and no failed HTTP responses. An actual cross-origin iframe is loaded and its level selector is operated. JSON reports and phase screenshots are in this directory.
