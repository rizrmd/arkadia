## Behavior

Solo active skill unlocks and equipped slots are saved immediately, separately for Rift Runner and Ember Warden. Refreshing or reopening the game restores every learned active (including an unequipped fourth skill) at its base rank and restores the three-slot loadout. No blessing or resource payment is needed to use or equip a restored skill.

The original run lifecycle remains: level, XP, run gold, passive blessings, stars, rank upgrades, queued choices, cooldowns and combat effects start fresh on reload. Restored base ranks do not count as new cards spent toward tier gates. Owned skills can rank up through the existing owned-skill bypass; other tier gates, four-learned/three-equipped limits and rank caps are unchanged. Diagnostic co-op remains authoritative and does not read or write solo skill saves.

## Storage and compatibility

`arkodia.skills.rift-runner.v1` and `arkodia.skills.ember-warden.v1` store version, learned IDs and equipped slots only. The Stronghold economy/inventory save is not modified by this feature. Mage Tower purchases remain in the existing economy save. Missing skill records behave like an earlier fresh run. Previously lost in-memory skills cannot be recovered retroactively.

Malformed, unsupported-version and cross-hero records are retained rather than overwritten. A failed unlock write leaves the pending choice and current run untouched, with an English Pixi notice; a failed equip leaves the loadout untouched. Reset Progression explicitly removes both skill records while retaining preferences and hero choice. Saves belong to this browser/device; clearing site storage removes them.

## Verification

- `node scripts/skill-unlocks/test.mjs`: real XP/roll/choose, both heroes, four learned/three slots, unequipped skill, swaps, repeated hydration, fresh run gates, legacy economy retention, paid Mage Tower rank retention, invalid/future data, failed writes and reset allowlist.
- `node scripts/skill-unlocks/browser.mjs`: production bundle, desktop 1440×900 and touch 390×844 for both heroes; actual Pixi card unlock, failed-write rollback/retry, two reloads, learned tree node, cast without repayment, independent hero records and unchanged legacy currency/inventory.
- `VERIFY_URL=https://ark-whachat.fural.space node scripts/skill-unlocks/browser.mjs`: repeat on the deployed release.
- Existing progression/settings tests, 608 TS/Go offer-and-choice parity cases and the Go suite pass. The supported game deployment also runs the production build and co-op smoke.

Reports: `unit.json`, `browser-local.json`, and (after live verification) `browser-live.json`.
