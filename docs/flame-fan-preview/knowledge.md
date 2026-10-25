## Revised combat preview

Revised on 2026-10-25 after human approval to make Lv.1–5 visibly distinct and show Ember Warden with enemies. **This is the separate review preview; the new candidate is not integrated into game VFX.**

<iframe src="https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/" title="Flame Fan NixieFX Preview" height="820"></iframe>

[Open playable preview](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/) · [Live checks](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/verification-live.json) · [Local checks](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/verification-local.json)

### Combat context and comparison

The preview uses the actual game Ember Warden atlas with attack-E and idle-E clips, plus three Revenants using idle and hit clips. Cast animation precedes the 0.42-second flame release. Target recoil, contact glow and impact rings begin after the opening flame reaches the target group. Reactions are illustrative, not a damage simulation. Actors render above the sheet so they remain visible for review.

The selected large view and five side-by-side scenes share one clock, camera, target layout and scale (49 pixels per tile before responsive resizing). Pause or scrub to compare identical phases. Selecting a rank/card preserves the current time and pause state. Desktop shows all five ranks; mobile scrolls the card row horizontally. Play/Pause, Replay, Loop and Day/Night are available in English.

| Rank | Flame treatment | Existing radius | Damage | Cooldown |
|---|---|---:|---:|---:|
| Lv.1 | One lean orange layer; small contact flare | 4.400 tiles | 1.00× | 1400 ms |
| Lv.2 | Two curled folds; stronger gold contact flare | 5.192 tiles | 1.25× | 1288 ms |
| Lv.3 | Three tongue strata; brighter gold core and impacts | 5.984 tiles | 1.50× | 1185 ms |
| Lv.4 | Four dense folds; hotter seams and layered impacts | 6.776 tiles | 1.75× | 1090 ms |
| Lv.5 | Five tongue strata; broad gold/ivory core and strongest contacts | 7.568 tiles | 2.00× | 1003 ms |

All ranks retain a connected **108° AoE fan from Lv.1**, narrow at Ember and widening to a turbulent curved rim, with **zero fireball projectiles**. Extent follows the existing shared gameplay rank contract; no range, angle, damage, cooldown or tier-gate changes were introduced by this preview revision.

### Approved reference

![Approved connected Flame Fan reference](/api/rooms/DRe6a2c6f1487f8fcbeed0d6b5/attachments/DAe091fce2f57db19172f44833)

### Implementation and validation

Uses the installed NixieFX/Pixi renderer with one stationary sheet billboard and a preview-specific procedural polar flame material. Increasing curled strata, density and heat are part of the rendered fire, beyond rank labels and radius changes. Actor atlas copies and a reduced manifest are packaged under the preview prefix, with no edits to shared game sprites. Material rendering uses 300×200 pixels, composited with 600×400 actor/UI scenes and a 30-frame/s scheduling cap to limit comparison cost. WebGL is required. This is a procedural interpretation of the painted reference; exact painted curls and actual game projection/occlusion are outside this candidate.

TypeScript and Vite production builds pass. Existing Go Flame Fan sector tests at every rank and the Lv.1 multi-target auto-cast test pass. Final local and public Chromium runs pass at 1440×900, 390×844 and 320×560: all five ranks at casting/opening/impact/fade phases (0.20/0.58/0.95/2.20 seconds), loaded actor assets, shared comparison clock/scale, controls and loop completion, rank/card selection, Day/Night, mobile horizontal scrolling, no document overflow, and cross-origin iframe playback. Zero browser errors and HTTP failures in the final reports. Visual review covered local/live desktop and mobile scenes, all five synchronized ranks, casting, opening, hits and fading. This is browser emulation, not a real-device GPU benchmark.

Rendered image checks at 1.35 seconds confirm increasing flame coverage and gold/bright-core coverage for every adjacent rank. Public flame-colored pixel counts at the common 600×400 scene size are 19,574 / 27,436 / 38,002 / 50,292 / 63,971; gold/bright counts are 399 / 410 / 514 / 1,313 / 5,584. These support visual progression; they do not represent damage or a hardware performance result.

Code commit: `447ea13` on `feat/stronghold`, pushed to origin. Published through the supported additive preview pipeline. Shadow task #IPLAM was inspected before edits/deployment; its recorded deployed work and shared uncommitted files were preserved. The preview layer updates only its own URL prefix. No game release, gateway change or unrelated integration change was made.

### Desktop evidence

![Ember casting with three actual Revenants before flame release](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-1440-lv3-0.2.png)

![Lv.1 flame impact and synchronized Lv.1–5 comparison](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-1440-lv1-0.95.png)

![Lv.2 two-layer flame with combat actors](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-1440-lv2-0.95.png)

![Lv.3 three-layer flame with combat actors](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-1440-lv3-0.95.png)

![Lv.4 dense folds and hotter impact effects](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-1440-lv4-0.95.png)

![Lv.5 layered flame and strongest contacts](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-1440-lv5-0.95.png)

![Opening Lv.1 fan before the hit reactions](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-1440-lv1-0.58.png)

![Fading Lv.5 fan with visible recovered actors](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-1440-lv5-2.2.png)

### Mobile evidence

![Mobile Lv.1 opening fan and scrollable comparison](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-390-lv1-0.58.png)

![Mobile Lv.5 impact with Ember and enemies](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-390-lv5-0.95.png)

![Compact mobile fading Lv.5](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-320-lv5-2.2.png)

![Local mobile Lv.5 visual verification](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/local-390-lv5-0.95.png)

![Local casting visual verification](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/local-1440-lv3-0.2.png)

![Local Lv.1 combat and comparison verification](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/local-1440-lv1-0.95.png)

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