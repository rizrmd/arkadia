## Live gameplay — automatic skills and skill tree

**Integrated into the actual game in commit `e6bfc959`.** [Play Ember Warden](https://ark-whachat.fural.space/?offline=1&hero=ember-warden). Clicking/tapping a HUD skill or pressing **1/2/3 opens the skill tree** for that slot. Select a learned active node to equip it or swap slots. These inputs do not cast skills. Equipped skills auto-cast when a living enemy enters the existing detection radius and their cooldown permits it. K opens the tree; X, Escape and outside close it.

Learning and rank upgrades still come from the existing level-up cards. While a card choice is pending, 1/2/3 selects a card. The existing 0/4/8-card tier gates, Lv.20 capstone, rank-five cap, four learned actives and three equipped slots remain unchanged. Co-op loadout editing retains its existing solo-only restriction; online damage remains server-authoritative.

## Compact connected flame

Flame Fan is one stationary **108° forward AoE from Lv.1 through Lv.5**, with **zero fireball projectiles**. It damages every living target in the sector once per cast and excludes rear/out-of-range targets and targets behind blocking walls. The renderer uses the actual 64/32 isometric projection, caster tile, camera scale and combat radius. It does not add cosmetic range.

Compared with the prior review, maximum sheet opacity is reduced from 0.675–0.975 to **0.385–0.565**, added height and bloom are zero, and Flame Fan contact particles use **0.28× their former linear scale**. One through five curled strata and increasing heat distinguish ranks. The full existing attack reach remains broad, especially at Lv.5 on a phone; it was preserved rather than silently changing balance. The sheet lasts 850 ms after the existing 420 ms cast release. It lies under actors and uses wall-ray clipping plus a cached upright-object silhouette mask through the existing ground occlusion contract.

| Rank | Curled layers | Radius (tiles) | Rank damage multiplier | Cooldown (ms) |
|---|---:|---:|---:|---:|
| Lv.1 | 1 | 4.400 | 1.00× | 1400 |
| Lv.2 | 2 | 5.192 | 1.25× | 1288 |
| Lv.3 | 3 | 5.984 | 1.50× | 1185 |
| Lv.4 | 4 | 6.776 | 1.75× | 1090 |
| Lv.5 | 5 | 7.568 | 2.00× | 1003 |

Damage remains 0.78× base skill damage, multiplied by rank and existing combo modifiers. Existing critical-hit handling, cooldown/passive modifiers and the 0.38-tile target-body collision allowance remain unchanged. That collision allowance does not enlarge the flame graphic. Cast and network timing rules are unchanged.

## Embedded comparison player

<iframe src="https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/" title="Flame Fan — compact gameplay material and rank comparison" height="820"></iframe>

[Open player](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/) · [Alternate player URL](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/). Both URLs use the same material as gameplay. The selected scene and five comparison cards share one clock, camera and scale: 38 pixels per world unit, a 0.5 ground squash and actor scale proportional to the game's 0.66 display scale. The review player illustrates contact reactions; actual damage is verified in the game, not simulated by this player. English controls provide rank selection, Play/Pause, Replay, Loop, Day/Night and scrubbing; the comparison scrolls horizontally on mobile.

## Verification and delivery

Local and public actual-game checks pass at **1440×900** and touch **390×844**, for every rank. They check HUD click/touch and 1/2/3 opening the tree without casting, real pointer selection/equip, normal automatic casting, three forward enemies damaged, rear/range exclusion, rotated aim, correct radius/rank/layers and zero projectiles. **The primary acceptance tests call no manual cast API or forced auto-cast helper.** They prepare controlled eligible level-up offers and enemies, use the real input/selection/equip handlers, then let normal gameplay perform the casts. Preview mode is used only to arrange and inspect the fixture, then disabled for the actual automatic cast.

[Live desktop auto-cast/tree report](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/automatic-live-1440.json) · [Live mobile report](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/automatic-live-390.json) · [Local desktop](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/automatic-local-1440.json) · [Local mobile](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/automatic-local-390.json) · [Validation](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/validation.json) · [TS/Go gate parity](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/progression-parity.json).

TypeScript and production builds, all Go tests (including Flame Fan sector and Lv.1 multi-target auto-cast), progression checks and 608 exact TS/Go progression cases pass. Existing Ember gates and Rift progression remain intact. The main player passes local/live desktop, portrait and compact 320×560 checks across all ranks and four phases, synchronized comparisons, controls, loop completion, loaded actors, no overflow and cross-origin iframe playback. The alternate player passes desktop/mobile actor/rank/control checks. Final reports contain no page errors or failed HTTP asset requests. These are Chromium desktop/mobile emulation checks, not a real-device GPU benchmark.

[Live player report](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/verification-live.json) · [Alternate URL report](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/legacy-player-live.json).

The supported clean-checkout game pipeline built the committed code and preserved peer WIP. Game layer: `1792939846632-game-e6bfc959-b2a6b2f4027b`. The first upload stopped before registration after a TLS handshake timeout; the same archive resumed through the supported release publisher. Immutable part transfers now have bounded transient retries; registrations and restarts are not blindly retried. No fast deployment or host injection was used.

## Live automatic gameplay evidence

![Live 1440px — automatic Flame Fan Lv.1](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/live-auto-1440-lv1.png)

![Live 1440px — automatic Flame Fan Lv.2](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/live-auto-1440-lv2.png)

![Live 1440px — automatic Flame Fan Lv.3](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/live-auto-1440-lv3.png)

![Live 1440px — automatic Flame Fan Lv.4](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/live-auto-1440-lv4.png)

![Live 1440px — automatic Flame Fan Lv.5](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/live-auto-1440-lv5.png)

![Live 390px — automatic Flame Fan Lv.1](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/live-auto-390-lv1.png)

![Live 390px — automatic Flame Fan Lv.2](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/live-auto-390-lv2.png)

![Live 390px — automatic Flame Fan Lv.3](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/live-auto-390-lv3.png)

![Live 390px — automatic Flame Fan Lv.4](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/live-auto-390-lv4.png)

![Live 390px — automatic Flame Fan Lv.5](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/live-auto-390-lv5.png)

## Skill-tree equip evidence

![Live 1440px — Cinder Step equipped through the tree; Flame Fan swapped to Skill 2](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/live-tree-equipped-1440.png)

![Live 390px — Cinder Step equipped through the tree; Flame Fan swapped to Skill 2](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/live-tree-equipped-390.png)

## Before and after scale comparison

These earlier controlled sector captures use the same actor assets, camera, fixture and time of day, with the original combat module from edaf903 for the before view. Capture scheduling and random critical hits can differ. They isolate the VFX change; the automatic-gameplay reports above are the evidence for the corrected control flow.

![1440px — previous particles at Lv.1](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/before-game-1440-lv1.png)

![1440px — compact connected sheet at Lv.1](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/local-game-1440-lv1.png)

![390px — previous particles at Lv.1](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/before-game-390-lv1.png)

![390px — compact connected sheet at Lv.1](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/local-game-390-lv1.png)

## Local supporting evidence

![Local desktop — automatic Lv.3 cast with combat actors](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/local-auto-1440-lv3.png)

![Local mobile — equip through the actual skill tree](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/local-tree-equipped-390.png)

## Approved reference

![Approved connected Flame Fan reference](/api/rooms/DRe6a2c6f1487f8fcbeed0d6b5/attachments/DAe091fce2f57db19172f44833)

## Retained player and historical evidence

Previous inline image links are retained below. The shared-player images now show the compact revision. Images under the older flame-fan-levels/evidence path document the superseded particle release and do not show the new gameplay integration.

![Flame Fan evidence — live-1440-lv3-0.2.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-1440-lv3-0.2.png)

![Flame Fan evidence — live-1440-lv1-0.95.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-1440-lv1-0.95.png)

![Flame Fan evidence — live-1440-lv2-0.95.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-1440-lv2-0.95.png)

![Flame Fan evidence — live-1440-lv3-0.95.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-1440-lv3-0.95.png)

![Flame Fan evidence — live-1440-lv4-0.95.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-1440-lv4-0.95.png)

![Flame Fan evidence — live-1440-lv5-0.95.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-1440-lv5-0.95.png)

![Flame Fan evidence — live-1440-lv1-0.58.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-1440-lv1-0.58.png)

![Flame Fan evidence — live-1440-lv5-2.2.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-1440-lv5-2.2.png)

![Flame Fan evidence — live-390-lv1-0.58.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-390-lv1-0.58.png)

![Flame Fan evidence — live-390-lv5-0.95.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-390-lv5-0.95.png)

![Flame Fan evidence — live-320-lv5-2.2.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/live-320-lv5-2.2.png)

![Flame Fan evidence — local-390-lv5-0.95.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/local-390-lv5-0.95.png)

![Flame Fan evidence — local-1440-lv3-0.2.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/local-1440-lv3-0.2.png)

![Flame Fan evidence — local-1440-lv1-0.95.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/evidence/local-1440-lv1-0.95.png)

![Flame Fan evidence — live-1440-lv1-flame.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-1440-lv1-flame.png)

![Flame Fan evidence — live-1440-lv2-flame.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-1440-lv2-flame.png)

![Flame Fan evidence — live-1440-lv3-flame.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-1440-lv3-flame.png)

![Flame Fan evidence — live-1440-lv4-flame.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-1440-lv4-flame.png)

![Flame Fan evidence — live-1440-lv5-flame.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-1440-lv5-flame.png)

![Flame Fan evidence — live-game-1440-lv1.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-game-1440-lv1.png)

![Flame Fan evidence — live-game-1440-lv5.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-game-1440-lv5.png)

![Flame Fan evidence — live-390-lv1-flame.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-390-lv1-flame.png)

![Flame Fan evidence — live-390-lv2-flame.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-390-lv2-flame.png)

![Flame Fan evidence — live-390-lv3-flame.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-390-lv3-flame.png)

![Flame Fan evidence — live-390-lv4-flame.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-390-lv4-flame.png)

![Flame Fan evidence — live-390-lv5-flame.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-390-lv5-flame.png)

![Flame Fan evidence — live-game-390-lv1.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-game-390-lv1.png)

![Flame Fan evidence — live-game-390-lv5.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-game-390-lv5.png)

![Flame Fan evidence — local-1440-lv1-flame.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/local-1440-lv1-flame.png)

![Flame Fan evidence — local-game-390-lv1.png](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/local-game-390-lv1.png)

