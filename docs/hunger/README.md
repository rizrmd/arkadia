## Behavior

Hunger starts at 100% and loses 10 percentage points per saved 10-minute simulation day. It reaches zero after exactly ten game days (100 simulation minutes). The existing bounded gameplay steps advance both gathering time and hunger; wall time, offline time, pinned lighting and reloads add no hunger depletion. Zero hunger has no HP effect.

Tap the meat/Food counter beneath the top-right Gold and utility controls. One carried Food restores 20 percentage points, capped at 100%. Full hunger or no carried Food spends nothing. Stored Food is never used. Feedback is English and rendered entirely in Pixi. Hunger sits beneath the HP/clock area.

Hunger is shared with the existing shared gathering state across heroes. Legacy saves missing hunger initialize to 100% on their next checkpoint. Invalid saved values are rejected with the original retained. Food, hunger, gathering and the current hero checkpoint commit together under the existing gameplay/economy lock and revision guard. Write failures roll back eating and stop gathering. Reset Progression clears hunger with gathering. Server reconnect uses the existing checkpoint envelope without wall-time settlement of hunger.

## Verification

- `node scripts/hunger/test.mjs`: exact ten-day depletion, daily rate, lower/upper clamps, repeated taps, empty Food, reload, legacy and invalid values.
- `node scripts/hunger/component.mjs`: actual Pixi controller and gameplay adapter, desktop clicks, phone portrait/landscape touch taps, atomic reload and injected storage-quota rollback.
- `node scripts/hunger/smoke.mjs`: full game, collision, harvest/save/reload, real automatic deer melee/loot, meat pointer tap and hunger/Food reload. Existing software-browser fallback `3d=0&shadowField=0` avoids hardware rendering requirements.
- Existing gathering, economy, inventory, gameplay persistence and Go checks remain required.

Release uses `scripts/hunger/deploy.sh`, the supported additive publisher, the shared deployment lock and the latest-game ancestor guard. Existing art/review routes, map data, gameplay persistence, cliffs, settings, skills and resources remain cumulative.

## Shipped evidence

Production applied `1793109682660-game-a742c8ec-c54e3eca896e`; health reports `a742c8ec90006c020edcfa66c4a158d60d805c35`. All 46 public release files/routes passed verification, with JavaScript bytes checked by SHA-256 and losslessly converted PNG checked by visible RGBA. The final merged source passed the full local gameplay browser run and the real Pixi mouse/touch controller suite.

Public-domain browser startup encountered QUIC and Cloudflare 520 asset transport errors. Disabling QUIC diagnosed the transport failure; the historical sandbox alias returned 404. These are retained as failed browser attempts, not claimed as passes. The meaningful validation alternative is final-source full local gameplay, real desktop/mobile pointer input and persistence, plus exact production build/asset checks. No production restart was required for these browser failures.
