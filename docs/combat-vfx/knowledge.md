## Visible EXP Progression Bar (HUD & In-World)

The Stronghold HUD (`#hero-hud`) now displays a dedicated horizontal EXP progression bar directly beneath the Health bar, paired with an in-world gold EXP strip (`#hero-health b.hero-exp`) under the hero's overhead health bar:

- **Level Badge (`Lv. X`):** Metallic gold badge (`.hud-lv-badge`) that scales and glows on level-up.
- **XP Readout (`XP / Next XP (XX%)`):** Displays exact current XP, threshold (`20 + (level - 1) * 10`), and percentage (`xpPercent(run)`).
- **Animated Gold/Amber Fill (`.hud-exp-bar i`):** Smoothly transitions (`cubic-bezier(.22, 1, .36, 1)`) on each revenant kill (10 XP per kill).
- **Level-Up Pulse (`#hero-hud[data-levelup="true"]`):** Pulses the HUD EXP bar and badge with a golden glow for 1.2s when XP reaches the level threshold as the *Choose a Blessing* modal opens.
- **Solo & 20Hz Co-op Parity:** Driven by local `Progression` in solo mode ([src/stronghold/encounters.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fencounters.ts)) and authoritative `me.run` snapshots in 20Hz co-op mode ([server/internal/sim/progression.go](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=server%2Finternal%2Fsim%2Fprogression.go)).

