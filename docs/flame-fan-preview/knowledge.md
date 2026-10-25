## Connected Flame Fan — review preview

The human approved the generated fan-shaped reference on 2026-10-25 and requested this animated NixieFX preview. **Preview only: the live game and previous game VFX have not been replaced by this revision.** The earlier particle presentation was rejected because it resembled red confetti. Review the new connected flame sheet below before game integration.

<iframe src="https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/" title="Flame Fan NixieFX Preview" height="560"></iframe>

[Open playable preview](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/) · [Live verification](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/verification-live.json) · [Local verification](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/verification-local.json)

Play/Pause, Replay, Loop, timeline scrubbing, Lv.1–5 and Day/Night are available. The fan starts at a narrow source, opens into a connected 108° sector, and ends in a curved turbulent rim. There are no fireball projectiles. Rank selection changes visual extent for review; this player does not simulate damage.

### Approved reference

![Approved fan-shaped Flame Fan reference](/api/rooms/DRe6a2c6f1487f8fcbeed0d6b5/attachments/DAe091fce2f57db19172f44833)

### Implementation and limits

Uses the existing installed NixieFX/Pixi runtime and normalized effect contract with one stationary sheet billboard. A preview-specific procedural WebGL material animates polar flame turbulence into its texture. This produces connected flowing fire rather than scattered particles. It is a procedural interpretation of the approved painted reference; exact painted curls, caster animation, game projection/occlusion and gameplay integration are not part of this preview. WebGL is required. No new AI-generated raster is claimed.

TypeScript and Vite production builds pass. Local/live headless Chromium checks pass at 1440×900, 390×844 and 320×560: five ranks, opening/full/late/fade phases, controls, no horizontal overflow, and cross-origin iframe playback/level selection. Zero browser errors and failed HTTP requests in final checks. Earlier repeated-navigation runs stalled; fresh-browser reruns passed, and the verifier now isolates each viewport. This is not a real-device GPU performance benchmark.

Published as an additive layer under its own preview prefix using the supported Arkodia publisher. Existing game, Ember gates, inventory, Settings, Rift and peer assets are preserved.

### Desktop animation phases

![Opening fan at Lv.1](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-1440-lv1-0.4.png)

![Connected flame sheet at Lv.1](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-1440-lv1-0.95.png)

![Lv.5 late flame sheet](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-1440-lv5-1.65.png)

![Fading connected flame](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-1440-lv1-2.2.png)

### Mobile animation phases

![Mobile Lv.1 fan](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-390-lv1-0.95.png)

![Mobile Lv.5 fan](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-390-lv5-1.65.png)

![Mobile fading fan](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-390-lv1-2.2.png)

![Compact mobile Lv.5 fan](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-320-lv5-0.95.png)

## Previous gameplay release — historical evidence

The mechanics and evidence below document the prior AoE gameplay release. Its particle appearance was rejected; those screenshots do not show the new review preview. The new preview above supersedes the earlier visual player for this review.

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