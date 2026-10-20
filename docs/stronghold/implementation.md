## Playable stronghold

Open `/stronghold.html` in the existing Arkadia Vite build. `npm run build` typechecks and builds the stronghold, arena and expedition pages together. Arena and expedition have return links. The arena study remains at `/index.html`.

## Economy and provisional balance

All economy constants are in `src/stronghold/economy.ts` (`BALANCE`). Start: 600 Gold, 80 Mana, 20 Soul Shards. Mine yields 120 Gold/hour/level; Mage Tower yields 12 Mana/hour/level. Each stores ten hours at its current production rate. Gold and Mana are claimed together, in whole units; fractional output remains stored. Full storage loses overflow. Settlement occurs before spending/upgrading, so the elapsed period uses the old rate. Backwards clocks never move the settlement timestamp backwards.

Seven fixed slots share a detail panel. Every building has three restoration stages, reusing the existing asset base and adding repair beams/light. Upgrade Gold cost is `100 × currentLevel²`; Mage Tower also costs `20 × currentLevel` Mana; level-three restoration costs 5 Soul Shards. Other buildings require Mine at the target level. These numbers and the linear HP progression are sandbox hypotheses, not final design.

| Building | Working action | Restoration effect |
| --- | --- | --- |
| Mine / Farm | Claim Gold and Mana | 120 / 240 / 360 Gold/hour; ten-hour storage |
| Altar | Spend 10 Soul Shards once to unlock Warden blessing (+20 arena HP) | Visual restoration; further faction unlocks are not implemented |
| Barracks | Buy HP rank for 80 / 160 / 240 Gold, +10 arena HP each | Opens one training rank per level |
| Forge | Craft weapon tier for 60 Gold × forge level, +10 HP per tier. When at current tier, reroll for 30 Gold + 10 Mana through Vital / Guard / Stalwart (+0 / 5 / 10 HP) | Opens next craftable weapon tier |
| Mage Tower | Learn Vitality for 30 / 60 / 90 Mana, +5 HP each | 12 / 24 / 36 Mana/hour and one skill rank per level |
| Expedition Table | Navigate to existing seeded world, clear locations, dispatch and claim | Visual restoration only; dispatch rules remain in the world |
| Run Gate | Enter existing arena with permanent HP bonuses; return after five kills for 100 Gold, 20 Mana, 3 Soul Shards | Visual restoration only; no difficulty scaling |

Run entry creates a unique current run ID. A return claim must match that ID, have at least five kills, and not have been rewarded. Starting another run invalidates the previous unclaimed run. Returning before five kills gives no reward. Refreshing the arena restarts local combat; HP bonuses apply again on entry and revival. Arena potions retain the existing 100-HP cap. Expedition materials and XP remain in its separate existing save and do not silently convert into stronghold currencies.

## Save and transaction model

`arkadia-stronghold-v1` in browser localStorage stores balances, production timestamps/fractions, levels, Warden, training, weapon/affix, skills and run reward IDs. Each mutation acquires a same-origin Web Lock, reads the latest save, validates it, settles idle output, applies the action and writes one complete snapshot. UI updates only after the write. This prevents repeated click and concurrent-tab claims. Unsupported browsers show a transaction error. JSON backup export/import is available; imports intentionally replace local progress. Invalid saves are retained and reported rather than silently reset.

This is local single-player persistence using the device clock. Browser save edits, importing old backups and clock-forward cheating are not prevented. There is no server authority, account sync, multi-device merge or anti-cheat guarantee.

## Scope and art limitations

The current asset kit has environment props, not dedicated building sprites. The hub reuses arches, wall, tree, relic and rubble bases with named selection targets, repair beams and restrained furnace animation. The Mage Tower currently reuses the relic tree silhouette. Dedicated buildings, decorative townsfolk, free placement, faction rosters, branching skill tree, damage/speed training and full loot inventory/affix randomness are not implemented. Altar/table/gate restorations are explicitly cosmetic. Buttons describe working actions rather than suggesting those subsystems exist.

Legacy arena/world display text is translated in the integration layer without changing world biome identifiers or saved procedural snapshots. The arena movement, sprite extraction and character source modules are untouched.

## Verification

- `node scripts/test-stronghold.mjs`: eight tests for offline cap and overflow, duplicate claims, clock rollback, upgrade spending and requirements, action rank/hero limits, persistence and invalid saves, run ID rewards, and pre-upgrade production rates.
- `npm run build`: TypeScript and three-page production build.
- `node scripts/browser-stronghold.mjs`: seven selectable slots; 48-hour absence capped at ten hours; repeated and concurrent-tab claims; upgrade spending/persistence; forge craft; expedition dispatch/early claim; arena HP integration; run return reward; desktop and 390px mobile; no page errors.
- The run reward browser assertion uses a controlled five-kill fixture to isolate the bridge; it does not claim a full manual combat playthrough.

Browser results: `docs/stronghold/browser-results.json`. Screenshots: `docs/stronghold/desktop.png` and `docs/stronghold/mobile.png`.

## Public deployment

Verified public preview: https://arkadia-stronghold-whachat.fural.space/

Custom sandbox `arkadia-stronghold` has a persisted, supervised boot script serving the three-page build from its own `dist` directory. It is independent of this AgentSession. The `/` route opens the stronghold; `/index.html` opens the existing arena. `sandboxes serve` was used to publish build outputs. Large uploads hit the platform's 30-second gateway timeout and left partial files; completing smaller batches through the same supported command resolved it. Public browser smoke passed after the final code upload. Screenshots and the public browser report are also served under `/evidence/stronghold/`.

Peer movement changes remained in the separate legacy `~/arkadia` clone. This task uses the registered linked clone and branch `feat/stronghold`; no peer character, sprite, movement, or extraction files were changed or committed.
