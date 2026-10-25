## Ember Warden shared skill tree

Live game: https://ark-whachat.fural.space/?offline=1&hero=ember-warden

Stage 2 extends the existing `SkillTree` renderer and shared `public/skill-tree/v1` FrameSet kit. Ember adds a 15-node roster and a separate icon-only kit at `public/skill-tree/ember-v1` (@1x/@2x/@3x). Flame Fan uses the existing painted hero-picker master; Cinder Step, Ember Snare and the molten attacks are cut from the approved Stage 1 reference. Shared painted blessings and concept silhouettes use an ember palette. Regenerate with `node scripts/ember-tree/build-assets.mjs`.

The portrait tree has two columns with spacious rows and flows bottom to top; desktop flows left to right. HUD bounds, frame, elbow connectors, fades, chevrons, highlight and scrolling are shared with Rift. Active nodes have five rank pips; passive emblems have neither frame nor pips. Seismic Slam (Molten) uses a two-line label with pips below it.

Ember tap/left click casts using the existing cast renderer. A 450 ms touch/pen hold or mouse right-click opens the tree, focuses that slot's node and suppresses release casting. K toggles; X, Escape and outside close. Learned actives can be equipped/swapped through the existing shared slot interaction. Rift preserves its newer auto-cast and HUD tap-to-equip behavior.

All 12 implemented nodes read live progression: Flame Fan/Cinder Step/Ember Snare, `cleave` (Molten Cleave), `shockwave` (Seismic Slam Molten), and `heal/might/nova/leech/haste/vitality`. Ascendant Star reads `run.stars`; slots read `run.slots`. Second Wind's rank is acquisition count, not a continuing buff. Inferno Avatar, Caldera Eruption and Solar Fan remain unlearned concepts with no combat IDs or offers. Ultimate/evolution recipes, rank-3 forks and respec remain unimplemented concepts. Ember acquisition gates are the next existing task; this stage does not alter its card offers.

## Verification

- `node scripts/ember-tree/verify.mjs` builds a production bundle and checks 1440×900 and 390×844. `VERIFY_URL=https://ark-whachat.fural.space` checks deployment. Fresh state, ranks, passive shape, pips, 1/2/3 slots, unequipped learned node, gestures, no inspection cast, tap cast, scrolling, concept explanation, capstone and closing all pass with zero page errors.
- `node scripts/ember-tree/verify-rift.mjs`: live Rift desktop/mobile K/Esc, HUD tap-to-tree, slot focus and no cast pass with zero page errors.
- `node scripts/skill-tree/verify-gates.mjs`: 30,400 Rift offers gated; 30,400 Ember offers identical to baseline.
- TypeScript, production build, Go tests and co-op release smoke pass.
- The release includes the full tree kits at all densities. A live audit checks 90 Ember icon variants plus three shared ring densities (93 HTTP 200 responses).

The original shared-clone Vite run was affected by pending peer UI assets/settings and a shared dependency-cache error. Final local evidence uses a production bundle; live evidence uses the real deployed game. Headless checks use `quality=low`; the initial desktop screenshot also exercised the default renderer. No browser page errors occur in the successful production/live runs.

The full game was deployed by `scripts/fural-deploy.sh` from a committed isolated worktree. The lazy @2x packaging gap found by live mobile was corrected in the script and deployed with the supported Arkodia layer publisher. No peer uncommitted files were included or discarded.