![RO-Style Normal vs Critical Damage and Visible HUD EXP Bar](https://ark-whachat.fural.space/combat-vfx/ro-crit-and-exp-bar.webp)

- Repo preview links: [ro-crit-and-exp-bar.webp](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fcombat-vfx%2Fro-crit-and-exp-bar.webp) · [combat-vfx.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fcombat-vfx.ts) · [progression.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fprogression.ts) · [progression.css](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fprogression.css)

## RO-Style Damage on Hit & Floating Combat Text

Combat hits now distinguish normal blows, Ragnarok Online style critical hits, incoming enemy damage, and healing in [src/stronghold/combat-vfx.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fcombat-vfx.ts):

| Event Type | Visual Treatment | Mechanics & Scaling |
| --- | --- | --- |
| **Normal Hit** | Crisp white integer (`10`) with bold dark outline (`#120b07`), short parabolic upward/sideways hop, and 6-ray white/amber hit spark sprite | Base `1.0x` hero attack damage (`damage(run)`) |
| **Critical Hit (RO Style)** | Spiky 12-point crimson/gold burst badge behind larger yellow-gold gradient numbers (`15!`) with `CRITICAL` header, `1.42x -> 1.0x` pop-in scale, micro hit-shake on target, and twin crimson/gold cross-slash burst sprite | Base `15%` `critChance(run)` (`+4%` per *Titan Strike* or *Ascendant Star* rank, `+10%` per `crit` rank) and `1.5x–2.0x` `critMultiplier(run)` |
| **Incoming Hero Damage** | Crisp red numbers (`-4`) with dark crimson outline + red impact spark | Triggered when revenant melee attacks land |
| **Heal & Lifesteal** | Emerald green `+HP` numbers (`+2 HP`, `+35 HP`, `+8 HP`) floating upward | Triggered on *Soul Feast* kill sustain, *Second Wind* / *Vitality* / *Ascendant Star* picks, and Safe Zone regeneration |

## Combat Architecture, Projectiles & 2:1 Isometric AoE Layers

```d2
CombatSim: "Combat Step (Solo encounters.ts / 20Hz Co-op Server)"
Progression: "Progression & RO Crit Roll (threshold, xpPercent, critChance 15%+, critMultiplier 1.5x-2.0x)"
GroundLayer: "Under-Foot Layer (#world-vfx-ground)\n2:1 Isometric AoE Telegraphs, Expanding Level-Up Rune Rings, Dash Scorch Trails"
FigureLayer: "Depth-Sorted Figures (#world-foes-back, #world-hero, #world-foes-front)"
OverLayer: "Over-Character Layer (#world-vfx-over)\nDirectional Slash Arcs, Flying Projectiles, AoE Detonation Pillars, Level-Up Light Pillar, RO Crit Badges"
HudLayer: "HUD (#hero-hud & #combat-skills)\nLv. X Badge, XP / Next XP (XX%) Gold Fill Bar, Hotkeys 1-4 Skill Bar"

CombatSim -> Progression: "onKill() / rollHit()"
Progression -> HudLayer: "EXP Bar Fill & Level-Up Pulse"
Progression -> GroundLayer: "Level-Up 2:1 Rune Aura & AoE Telegraphs"
Progression -> OverLayer: "RO Normal/Crit Numbers, Sparks & Light Pillar"
GroundLayer -> FigureLayer: "Rendered beneath character boots"
FigureLayer -> OverLayer: "Rendered beneath over-character bursts"
```

## Skill Sprites, Projectiles & 2:1 Isometric AoE System

Each hero kit exposes four active skills in the bottom `#combat-skills` bar (keys `1`–`4` or click/tap, plus automatic projectile weaving on every third melee swing):

| Hero Kit | Skill (`Key`) | Layer & Behavior |
| --- | --- | --- |
| **Rift Runner** | **Rift Bolt (`1`)** | Directional crystalline cyan-violet spear projectile (`u, v, vx, vy, radius, range`) with prism ribbon trail and starlight impact burst |
| **Rift Runner** | **Rift Dash (`2`)** | Spawns 3 translucent cyan-violet afterimage silhouettes along the dash vector with warp sparks |
| **Rift Runner** | **Rift Trap (`3`)** | 2:1 isometric cyan rune circle telegraph on `#world-vfx-ground` with animated fill progress (`0 -> 100%`), detonating in a dimensional implosion on `#world-vfx-over` |
| **Ember Warden** | **Flame Fan (`1`)** | Conical 3-bolt fan (`-20°`, `0°`, `+20°`) of blazing fireballs with ember trails and fiery impact explosions |
| **Ember Warden** | **Cinder Step (`2`)** | Ignites 2:1 isometric molten cinder rings at the hero's feet with fiery surge plumes |
| **Ember Warden** | **Ember Snare (`3`)** | 2:1 isometric volcanic sigil telegraph on `#world-vfx-ground` with animated lava fill progress, erupting in a towering flame pillar on `#world-vfx-over` |
| **Shared / War** | **Astral Cleave / Seismic Slam (`4`)** | Wide directional cone cleave wave (`cleave-cone`) or circular ground slam (`shockwave`), scaling radius and arc width with **Arc Nova** rank (`reach(run)`) |

![2:1 Isometric AoE Ground Telegraphs and Flying Projectiles](https://ark-whachat.fural.space/combat-vfx/aoe-telegraph-and-projectiles.webp)

- Repo preview link: [aoe-telegraph-and-projectiles.webp](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fcombat-vfx%2Faoe-telegraph-and-projectiles.webp)

## Level-Up VFX Sprite & Over-Character AoE Detonation

When `run.level` advances (`reward()` in solo or `me.run.level` in co-op), the game triggers:
1. **Under-Foot Rune Aura (`#world-vfx-ground`):** Rotating 8-spoke golden rune circle and 3 concentric expanding shockwave ellipses in 2:1 isometric projection beneath the hero's boots.
2. **Vertical Light Pillar (`#world-vfx-over`):** 195 px golden-cyan celestial beam with rising golden motes and a floating `LEVEL UP! · LV. X` banner above the hero.
3. **HUD EXP Pulse & Blessing Modal:** Pulses `.hud-exp-bar` and `.hud-lv-badge` while opening the 3-card *Choose a Blessing* dialog (automatically hiding `#combat-skills` until the choice is made).

![Level-Up Light Pillar, Ground Rune Ring, and Over-Character AoE Impact](https://ark-whachat.fural.space/combat-vfx/level-up-vfx-and-aoe-impact.webp)

- Repo preview links: [level-up-vfx-and-aoe-impact.webp](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fcombat-vfx%2Flevel-up-vfx-and-aoe-impact.webp) · [results.json](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fcombat-vfx%2Fresults.json) · [verify-combat-vfx.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fverify-combat-vfx.mjs)

## Verification & Live Deployment

- **Automated Unit & Simulation Tests:** `node scripts/test-progression.mjs` and `cd server && go test ./...` verify `xpPercent`, base `15%` `critChance`, `1.5x–2.0x` `critMultiplier`, blessing scaling, and 20Hz server progression.
- **Headless Browser Verification:** `node scripts/verify-combat-vfx.mjs` and `node scripts/verify-progression.mjs` verify HUD EXP bar fill (`Lv. 1`, `10 / 20 XP (50%)`), RO normal vs critical damage numbers and sparks, 2:1 isometric AoE telegraphs, projectile flight & collision, level-up light pillar VFX, and zero page errors.
- **Live Sandbox URL:** Deployed on [https://ark-whachat.fural.space](https://ark-whachat.fural.space) (commit `caeae36` on `feat/stronghold`).
