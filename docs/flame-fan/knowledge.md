## Level 1–5 animation player

<iframe src="https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/" title="Flame Fan Level 1–5 Animation Player" height="560"></iframe>

[Open the level animation player](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/) · [Live verification report](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/verification-live.json).

Level selector, Play/Pause, Replay, Loop and Day/Night use the shipped Rift Bolt player pattern. This is a rendering preview using the actual Ember cast, fireball and impact assets, not a static mockup.

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


### Live verification

TypeScript and production build pass. All five levels, all three animation phases, actual emitter counts, pause/resume, replay, loop on/off and cross-origin iframe controls pass locally and live at 1440 × 900, 390 × 844 and 320 × 560. Zero page errors, missing effects or failed HTTP requests. Screenshots below are simulation-paused checkpoints. Published as an additive review layer over the delivered Stage 3 game; peer work is preserved. Implementation commit: f23ee5b.

### Desktop evidence

![Flame Fan live 1440px Lv.1 casting](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-1440-lv1-casting.png)

![Flame Fan live 1440px Lv.2 projectile](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-1440-lv2-projectile.png)

![Flame Fan live 1440px Lv.3 projectile](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-1440-lv3-projectile.png)

![Flame Fan live 1440px Lv.4 projectile](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-1440-lv4-projectile.png)

![Flame Fan live 1440px Lv.5 impact](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-1440-lv5-impact.png)

### Mobile portrait evidence

![Flame Fan live 390px Lv.1 casting](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-390-lv1-casting.png)

![Flame Fan live 390px Lv.2 projectile](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-390-lv2-projectile.png)

![Flame Fan live 390px Lv.3 projectile](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-390-lv3-projectile.png)

![Flame Fan live 390px Lv.4 projectile](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-390-lv4-projectile.png)

![Flame Fan live 390px Lv.5 impact](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-390-lv5-impact.png)

### Local visual review

![Local mobile Lv.5 projectile review](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/local-390-lv5-projectile.png)

![Local desktop Lv.1 impact review](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/local-1440-lv1-impact.png)
