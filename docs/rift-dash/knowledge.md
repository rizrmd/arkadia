**Rift Dash** propels the Rift Runner through a dimensional slipstream, leaving 3–5 cyan-violet warp afterimages, standing eroded rift plasma ribbons (`rift-eroded-scroll`), `8×8` Sub-UV singularity bursts (`rift-burst.png`), and 3D Voronoi obsidian fractures (`rift-crack.png`) along his path before materializing with a soulercoaster crescent phase-slash (`rift-polar-shockwave`) and crystalline shards.

![Rift Runner — Rift Dash in the interactive Skill Player](https://ark-whachat.fural.space/docs/nixie-fx/skill-rift-runner-rift-dash.webp)

![Rift Dash in the Stronghold by day](https://ark-whachat.fural.space/docs/nixie-fx/game-rift-runner-rift-dash-day.webp)

![Rift Dash in the Stronghold at night](https://ark-whachat.fural.space/docs/nixie-fx/game-rift-runner-rift-dash-night.webp)

## Mechanical specification

| Property | Value |
| --- | --- |
| **Hero** | Rift Runner (`rift-runner`) |
| **Skill ID & Badge** | `rift-dash` · `DASH` |
| **Loadout Slot** | Unlockable Active Skill (Slot 2 / Slot 3 via Blessing) |
| **Base Cooldown** | `1400 ms` (`1.4 s`, reduced by `−8%` per skill rank and `−12%` per Chrono Surge rank; `45%` floor) |
| **Base Damage Scale** | `1.10×` × Hero Attack Damage (`+25%` per rank above Lv. 1; `1.15×` Dual Cast / `1.30×` Trinity Cast bonus) |
| **Geometry & Range** | Phase-shift warp lunge (`1.5` tiles) + frontal phase-slash cone (`radius 1.35 × reach`, spread `122°` / `0.68π rad`, `260 ms` detonation) |
| **Cast Trigger** | Manual directional cast only. Mobile: hold and drag the hexagonal control, then release. Desktop: aim the cursor and press the equipped slot key or click the control. Other skills retain auto-cast. |

### Rank scaling (Lv. 1 – Lv. 5)

| Rank | Skill Damage Multiplier | Base Cooldown (No Haste) | Rank Upgrade Effect |
| --- | --- | --- | --- |
| **Lv. 1** | 1.00× (1.10× base) | 1400 ms | 3 warp afterimages · `1.35` tile phase-slash cone radius |
| **Lv. 2** | 1.25× (1.38× total) | 1288 ms | 4 warp afterimages · `1.59` tile cone radius (`+18%`) |
| **Lv. 3** | 1.50× (1.65× total) | 1185 ms | 5 warp afterimages · `1.84` tile cone radius (`+36%`) |
| **Lv. 4** | 1.75× (1.93× total) | 1090 ms | 5 warp afterimages · `2.08` tile cone radius (`+54%`) |
| **Lv. 5** | 2.00× (2.20× total) | 1003 ms | 5 warp afterimages · `2.32` tile cone radius (`+72%`) |

## Interactive Skill Player

<iframe src="https://ark-whachat.fural.space/skill-player/?hero=rift-runner&skill=rift-dash&dir=SE&controls=simple" title="Rift Runner — Rift Dash Skill Player" width="100%" height="520" loading="lazy"></iframe>

Use the interactive controls along the bottom bar to inspect every stage and angle of **Rift Dash**:

- **Skill & Cue / Stage Switcher**: Switch between **Full Sequence** and individual NixieFX stages (**Cast**, **Detonate**), or compare against other Rift Runner skills.
- **8-Direction Switcher** (**N**, **NE**, **E**, **SE**, **S**, **SW**, **W**, **NW**): Rotate the hero sprite ([assets-src/sprite-player/rift-runner-attack.png](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=assets-src%2Fsprite-player%2Frift-runner-attack.png) packed into [public/assets/characters/rift-runner.webp](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Fassets%2Fcharacters%2Frift-runner.webp) via [scripts/pack-heroes.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fpack-heroes.mjs), `MANIFEST_REV = '1side-v6'`), target Revenant dummy, and isometric 2:1 particle projection across all eight compass headings.
- **Play / Replay**: Trigger an immediate fresh cast of the selected sequence or cue.
- **Loop / Once**: Toggle continuous auto-repeat (**Loop**, every `2.2 s`) or single-shot playback (**Once**).
- **Background Switcher** (**Night** / **Day**): Compare additive thermal/arcane glow on the night courtyard against crisp daylight snow.

### Embed this player on another page

```html
<iframe src="https://ark-whachat.fural.space/skill-player/?hero=rift-runner&skill=rift-dash&dir=SE&controls=simple" title="Rift Runner — Rift Dash Skill Player" width="100%" height="520"></iframe>
```

| Query Parameter | Description |
| --- | --- |
| `hero=rift-runner` | Selects **Rift Runner** character atlas and FX profile |
| `skill=rift-dash` | Selects **Rift Dash** (`play=rift-dash` is also supported) |
| `cue=full\|cast\|bolt\|telegraph\|detonate\|impact` | Starts on **Full Sequence** (`full`) or a specific stage cue |
| `dir=N\|NE\|E\|SE\|S\|SW\|W\|NW` | Sets the initial compass heading (default `SE`) |
| `loop=1\|0` | Starts in **Loop** (`1`, default) or **Once** (`0`) mode |
| `bg=night\|day` | Sets initial courtyard background (**Night** default in simple mode) |
| `controls=simple` | Compact two-row embed control bar for Knowledge pages |

## NixieFX cues & particle layers

Built on Diablo-style `ShaderGraph` materials (`rift-eroded-scroll` warp slipstream ribbons, `rift-polar-shockwave` soulercoaster crescent sweep, and `rift-lut` 1D arcane ramp) with `8×8` Sub-UV `rift-burst.png` singularities and `rift-crack.png` corridor fractures:

| Cue Key | Stage Button | Plane | Particle Assembly |
| --- | --- | --- | --- |
| `rift-dash.cast` | **Cast** | Ground + World | 36-mote warp `L.magicCircle` (`radius 0.78`), 3–5 phase afterimages, eroded slipstream corridor (`rift-eroded-scroll`, `rate 95`), `8×8` Sub-UV singularity trail (`rift-burst.png`), `rift-crack.png` corridor fissures, and ground `L.arcs` |
| `rift-dash.detonate` | **Detonate** | Ground + World | Phase-slash cone burst at `260 ms`: `8×8` Sub-UV arrival singularity (`rift-burst.png`, `count 22`), soulercoaster crescent sweep (`rift-polar-shockwave`, `count 28`), eroded cone plumes (`rift-eroded-scroll`), 14 `L.shards`, and `rift-crack.png` impact crater |

## Source & verification

- **Combat mechanics & auto-cast**: [src/stronghold/combat-vfx.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fcombat-vfx.ts) · [src/stronghold/progression.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fprogression.ts)
- **Hero FX profile & recipes**: [src/fx/heroes/rift-runner.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Ffx%2Fheroes%2Frift-runner.ts) · [vfx/recipes/rift-runner.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=vfx%2Frecipes%2Frift-runner.mjs) · [scripts/vfx/lib/kits.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fvfx%2Flib%2Fkits.mjs) · [scripts/vfx/lib/layers.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fvfx%2Flib%2Flayers.mjs)
- **Skill Player runtime & verification**: [src/fx/lab.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Ffx%2Flab.ts) · [scripts/vfx/verify-skill-player.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fvfx%2Fverify-skill-player.mjs) · [skill-player-verify.json](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fnixie-fx%2Fskill-player-verify.json)

## Discussion references — October 26, 2026

User-provided references for the proposed manual directional Rift Dash revision. The hexagonal control and manual directional exception were approved and implemented. Both original reference images remain inline below.

![Reference 1 — gameplay HUD for the requested in-use dash visual](/organizations/ORd5dd6f99b4308d6187031557/sandbox/US4f550b10dab65dc9756fa429/files?file=attachments%2F68079.jpg)

![Reference 2 — Rift Dash in the Skill Tree](/organizations/ORd5dd6f99b4308d6187031557/sandbox/US4f550b10dab65dc9756fa429/files?file=attachments%2F68083.jpg)

## Approved directional dash concept

Generated design illustration using original reference 1 as the edit target and reference 2 for skill styling. This is concept artwork, not live verification. The artwork illustrates the approved direction; device verification screenshots below show actual gameplay.

![Rift Dash in use — generated concept](/organizations/ORd5dd6f99b4308d6187031557/sandbox/US4f550b10dab65dc9756fa429/files?file=projects%2Farkadia%2Frepos%2Farkadia%2Fdocs%2Frift-dash%2Fin-use-concept.png)

## Manual controls and verification

Rift Dash is the only manual Rift Runner active. Equip it through the Pixi Skill Tree. On touch, hold the gold hexagonal button, drag at least 12 CSS pixels to aim, and release to dash. A tap without dragging opens skill equip even during cooldown. On desktop, aim at the world and press the equipped slot key (1, 2, or 3), or click the hexagonal button to cast toward the last world cursor aim. Right-click inspects the skill; K opens the Skill Tree. Other skill sockets keep their existing equip and auto-cast behavior.

The hero moves up to 1.5 ground tiles. A sweep every 0.05 tile stops at blockers or cliffs; a fully blocked cast consumes no cooldown. Arrival phase-slash damage uses the swept endpoint. The aim arrow, hexagon, runner glyph, cooldown overlay and tapered cyan-violet trail are Pixi graphics. Releasing a cancelled pointer, losing focus or rotating the device cancels aiming. No game HTML/React controls were added.

Local desktop (1440 × 900), portrait touch (390 × 844), and landscape touch (844 × 390) checks passed: hold does not cast, release displaces in the selected direction, cooldown locks recasting, and skill equip stays accessible. Go tests also cover queued online input, invalid directions, unequipped casts, cooldown enforcement and preserving Rift Bolt auto-cast.

![Actual gameplay — local desktop dash](/organizations/ORd5dd6f99b4308d6187031557/sandbox/US4f550b10dab65dc9756fa429/files?file=projects%2Farkadia%2Frepos%2Farkadia%2Fdocs%2Frift-dash%2Flocal-desktop-dash.png)

![Actual gameplay — local landscape aim](/organizations/ORd5dd6f99b4308d6187031557/sandbox/US4f550b10dab65dc9756fa429/files?file=projects%2Farkadia%2Frepos%2Farkadia%2Fdocs%2Frift-dash%2Flocal-landscape-aim.png)

![Actual gameplay — local landscape dash](/organizations/ORd5dd6f99b4308d6187031557/sandbox/US4f550b10dab65dc9756fa429/files?file=projects%2Farkadia%2Frepos%2Farkadia%2Fdocs%2Frift-dash%2Flocal-landscape-dash.png)

![Actual gameplay — local mobile aim](/organizations/ORd5dd6f99b4308d6187031557/sandbox/US4f550b10dab65dc9756fa429/files?file=projects%2Farkadia%2Frepos%2Farkadia%2Fdocs%2Frift-dash%2Flocal-mobile-aim.png)

![Actual gameplay — local mobile dash](/organizations/ORd5dd6f99b4308d6187031557/sandbox/US4f550b10dab65dc9756fa429/files?file=projects%2Farkadia%2Frepos%2Farkadia%2Fdocs%2Frift-dash%2Flocal-mobile-dash.png)
