## Flame Fan level animation player

Reuses the shipped Rift Bolt player's responsive controls, CSS layout, character atlases and NixieFX stage, with the existing Ember cast, bolt, ground and impact recipes. Rendering-only animation adapter: `src/fx/flame-fan-levels.ts`. No combat or progression files changed.

| Level | Fireballs | Skill damage | Cooldown without haste | Cast scale |
|---|---:|---:|---:|---:|
| 1 | 3 | 1.00× | 1400 ms | 1.00× |
| 2 | 4 | 1.25× | 1288 ms | 1.18× |
| 3 | 5 | 1.50× | 1185 ms | 1.36× |
| 4 | 5 | 1.75× | 1090 ms | 1.54× |
| 5 | 5 | 2.00× | 1003 ms | 1.72× |

Offsets match `combat-vfx.ts`: ±0.34/0 at Lv.1; ±0.36/±0.12 at Lv.2; ±0.44/±0.22/0 at Lv.3–5. Range 4.4 tiles, speed 6.4 tiles/s. Per-fireball base damage remains 0.78× the displayed skill multiplier. Cast scale follows `skillAreaMultiplier`; it does not increase projectile range. Impact sprite scale increases by 4.5% per rank as a visual-only damage cue; ground footprint stays fixed. No extra projectiles, on-hit AoE unlock, burn status, evolution, ultimate or rank-3 fork is added.

The scene is a staged cast at fixed 0.42 s, followed by flight and illustrative target impacts. The 2.6 s review loop includes effect recovery and is not the gameplay cooldown. Target dummies demonstrate each fan ray, not an increased target limit. Pause freezes simulation, Replay clears prior effects, Loop off holds the complete frame. Day/Night changes contrast. Query parameters: `level=1..5`, `autoplay=0`, `loop=0`.

Build: `node scripts/flame-fan/build.mjs`. Verify locally: `node scripts/flame-fan/verify.mjs`. Deploy the additive layer: `node scripts/flame-fan/deploy.mjs`; it retains the Stage 3 game deployment. Verify public URL with `VERIFY_URL=https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/ node scripts/flame-fan/verify.mjs`.

Verification covers actual live fireball emitter counts, cast/travel/impact particles, no missing effects, damage/cooldown values, pause/resume, Replay at zero, once stopping, loop replay, accessible controls and overflow at 1440×900, 390×844 and 320×560, plus a working cross-origin iframe. Screenshots and JSON are in this folder.
