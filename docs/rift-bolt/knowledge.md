**Rift Bolt** is the Rift Runner's Slot 1 signature ranged skill. A cyan-violet pixel-particle rune circle (`rift-polar-shockwave` + `rift-lut`) spins beneath his boots while an `8×8` (64-frame) Sub-UV singularity flash (`rift-burst.png`) ignites at his crystal forearm emitter, launching 1, 2, or 3 high-velocity arcane spears (`speed 7.5` tiles/s, `range 5.2` tiles) that trail eroded plasma ribbons (`rift-eroded-scroll`), crystalline rift shards, and detonate in 64-frame singularity bursts and 3D Voronoi obsidian fractures (`rift-crack.png`) on impact.

![Rift Runner — Rift Bolt in the interactive Skill Player](https://ark-whachat.fural.space/docs/nixie-fx/skill-rift-runner-rift-bolt.webp)

![Rift Bolt in the Stronghold by day](https://ark-whachat.fural.space/docs/nixie-fx/game-rift-runner-rift-bolt-day.webp)

![Rift Bolt in the Stronghold at night](https://ark-whachat.fural.space/docs/nixie-fx/game-rift-runner-rift-bolt-night.webp)

## Mechanical specification

The table below records the existing combat runtime. The human-corrected animation and targeting specification is documented in **Level 1–5 animation player** below: one primary target through Lv. 3, on-hit AoE at Lv. 3, two targets at Lv. 4 and three at Lv. 5. Applying those targeting and splash-damage rules to combat is outside this animation preview implementation.

| Property | Value |
| --- | --- |
| **Hero** | Rift Runner (`rift-runner`) |
| **Skill ID & Badge** | `rift-bolt` · `BOLT` |
| **Loadout Slot** | Slot 1 Signature Skill (equipped at Level 1) |
| **Base Cooldown** | `1400 ms` (`1.4 s`, reduced by `−8%` per skill rank and `−12%` per Chrono Surge rank; `45%` floor) |
| **Base Damage Scale** | `1.00× per spear (1–3 piercing spears)` × Hero Attack Damage (`+25%` per rank above Lv. 1; `1.15×` Dual Cast / `1.30×` Trinity Cast bonus) |
| **Geometry & Range** | 1 / 2 / 3 high-velocity piercing arcane spears · range `5.2` tiles · speed `7.5` tiles/s · hit radius `0.38` tiles |
| **Auto-Cast Trigger** | Fires automatically when a living Revenant enters the hero's AoE detection ring (`2.2 × reach` tiles) outside the Safe Zone |

### Rank scaling (Lv. 1 – Lv. 5)

| Rank | Skill Damage Multiplier | Base Cooldown (No Haste) | Rank Upgrade Effect |
| --- | --- | --- | --- |
| **Lv. 1** | 1.00× per spear | 1400 ms | 1 piercing arcane spear (`0` rad center line) |
| **Lv. 2** | 1.25× per spear | 1288 ms | 2 piercing arcane spears (`-0.12`, `+0.12` rad twin volley) |
| **Lv. 3** | 1.50× per spear | 1185 ms | 3 piercing arcane spears (`-0.22`, `0`, `+0.22` rad triad volley) |
| **Lv. 4** | 1.75× per spear | 1090 ms | 3 piercing arcane spears + expanded cast ring (`1.54×`) |
| **Lv. 5** | 2.00× per spear | 1003 ms | 3 piercing arcane spears + maximum arcane reach (`1.72×`) |

## Level 1–5 animation player

<iframe src="https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/" title="Rift Bolt Level 1–5 Animation Player" height="560"></iframe>

[Open the revised live player](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/). Select **Lv. 1–5** and use **Play / Pause**, **Replay** and **Loop**. English controls, phase labels, progress and Day/Night backdrops work on desktop and phones.

### Corrected targeting and visual progression

The human correction supersedes the earlier preview's 1/2/3/3/3 volley schedule. **Lv. 1–3 aim at one primary target. Lv. 3 adds area damage on hit, not additional aimed targets. Additional primary targets start at Lv. 4.**

| Level | Primary targets / projectiles | Projectile size | Impact size | On-hit behavior |
| --- | --- | --- | --- | --- |
| 1 | 1 / 1 | 1.00× | 1.00× | Focused impact |
| 2 | 1 / 1 | 1.22× | 1.30× | Stronger focused impact |
| 3 | 1 / 1 | 1.48× | 1.65× | AoE blast around the primary target |
| 4 | 2 / 2 | 1.48× | 1.65× | Twin volley with on-hit AoE |
| 5 | 3 / 3 | 1.60× | 1.80× | Triad volley with on-hit AoE |

Casting also grows across ranks: 1.00×, 1.18×, 1.36×, 1.54×, 1.72×. Lv. 1–2 remain focused hits. From Lv. 3, a ground shockwave and fracture field appear **only after the projectile hits**. The animation keeps one primary enemy at Lv. 3; its surrounding blast communicates splash damage. The preview specifies targeting and the damage area's appearance; it does not calculate combat damage or change the game's hit detection, cooldowns, progression or balance.

### Reusable implementation

The real NixieFX `rift-bolt.cast`, `.cast.ground`, `.bolt`, `.impact` and `.impact.ground` effects render the sequence using the game's ShaderGraph materials, cyan-violet LUT, animated Sub-UV bursts, ribbons, shards and ground fractures. Hero and target sprites use existing game atlases and animation clips. There are no static mockups in the animation.

`riftBoltLevel()` supplies primary-target offsets, projectile and impact scales and the `onHitAoE` flag. `createRiftBoltAnimation(stage, rank, origin)` advances with simulation time, triggers ground AoE only at hit time, and exposes phase/completion and disposal. Projectile travel is compensated for visual scale so stronger bolts still reach their targets. The review sequence remains 2.6 seconds. Pause freezes both sprites and particles; Replay clears the previous take. Pixel alignment and extra camera space keep the effects at the actual hit points on phones.

- [Reusable animation module](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Ffx%2Frift-bolt-levels.ts)
- [Player source](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Ffx%2Frift-bolt-player.ts)
- [Build, test and integration documentation](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Frift-bolt%2FREADME.md)
- [Browser verification script](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Frift-bolt%2Fverify.mjs)
- [Live verification report](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Frift-bolt%2Fverification-live.json)

Build with `node scripts/rift-bolt/build.mjs`; publish with `node scripts/rift-bolt/deploy.mjs`. The supported durable Arkodia gateway serves the additive review layer under `/rift-runner/`, preserving gameplay and peer releases. The player uses the existing same-origin game assets. Query parameters: `level=1..5`, `loop=0|1`, `autoplay=0|1`.

### Live verification

Passed at **1440×900**, **390×844** and **320×560**, with **zero page errors and zero failed HTTP requests**. Tests check actual rendered primary-target counts and live projectile emitters at **1/1/1/2/3**, on-hit AoE only from Lv. 3 and only after impact, casting/travel/impact particles, Pause/Resume, Replay resetting to zero, single-shot completion, Loop repetition, Day backdrop, controls, overflow and FX/figure pixel alignment. The real cross-origin iframe loads and its level selector works.

| Level | Casting | Projectile travel | Impact |
| --- | --- | --- | --- |
| 1 | ![Lv. 1 casting](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/live-1440-lv1-casting.png) | ![Lv. 1 projectile](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/live-1440-lv1-projectile.png) | ![Lv. 1 impact](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/live-1440-lv1-impact.png) |
| 2 | ![Lv. 2 casting](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/live-1440-lv2-casting.png) | ![Lv. 2 projectile](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/live-1440-lv2-projectile.png) | ![Lv. 2 impact](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/live-1440-lv2-impact.png) |
| 3 | ![Lv. 3 casting](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/live-1440-lv3-casting.png) | ![Lv. 3 projectile](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/live-1440-lv3-projectile.png) | ![Lv. 3 impact](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/live-1440-lv3-impact.png) |
| 4 | ![Lv. 4 casting](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/live-1440-lv4-casting.png) | ![Lv. 4 projectile](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/live-1440-lv4-projectile.png) | ![Lv. 4 impact](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/live-1440-lv4-impact.png) |
| 5 | ![Lv. 5 casting](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/live-1440-lv5-casting.png) | ![Lv. 5 projectile](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/live-1440-lv5-projectile.png) | ![Lv. 5 impact](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/live-1440-lv5-impact.png) |

#### Lv. 3: one primary target, on-hit AoE

![Phone Lv. 3: one primary target with ground shockwave and area blast centered on impact](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/live-390-lv3-impact.png)

#### Phone progression

![Phone Lv. 1 projectile travel](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/live-390-lv1-projectile.png)

![Phone Lv. 2 projectile travel](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/live-390-lv2-projectile.png)

![Phone Lv. 3 projectile travel](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/live-390-lv3-projectile.png)

![Phone Lv. 4 projectile travel](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/live-390-lv4-projectile.png)

![Phone Lv. 5 projectile travel](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/live-390-lv5-projectile.png)

#### Local development captures (before final mobile framing)

![Local Lv. 3 on-hit AoE](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/local-390-lv3-impact.png)

![Local desktop Lv. 5 triad](https://ark-whachat.fural.space/rift-runner/rift-bolt-levels/evidence/local-1440-lv5-projectile.png)

## Interactive Skill Player

<iframe src="https://ark-whachat.fural.space/skill-player/?hero=rift-runner&skill=rift-bolt&dir=SE&controls=simple" title="Rift Runner — Rift Bolt Skill Player" width="100%" height="520" loading="lazy"></iframe>

Use the interactive controls along the bottom bar to inspect every stage and angle of **Rift Bolt**:

- **Skill & Cue / Stage Switcher**: Switch between **Full Sequence** and individual NixieFX stages (**Cast**, **Projectile / Bolt**, **Impact**), or compare against other Rift Runner skills.
- **8-Direction Switcher** (**N**, **NE**, **E**, **SE**, **S**, **SW**, **W**, **NW**): Rotate the hero sprite ([assets-src/sprite-player/rift-runner-attack.png](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=assets-src%2Fsprite-player%2Frift-runner-attack.png) packed into [public/assets/characters/rift-runner.webp](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Fassets%2Fcharacters%2Frift-runner.webp) via [scripts/pack-heroes.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fpack-heroes.mjs), `MANIFEST_REV = '1side-v6'`), target Revenant dummy, and isometric 2:1 particle projection across all eight compass headings.
- **Play / Replay**: Trigger an immediate fresh cast of the selected sequence or cue.
- **Loop / Once**: Toggle continuous auto-repeat (**Loop**, every `2.2 s`) or single-shot playback (**Once**).
- **Background Switcher** (**Night** / **Day**): Compare additive thermal/arcane glow on the night courtyard against crisp daylight snow.

### Embed this player on another page

```html
<iframe src="https://ark-whachat.fural.space/skill-player/?hero=rift-runner&skill=rift-bolt&dir=SE&controls=simple" title="Rift Runner — Rift Bolt Skill Player" width="100%" height="520"></iframe>
```

| Query Parameter | Description |
| --- | --- |
| `hero=rift-runner` | Selects **Rift Runner** character atlas and FX profile |
| `skill=rift-bolt` | Selects **Rift Bolt** (`play=rift-bolt` is also supported) |
| `cue=full\|cast\|bolt\|telegraph\|detonate\|impact` | Starts on **Full Sequence** (`full`) or a specific stage cue |
| `dir=N\|NE\|E\|SE\|S\|SW\|W\|NW` | Sets the initial compass heading (default `SE`) |
| `loop=1\|0` | Starts in **Loop** (`1`, default) or **Once** (`0`) mode |
| `bg=night\|day` | Sets initial courtyard background (**Night** default in simple mode) |
| `controls=simple` | Compact two-row embed control bar for Knowledge pages |

## NixieFX cues & particle layers

Authored with Diablo-style NixieFX Tier-2 `ShaderGraph` master materials (`rift-eroded-scroll`, `rift-polar-shockwave`, and `rift-lut` 1D color ramp LUT `#140438` → `#3d149e` → `#853df0` → `#6bd6ff` → `#f0faff`), RGBA channel-packed noise (`noise.png`), `8×8` Sub-UV singularity flipbooks (`rift-burst.png`), and 3D Voronoi shattered obsidian craters (`rift-crack.png`):

| Cue Key | Stage Button | Plane | Particle Assembly |
| --- | --- | --- | --- |
| `rift-bolt.cast` | **Cast** | Ground + World | 48-mote counter-rotating `L.magicCircle` (`radius 1.12`), polar shockwave glyph (`rift-polar-shockwave`), `8×8` Sub-UV muzzle singularity (`rift-burst.png`), eroded plasma stream (`rift-eroded-scroll`), crystalline `L.shards`, and `L.arcs` |
| `rift-bolt.bolt` | **Projectile / Bolt** | World (local slide) | Spearhead `L.comet` (`rift-lut`), `8×8` Sub-UV plasma body (`rift-burst.png`, `rate 58`), eroded plasma ribbon wake (`rift-eroded-scroll`, `rate 150`), crackling electric `L.arcs`, and shedding crystalline `L.shards` (`rate 32`) |
| `rift-bolt.impact` | **Impact** | Ground + World | `8×8` Sub-UV singularity burst (`rift-burst.png`, `count 22`), eroded plasma plumes (`rift-eroded-scroll`), 42 LUT-mapped sparks (`rift-lut`), 14 `L.shards`, 75/s `L.arcs`, 3D Voronoi `rift-crack.png` crater, and polar shockwave ring (`rift-polar-shockwave`) |

## Source & verification

- **Combat mechanics & auto-cast**: [src/stronghold/combat-vfx.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fcombat-vfx.ts) · [src/stronghold/progression.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fprogression.ts)
- **Hero FX profile & recipes**: [src/fx/heroes/rift-runner.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Ffx%2Fheroes%2Frift-runner.ts) · [vfx/recipes/rift-runner.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=vfx%2Frecipes%2Frift-runner.mjs) · [scripts/vfx/lib/kits.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fvfx%2Flib%2Fkits.mjs) · [scripts/vfx/lib/layers.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fvfx%2Flib%2Flayers.mjs)
- **Skill Player runtime & verification**: [src/fx/lab.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Ffx%2Flab.ts) · [scripts/vfx/verify-skill-player.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fvfx%2Fverify-skill-player.mjs) · [skill-player-verify.json](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fnixie-fx%2Fskill-player-verify.json)