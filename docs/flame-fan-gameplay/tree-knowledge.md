## Current controls — automatic skills

Updated for gameplay commit `e6bfc959`: Ember now follows the same automatic-skill control flow as Rift. **Tap/left-click a HUD skill or press 1/2/3 to open the skill tree** for that slot, then tap a learned active node to equip or swap it. These inputs do not cast. Equipped skills auto-cast on nearby enemies when ready. Existing level-up cards still grant learning/ranks; 1/2/3 selects a pending card instead of opening the tree. Hold/right-click remains an alternate way to inspect the tree. K toggles; X, Escape and outside close. Tier gates, rank limits and co-op authority are unchanged. This supersedes the earlier tap-to-cast specification below.

[Current Flame Fan gameplay and inline evidence](/organizations/ORd5dd6f99b4308d6187031557/knowledge/NKBDbd185330904c8926506f945e) · [Live desktop checks](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/automatic-live-1440.json) · [Live touch/mobile checks](https://ark-whachat.fural.space/ember-warden-review/flame-fan-gameplay/automatic-live-390.json).

## Flame Fan AoE correction — delivered

Flame Fan is a 108° forward flame sector at every rank, including Lv.1. It damages every target inside the fan, respects walls, and emits **zero fireball projectiles**. Base radius is 4.4 tiles with +18% per rank; damage gains +25% per rank and cooldown is reduced by 8% per rank. Existing 0/4/8 card tier gates and Lv.20 capstone remain unchanged. This confirmed correction supersedes historical fireball counts and projectile-travel descriptions.

<iframe src="https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/" title="Flame Fan Level 1–5 AoE Animation Player" height="560"></iframe>

[Full Flame Fan mechanics and inline evidence](/organizations/ORd5dd6f99b4308d6187031557/knowledge/NKBDbd185330904c8926506f945e) · [Open corrected player](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/).

Live desktop/mobile actual-game tests pass across all ranks: three forward targets damaged, rear target excluded, zero projectiles. Desktop/portrait/compact player controls and iframe pass. Go, progression and Ember/Rift gate regressions pass.

![Live Lv.1 desktop flame area](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-1440-lv1-flame.png)

![Live Lv.1 mobile game](https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/evidence/live-game-390-lv1.png)

## Stage 3 — tier-gated level-up cards (live)

Implemented in the offline TypeScript client and authoritative Go simulation. [Play Ember Warden](https://ark-whachat.fural.space/?offline=1&hero=ember-warden). Feature commit `60a6021`; combined game release `ae35079`, pushed and deployed through `scripts/fural-deploy.sh`. TypeScript, production build, all Go tests, co-op smoke and release scan passed. The public game and health endpoint return HTTP 200. Peer committed work was included; peer uncommitted files were preserved. Final acceptance evidence is committed as `0a62df1` and integrated into `feat/stronghold`.

### Rules and live state

| Tier | Gate before choosing | Real card IDs |
|---|---|---|
| Root and I | 0 prior cards taken | Flame Fan `flame-fan`, Cinder Step `cinder-step`, Ember Snare `ember-snare`, Second Wind `heal`, Titan Strike `might` |
| II | 4 prior cards taken | Molten Cleave `cleave`, Seismic Slam (Molten) `shockwave`, Arc Nova `nova`, Soul Feast `leech` |
| III | 8 prior cards taken | Chrono Surge `haste`, Furnace Heart `vitality` |
| Capstone | Pending offer level 20 or later | Ascendant Star `star` |

Points count every selected card, including repeated passives, Second Wind and active rank-ups; free Flame Fan costs zero. Both paths record Second Wind acquisitions, so ranks plus stars minus the free root reconstruct the count. Tier II normally opens for the Lv.6 offer, Tier III for Lv.10. Batched level-ups use the pending pick's level for Ascendant Star. At Lv.20, Ascendant Star occupies the passive offer.

Owned active rank-ups bypass acquisition tiers while below rank five. Ember allows four learned actives and three equipped slots. A fourth learned active can rank up while unequipped. Passive effects and repeatability are retained. The shared offer builder preserves one passive plus two actives whenever possible, then fills with other eligible distinct cards. Invalid locked, capped and stale choices are refused. Tree nodes show **4 pts**, **8 pts** or **Lv. 20** requirements while locked. Inferno Avatar, Caldera Eruption and Solar Fan stay excluded from offers. Ultimate/evolution, rank-3 forks, respec and the proposed five-passive limit remain concepts.

### Verification and release

- **30,769 Ember client offers**, four strategies and 400 seeds; **1,612 valid fallback offers**.
- **22,800 Ember Go offers** and **608 exact TS/Go offer-and-choice comparisons** using the same random tape.
- Boundaries **0/3/4/7/8 points**, batched pending picks, owned-tier bypass, rank five, four learned/three equipped, unequipped rank-ups, all-actives-capped passive fallback and stale-choice rejection pass.
- **30,400 Rift client offers** exactly match Stage 2 baseline `2de5e4d`; **5,700 Go Rift states** match that baseline's golden digest. The older Rift verifier now points to Ember's approved gate checks.
- Production-bundle and final live checks at **1440 × 900** and touch **390 × 844** pass all 19 offers from Lv.2 through Lv.20 with **zero page errors**. The first offer contains only Tier I cards or a Flame Fan rank-up. Browser smoke uses diagnostic `offer()` to advance levels through actual roll/choose functions without injecting card contents; seeded client checks separately exercise XP rewards.
- Final game layer: `1792922650259-game-ae35079-c6b79d77bdde`. Accepted evidence layer: `1792922823066-ember-tier-gates-accepted-74d6484e12c9`. All 12 report/image URLs return HTTP 200.

[Seeded/parity results](https://ark-whachat.fural.space/ember-warden-review/tier-gates/verification.json) · [Live results](https://ark-whachat.fural.space/ember-warden-review/tier-gates/browser-live.json) · [Local results](https://ark-whachat.fural.space/ember-warden-review/tier-gates/browser-local.json) · [Release record](https://ark-whachat.fural.space/ember-warden-review/tier-gates/delivery.json)

Reproduce with `node scripts/ember-gates/verify.mjs`, `node scripts/ember-gates/smoke.mjs`, and `VERIFY_URL=https://ark-whachat.fural.space node scripts/ember-gates/smoke.mjs`.

### Live desktop and mobile evidence

![Live Ember desktop — first levelup](https://ark-whachat.fural.space/ember-warden-review/tier-gates/live-desktop-first-levelup.webp)

![Live Ember desktop — locked tree](https://ark-whachat.fural.space/ember-warden-review/tier-gates/live-desktop-locked-tree.webp)

![Live Ember mobile — first levelup](https://ark-whachat.fural.space/ember-warden-review/tier-gates/live-mobile-first-levelup.webp)

![Live Ember mobile — locked tree](https://ark-whachat.fural.space/ember-warden-review/tier-gates/live-mobile-locked-tree.webp)

### Local production-bundle evidence

![Local Ember desktop — first levelup](https://ark-whachat.fural.space/ember-warden-review/tier-gates/local-desktop-first-levelup.webp)

![Local Ember desktop — locked tree](https://ark-whachat.fural.space/ember-warden-review/tier-gates/local-desktop-locked-tree.webp)

![Local Ember mobile — first levelup](https://ark-whachat.fural.space/ember-warden-review/tier-gates/local-mobile-first-levelup.webp)

![Local Ember mobile — locked tree](https://ark-whachat.fural.space/ember-warden-review/tier-gates/local-mobile-locked-tree.webp)

Stage 4 can consume this committed TS/Go gate baseline and the existing shared tree for Flame Fan Lv.1–5 animations/player. Its existing session remains responsible for that work.

## Stage 2 implementation — live game

The Ember Warden tree is implemented in the shared Rift Runner `SkillTree` renderer, with a separate Ember icon kit. [Play Ember Warden](https://ark-whachat.fural.space/?offline=1&hero=ember-warden). The overlay uses a spacious two-column portrait tree flowing bottom to top and a horizontal desktop tree flowing left to right. It reserves the HUD area and reuses the gold panel, ring frames, five active rank pips, borderless passive emblems, slot badges, elbow connectors, fades, chevrons, scrollbars and pulsing focus. Long labels have room for a second line.

### Controls and live state

For **both heroes**, tap/left-click a HUD skill or press 1/2/3 to open the skill tree for that slot. Tap a learned active node to equip or swap it. Skills cast automatically on nearby enemies when ready; HUD and tree taps do not cast. Hold (450 ms on touch/pen) or right-click remains an alternate inspection gesture. K toggles; X, Escape and outside close. Co-op retains server authority.

Fresh runs learn only **Flame Fan Lv. 1** in slot 1. Active ranks and passive acquisition counts come from `run.skills`; Ascendant Star comes from `run.stars`; badges 1/2/3 come from `run.slots`. Learned unequipped nodes have no slot badge. Second Wind is an immediate heal; its displayed rank counts acquisitions, not an ongoing buff. Ember-facing names are Cinder Step, Molten Cleave (`cleave`) and Seismic Slam (Molten) (`shockwave`), with no new combat IDs.

**Placeholders:** Inferno Avatar, Caldera Eruption and Solar Fan have no gameplay IDs, remain dim/unlearned, have empty rank pips, and explain **Concept only** when selected. No ultimate/evolution mechanics, rank-3 forks or respec were added. Ember tier gating belongs to the next queued task; this stage preserves its existing offers and does not impose Rift's gates on Ember.

### Assets

`public/skill-tree/ember-v1` contains 15 colored and dim icon pairs at @1x/@2x/@3x. `node scripts/ember-tree/build-assets.mjs` regenerates them. Flame Fan reuses the painted hero-picker master; Cinder Step, Ember Snare and molten attacks are cut from the approved Stage 1 art. Blessings and concept silhouettes reuse shared painted art in an ember palette. Shared panel/components stay in `public/skill-tree/v1`; no second renderer or duplicated frame kit was introduced.

### Verification and deployment

Local production-bundle and live checks pass at **1440 × 900** and **390 × 844**, with **zero browser page errors**. They cover fresh state, real ranks/passives, five active pips/no passive pips, slot badges, learned unequipped state, inspection without casting, quick-tap tree opening, drag/wheel scrolling, concept explanation, capstone reachability and all closing controls. Live Rift desktop/mobile regression also passes: K/Esc, fresh root, HUD tap-to-tree, focus and no manual cast. The deterministic gate regression checks 30,400 Rift offers and confirms 30,400 Ember offers identical to baseline.

TypeScript, production build, Go tests and the co-op release smoke passed. The game was pushed and deployed through `scripts/fural-deploy.sh` from a committed isolated worktree (feature `d3bef36`, integrated release `7a8edb4`). Live mobile found a missing lazy @2x asset; all tree kit densities were then published and the release packaging fixed. The final audit checks **93 asset URLs**, all HTTP 200. A concurrent peer release caused transient 502s during the first audit; health and assets recovered without a duplicate restart. Shared peer uncommitted files were preserved.

[Local check report](https://ark-whachat.fural.space/ember-warden-review/tree-implementation/results-local.json) · [Live check report](https://ark-whachat.fural.space/ember-warden-review/tree-implementation/results-live.json) · [Rift live regression](https://ark-whachat.fural.space/ember-warden-review/tree-implementation/rift-live-regression.json) · [Asset density audit](https://ark-whachat.fural.space/ember-warden-review/tree-implementation/asset-http.json)

### Live desktop screenshots

![Ember live desktop — fresh](https://ark-whachat.fural.space/ember-warden-review/tree-implementation/live-desktop-fresh.webp)

![Ember live desktop — inspect](https://ark-whachat.fural.space/ember-warden-review/tree-implementation/live-desktop-inspect.webp)

![Ember live desktop — concept](https://ark-whachat.fural.space/ember-warden-review/tree-implementation/live-desktop-concept.webp)

### Live mobile screenshots

![Ember live mobile — fresh](https://ark-whachat.fural.space/ember-warden-review/tree-implementation/live-mobile-fresh.webp)

![Ember live mobile — inspect](https://ark-whachat.fural.space/ember-warden-review/tree-implementation/live-mobile-inspect.webp)

![Ember live mobile — concept](https://ark-whachat.fural.space/ember-warden-review/tree-implementation/live-mobile-concept.webp)

### Local verification screenshots and asset sheet

![Ember local desktop — fresh](https://ark-whachat.fural.space/ember-warden-review/tree-implementation/local-desktop-fresh.webp)

![Ember local desktop — inspect](https://ark-whachat.fural.space/ember-warden-review/tree-implementation/local-desktop-inspect.webp)

![Ember local desktop — concept](https://ark-whachat.fural.space/ember-warden-review/tree-implementation/local-desktop-concept.webp)

![Ember local mobile — fresh](https://ark-whachat.fural.space/ember-warden-review/tree-implementation/local-mobile-fresh.webp)

![Ember local mobile — inspect](https://ark-whachat.fural.space/ember-warden-review/tree-implementation/local-mobile-inspect.webp)

![Ember local mobile — concept](https://ark-whachat.fural.space/ember-warden-review/tree-implementation/local-mobile-concept.webp)

![Ember painted icon kit](https://ark-whachat.fural.space/ember-warden-review/tree-implementation/icon-sheet.png)

Stage 3 can now consume the committed panel and the Stage 1 mapping for Ember tier gates. Stage 4 retains its existing session for Flame Fan animations/player.

## Final Stage 1 specification

Stage 1 delivers the reconciled design contract, generated overlay art and an interactive browser layout specification. The game integration, tier gates and Flame Fan level player belong to the three existing follow-up tasks below. This section supersedes the exploratory roster and provisional placement in the historical concept below.

[Open the interactive overlay specification](https://ark-whachat.fural.space/ember-warden-review/tree-stage1/) · [Download mapping JSON](https://ark-whachat.fural.space/ember-warden-review/tree-stage1/mapping.json) · [Final imagegen prompts](https://ark-whachat.fural.space/ember-warden-review/tree-stage1/prompts.json)

<iframe src="https://ark-whachat.fural.space/ember-warden-review/tree-stage1/" title="Ember Warden Stage 1 Overlay Specification" height="760"></iframe>

### Generated desktop overlay

![Generated desktop art reference: spacious Ember Warden overlay with horizontal scrolling](https://ark-whachat.fural.space/ember-warden-review/tree-stage1/generated-desktop.png)

### Generated mobile overlay

![Generated mobile art reference: Ember Warden bottom-to-top overlay](https://ark-whachat.fural.space/ember-warden-review/tree-stage1/generated-mobile.png)

### Exact layout and acquisition states

The generated art is illustrative. Use the deterministic review layout and mapping for exact counts, orthogonal rails, state and spacing. Its skill glyphs remain temporary design placeholders.

![Ember Warden layout specification — desktop fresh](https://ark-whachat.fural.space/ember-warden-review/tree-stage1/desktop-fresh.png)

![Ember Warden layout specification — mobile fresh](https://ark-whachat.fural.space/ember-warden-review/tree-stage1/mobile-fresh.png)

![Ember Warden layout specification — desktop slots](https://ark-whachat.fural.space/ember-warden-review/tree-stage1/desktop-slots.png)

![Ember Warden layout specification — mobile slots](https://ark-whachat.fural.space/ember-warden-review/tree-stage1/mobile-slots.png)

![Ember Warden layout specification — desktop capstone](https://ark-whachat.fural.space/ember-warden-review/tree-stage1/desktop-capstone.png)

![Ember Warden layout specification — mobile capstone](https://ark-whachat.fural.space/ember-warden-review/tree-stage1/mobile-capstone.png)

## Final mapping and implementation handoff

Finalized 2026-10-25. Design assets and specification only. No game panel, offer gates, animation player, balance, cast logic, rank-3 modifiers or respec are implemented by this stage. The interactive HTML is a review mockup, not a live run. `mapping.json` is the machine-readable handoff. Generated images are art references; the HTML layout is authoritative for exact pips, states and orthogonal connectors.

## Source reconciliation

Read existing Ember concept NKBDd961f11ef4da28d4544d39f2, Ember Skills NKBD4e400e0774ede4382c22e651 and its published Flame Fan/Molten Cleave/Seismic Slam pages, Rift Runner concept NKBD31f3ae4d19b3058f3b779637, and current Rift Runner discussion. Existing hierarchy is retained: Characters → Ember Warden → Ascension Tree Concept; no duplicate root page.

| Tier | Gate for new acquisitions | Active node / real game id | Passive node / real game id |
|---|---|---|---|
| Start | Free on new run | Flame Fan / `flame-fan`, Lv. 1, Slot 1 | — |
| I | 0 cards taken | Cinder Step / `cinder-step`; Ember Snare / `ember-snare` | Second Wind / `heal`; Titan Strike / `might` |
| II | 4 cards taken | Molten Cleave / `cleave`; Seismic Slam (Molten) / `shockwave` | Arc Nova / `nova`; Soul Feast / `leech` |
| III | 8 cards taken | No implemented active at this tier | Chrono Surge / `haste`; Furnace Heart / `vitality` |
| Capstone | Offer level 20 or later | — | Ascendant Star / `star` |

All twelve entries above already exist as gameplay skills/blessings. Tier placement is the final Ember design for the queued gate task; Ember offers remain ungated until that task ships. `cleave` is named Astral Cleave in the shared card catalog, but the Ember VFX/Knowledge name is Molten Cleave; do not create another combat ID. `shockwave` is Seismic Slam with the Ember molten appearance; keep the full name in detail text and allow a two-line node label. `cinder-step` has the legacy blessingTitle Ember Nova; standardize its Ember-facing label to Cinder Step in the panel task without changing combat behavior.

Read active rank from `run.skills[id]` and the equipped badge from `run.slots` index + 1, never infer slot from tree position. Read passive acquisition count from `run.skills[id]`, except Ascendant Star from `run.stars`. Second Wind is an immediate 35% heal; its displayed Lv. is times selected, not an ongoing buff. Audit recording of heal in both TS and Go before deriving points from ranks. Prefer an explicit cards-taken count if persistence/state cannot reconstruct it safely.

## Concepts retained, excluded from offers

Inferno Avatar and Caldera Eruption are proposed mutually exclusive ultimate choices; no real game ID, implementation or approved balance. The inherited Level 10 milestone is illustrative, not an operative gate. Solar Fan is a proposed evolution; no real ID or implemented recipe. Level 15+, Flame Fan Rank 5 and Chrono Surge are possible design inputs only, not a required recipe. Rank-3 forks, Stronghold respec, reroll/banish, a separate ultimate slot, and a five-passive cap remain concepts. Show concept nodes as permanently dim with a separate Concept only detail; never offer or unlock them. Tier III must not depend on owning an ultimate or evolution.

## Progression and offer requirements for the queued task

Points are level-up cards taken BEFORE the current selection; free Flame Fan costs zero. Any valid card pick, including a repeat passive or rank-up, adds one. For sequential picks Tier II first becomes available after the fourth pick (the next pick normally belongs to character Lv. 6), Tier III after the eighth (normally Lv. 10). Use the pending offer level when several levels were earned at once, not final character level, for the Lv. 20 capstone.

Owned active rank-ups bypass acquisition tier checks while below rank 5. Preserve existing passive caps/effects and current shared max learned-active limit (currently 4 in TS peer WIP; confirm committed TS/Go parity before implementation); there are three equipped slots. Do not silently ship the earlier design's five-passive cap or ultimate slot. Learned-but-unequipped nodes have a Lv. badge but no slot badge. Preserve two active plus one passive offers when possible, otherwise use another eligible card, never an empty card or a locked skill. Ascendant Star occupies the passive offer at the Lv. 20 milestone if eligible. Compare Ember/Rift seeded behavior and test TS/Go parity; leave Rift Runner's peer-owned gate rules intact.

## Layout and state specification

| Requirement | Desktop 1440 × 900 | Mobile portrait 390 × 844 |
|---|---|---|
| Flow and scroll | Left → right; horizontal only; open at left root | Bottom → top; vertical only; open at bottom root |
| Panel bounds | Below top HUD; reserve right minimap and lower skill arc | 16 px outer margin; below HUD, above lower skill arc |
| Interior spacing | 48 px content inset; 212 px group pitch | 24 px target content inset; 218 px group pitch |
| Nodes | 72 px active ring; 144 × 166 px complete block | 64 px ring; 124 × 166 px complete block |
| Empty gutter | At least 40 px between complete blocks | At least 32 px vertical gap; 28 px between left/right blocks |
| Input | Wheel/drag/scrollbar, keyboard focus | Finger scroll, scrollbar; 44 px close target |

Keep glyph, label, Lv. badge, five pips, slot badge and focus glow inside each reserved block. Active nodes are round with exactly five pips in every state; passives are bare emblems with no frame and no pips. Learned = color + Lv.; unlearned = dim. Only the free root starts learned. Slot demo is a distinct valid Lv. 3 state after taking Cinder Step and Ember Snare; it keeps Flame Fan at Lv. 1. No separate Equipped bar. Thin simple right-angle rails use empty gutters and do not establish individual skill prerequisites. Use a central trunk and parallel branches within each tier. Show edge fade, thin gold scrollbar and direction chevron. Keep gameplay dim (55% darkness target), existing HUD readable, and avoid squeezing the entire 15-node roster into the viewport. Mobile landscape follows existing Rift panel fallback when no HUD-free region is available.

The generated desktop reference has four pips on the unlearned Seismic Slam and a generic portrait; the generated mobile reference uses diagonal joints. These are generator artifacts, not requirements. The deterministic overlay specification corrects exact pip counts and elbow geometry and uses a game screenshot as background. Its glyph icons are placeholders for the queued asset task, not production assets.

## Dependency handoff — three existing tasks only

1. **fuzlhneftjfbdapjjwfydvfb — Assets and game panel.** Depends on Stage 1 mapping and layout. Extend the existing shared Rift tree renderer/FrameSet kit; do not duplicate the panel. Reuse `public/skill-tree/v1` ring/pips/slot badges, existing Flame Fan icon and Ember VFX palette. Add Ember-specific painted icons and names, three explicitly nonfunctional concept nodes, live skills/stars/slots state, auto-scroll/focus, mobile long-press 450 ms and desktop right-click. Tap/left click opens the skill tree; equipped skills cast automatically. Preserve Rift behavior. Verify fresh and later loadouts, all pips, passive shape, scroll ends, slots, HUD-free bounds, 390×844 and 1440×900 with no browser errors. Publish English Knowledge + inline screenshots, commit only owned files, push/deploy.
2. **uhebtkicamkgvujqcqvesemg — Ember tier gating.** Depends on Stage 1 mapping; integrate after panel task to avoid shared-file conflicts. Implement 0/4/8 card gates and Lv. 20 capstone in BOTH client TS and authoritative Go paths. Keep concept IDs out of pools. Test 0/3/4/7/8 point boundaries, batched pending picks, rank caps, full learned-active pool, exhausted type fallback and seeded Lv. 1–20 runs with no blank or locked offers; first Ember offer has Tier I or Flame Fan rank-up only. Assert Rift regression behavior remains unchanged. Update Knowledge/live screenshots and ship.
3. **hwspqzbmmhhklmqkexqyfhmy — Flame Fan levels and player.** Depends on Stage 1 identity/rank contract, then queued panel/gate integration baseline. Reuse existing Ember renderer, NixieFX recipes and the Rift Bolt peer player's control pattern once available; do not duplicate Rift Bolt work. Deliver Flame Fan as a forward flame sector at every rank, with zero fireball projectiles. The embedded corrected player supersedes the historical projectile contract.

Stage 1 does not start duplicate sessions: the three queued tasks already have durable sessions per the Ember room. Each must read this handoff and wait for its dependency to be done, then proceed under its own scope.

## Art generation provenance

Built-in imagegen, two separate ui-mockup calls, final prompts in `prompts.json`. Original PNGs retained without editing. Generated images are visual references; the review HTML controls exact layout/states. Browser screenshots and verification JSON accompany this delivery. No production gameplay verification is claimed for a design-only stage.

## Verification and release

Commit `374d955` on `feat/stronghold`, pushed. Design-only layer published at https://ark-whachat.fural.space/ember-warden-review/tree-stage1/. Local and live browser checks passed at 1440 × 900 and 390 × 844 with zero page errors. Checked fifteen nodes, five pips per active, zero passive pips, only Flame Fan initially learned, slot demo badges 1/2/3, initial scroll origin, reaching the capstone, close, reopen and Escape. Live verification is recorded in [verification.json](https://ark-whachat.fural.space/ember-warden-review/tree-stage1/verification.json). Final live checks passed at both viewports with zero page errors. All eight delivered images are embedded inline above. Review HTML is served under the existing Ember review allowlist; the first unlisted route returned the game shell and is not a supported entry point. A transient restart/502 cleared before live verification. The published design layer preserves the game and other review layers.

## Historical exploration

The earlier images and notes below are retained as concept history; they do not override the final specification above.

## Visual direction

Concept exploration adapted from the current Rift Runner discussion and approved tree presentation. This is a generated UI concept, not an implemented gameplay change.

- Desktop progresses left to right; mobile progresses bottom to top.
- Active skills use round antique-gold frames with five rank pips. Passive blessings are borderless emblems without pips.
- Only Flame Fan starts acquired, with a colored ember icon, one filled pip and a Lv. 1 badge. Other icons are grayscale.
- Use English node names, charcoal surfaces, ivory serif typography and simple orthogonal connectors. Omit titles, portraits, logos, tier headers, locks, checkmarks and Learned text.

## Desktop

![Ember Warden desktop ascension tree concept](/api/rooms/DRe6a2c6f1487f8fcbeed0d6b5/attachments/DA47f80a21af82e9e67b5585bd)

## Mobile portrait

![Ember Warden mobile ascension tree concept, progressing bottom to top](/api/rooms/DRe6a2c6f1487f8fcbeed0d6b5/attachments/DA6823f20e3644e373bb94ba63)

Flame Fan is the root at the bottom, and Ascendant Star is the capstone at the top. A central vertical trunk uses short orthogonal branches. The same fifteen nodes and acquisition states are retained. Generated connectors are illustrative; this is not an authoritative prerequisite graph.

## Node roster

| Group | Active skills | Passive blessings |
| --- | --- | --- |
| Start | Flame Fan | — |
| First group | Cinder Step, Ember Snare | Second Wind, Titan Strike |
| Second group | Molten Cleave, Seismic Slam (Molten) | Arc Nova, Soul Feast |
| Proposed ultimate choice | Inferno Avatar or Caldera Eruption | — |
| Proposed evolution group | Solar Fan | Chrono Surge, Furnace Heart |
| Capstone | — | Ascendant Star |

The five base skills come from the published Ember Warden Skills page. Inferno Avatar, Caldera Eruption and Solar Fan are new illustrative proposals for this concept, not approved abilities or existing unlocks. Passive placement, prerequisites, ranks, slot counts, level gates and balance require a separate gameplay decision. The image abbreviates Seismic Slam (Molten) to Seismic Slam.

## Generation notes

Generated using built-in imagegen. Prompt direction: adapt the current Rift Runner tree layout into Ember Warden volcanic-fire imagery; retain round actives, borderless passives, English names, orthogonal connectors and a single acquired Flame Fan root. The mockup does not alter the live game.

## Spacing revision

The desktop and mobile concepts above were regenerated with smaller icons, wider gaps between node blocks, more room around labels and rank pips, and larger outer margins. Mobile retains bottom-to-top progression.

Prompt: preserve the existing fifteen-node Ember Warden concept and English labels; reduce icon scale, add generous consistent padding and margins between complete node blocks, and route orthogonal connectors through empty gutters. Generated with built-in imagegen.

Visual QA: the desktop generator added rank pips to passive emblems; those pips are an illustration artifact and should be omitted according to the visual direction above. These remain concept images, not live game changes.