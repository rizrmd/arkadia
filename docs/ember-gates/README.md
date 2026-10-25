## Ember Warden tier gates

Stage 3 implements the finalized mapping in both offline TypeScript and authoritative Go progression. Every chosen card counts as one point; the free Flame Fan rank costs none. Tier I is available immediately; Tier II needs four prior picks and Tier III eight. Ascendant Star uses the pending offer level, first appears at Lv.20, and occupies that milestone's passive offer.

Owned active rank-ups bypass acquisition tiers, stop at rank five, and remain eligible while unequipped. Ember allows four learned actives and three equipped slots. Passives keep their existing repeatable effects/counts. The shared offer builder preserves one passive plus two actives when available, then fills with other valid distinct cards. Capped or stale invalid choices are refused. Concept ultimates/evolution, rank-three forks and respec remain unimplemented.

The tree shows 4 pts, 8 pts and Lv.20 requirements. Rift's card rules and random sequence are unchanged.

## Verification

- `node scripts/ember-gates/verify.mjs`: 30,769 Ember offers, 1,612 valid fallback offers, 30,400 exact Rift baseline comparisons, 22,800 Go Ember offers, 608 exact TS/Go random-tape offer and choice comparisons. Includes point boundaries 0/3/4/7/8, batched level-ups, rank caps, full learned slots, unequipped rank-ups and stale choice rejection.
- Go Rift regression: 5,700 seeded states match the digest captured from commit 2de5e4d.
- `node scripts/ember-gates/smoke.mjs`: production bundle at 1440x900 and touch 390x844; real roll/choose functions through Lv.20, first offer, tree gate labels, concepts excluded, no page errors. Diagnostic `offer()` advances a level without injecting card contents; deterministic checks separately exercise XP reward progression.
- `VERIFY_URL=https://ark-whachat.fural.space node scripts/ember-gates/smoke.mjs`: repeat against deployed game.
- TypeScript and all Go tests pass. Actual game deployment uses `scripts/fural-deploy.sh`; a separate review layer publishes evidence at `/ember-warden-review/tier-gates/`.

Results: `verification.json`, `browser-local.json`, and after deployment `browser-live.json`.
