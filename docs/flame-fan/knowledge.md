<iframe src="https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/" title="Flame Fan Level 1–5 AoE Animation Player" height="560"></iframe>

[Open AoE player](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/) · [Live game checks](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/game-live.json) · [Live player checks](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/verification-live.json).

## Confirmed mechanics

Flame Fan is a forward **108° flame sector from Lv.1 through Lv.5**, with **no fireball projectiles**. It hits every living target in the sector once per cast, including multiple targets at Lv.1. Targets behind the caster, outside its range/angle, or behind blocking walls are excluded. Radius includes the existing 0.38-tile target collision allowance.

| Rank | Radius (tiles) | Damage multiplier | Cooldown (ms) | Projectiles |
|---|---:|---:|---:|---:|
| 1 | 4.400 | 1.00× | 1400 | 0 |
| 2 | 5.192 | 1.25× | 1288 | 0 |
| 3 | 5.984 | 1.50× | 1185 | 0 |
| 4 | 6.776 | 1.75× | 1090 | 0 |
| 5 | 7.568 | 2.00× | 1003 | 0 |

Each target receives 0.78× base skill damage multiplied by rank and existing combo modifiers. Existing server rounding, critical-hit handling and health accounting remain in place. The authoritative server uses the same radius, sector, rank multipliers and unlimited target count; other skills keep their existing target limits. Offline damage resolves after a 420 ms cast; online damage remains on the existing authoritative auto-cast tick and the client renders that cast. This does not introduce a new network timing protocol.

## Animation and controls

The actual NixieFX effect fills the forward sector with overlapping stationary flame tongues. There is no moving projectile emitter, comet head or projectile-travel phase. Rank changes expand the flame area. The caster uses the existing attack animation; preview target recoil is illustrative, while the actual game applies damage.

The English player provides Lv.1–5 selection, Play/Pause, Replay, Loop, Day/Night and iframe playback. Phases are Casting, Flame area and Dissipating. It is delivered in the same supported game release pipeline so the player and game load matching VFX.

## Verification

Local actual-game checks at 1440×900 and 390×844 pass for all five ranks: three forward targets take damage, the rear target is excluded, exactly one AoE and zero projectiles are emitted. Player checks also pass at 320×560, all ranks/phases, controls and iframe, with no browser errors or failed requests. Go sector and six-target Lv.1 auto-cast tests pass. Progression and seeded Ember/Rift gate parity regressions pass. Live results are recorded separately after deployment.

Existing tier gates, Settings, inventory and Rift integrations are preserved. Solar Fan and other concept skills remain unimplemented.


## Live delivery

Actual game desktop and touch/mobile tests pass for every rank, including three forward targets damaged at Lv.1, rear-target exclusion and zero projectiles. Player tests pass on desktop, portrait mobile and compact mobile with all controls and iframe playback. Zero page errors. The release includes the latest committed inventory and Settings integration.

### Desktop evidence

![Live 1440px Flame Fan Lv.1 flame area](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-1440-lv1-flame.png)

![Live 1440px Flame Fan Lv.2 flame area](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-1440-lv2-flame.png)

![Live 1440px Flame Fan Lv.3 flame area](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-1440-lv3-flame.png)

![Live 1440px Flame Fan Lv.4 flame area](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-1440-lv4-flame.png)

![Live 1440px Flame Fan Lv.5 flame area](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-1440-lv5-flame.png)

![Live actual game 1440px Flame Fan Lv.1](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-game-1440-lv1.png)

![Live actual game 1440px Flame Fan Lv.5](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-game-1440-lv5.png)

### Mobile evidence

![Live 390px Flame Fan Lv.1 flame area](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-390-lv1-flame.png)

![Live 390px Flame Fan Lv.2 flame area](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-390-lv2-flame.png)

![Live 390px Flame Fan Lv.3 flame area](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-390-lv3-flame.png)

![Live 390px Flame Fan Lv.4 flame area](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-390-lv4-flame.png)

![Live 390px Flame Fan Lv.5 flame area](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-390-lv5-flame.png)

![Live actual game 390px Flame Fan Lv.1](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-game-390-lv1.png)

![Live actual game 390px Flame Fan Lv.5](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-game-390-lv5.png)

## Local visual review

![Local desktop corrected flame sector](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/local-1440-lv1-flame.png)

![Local mobile actual-game multi-target check](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/local-game-390-lv1.png)
