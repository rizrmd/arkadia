## Infinite Wood & Food Mode

The production release enables `INFINITE_WOOD_FOOD = true` in `src/stronghold/resource-mode.ts`. The English Pixi HUD shows **∞ Wood** and **∞ Food**, including the real infinity glyph in the versioned Garamond body atlas. No JavaScript `Infinity`, mode flag, or replacement balance is written into player saves.

Construction skips only Wood and Food affordability and deductions. Gold, Mana/Souls where applicable, faction permissions, completed Stronghold Core/Farm prerequisites, maximum levels, solo restrictions and published durations still apply. Current published recipes do not charge Food; the shared cost policy also handles a Food cost without granting other resources. Food consumption for hunger remains finite and follows its existing rules.

### Building actions

Core, Farm, Lumber Mill, Kitchen, Walls and Mine panels now use the same recipe functions for preview and committed transactions. Previously these panels were previews with every transaction disabled. The current-operation button becomes interactive only when its actual prerequisites, other funds and construction queue permit it; target-level previews cannot submit a skipped-level upgrade. Both faction defense creation paths also use the Wood/Food policy, keeping their existing Core-12, faction and site checks.

One active construction job is persisted in the existing economy envelope. It records finite start/deadline timestamps and source/target completed levels. Gold and normal-mode Wood are charged once when starting. Published durations are unchanged and completion grants exactly one level after the deadline, including after reopening. Queue and save writes use the existing gameplay/economy ownership lock. A failed write changes neither the saved envelope nor the live gathering owner. Core completion flushes gameplay before reloading its level-specific world artwork. Other completed metadata refreshes the panels; Mine also retains the original playable building presence flag. Existing legacy upgrades keep their Gold/Mana/Souls rules.

Normal-mode common panel Wood uses the existing **stored Wood** balance; faction defense creation uses **carried Wood**, as before. Carried and stored balances are never replaced by infinity. No new free food, hunger behavior, map objects, storage transfer system, cancellation/refund behavior or terrain changes are introduced.

### Disable procedure

1. Change `INFINITE_WOOD_FOOD` to `false` in `src/stronghold/resource-mode.ts`.
2. Run `node scripts/infinite-resources/test.mjs`, `node scripts/infinite-resources/browser-off.mjs`, and the normal TypeScript/build checks.
3. Commit, push the cumulative branch and deploy through `scripts/infinite-resources/deploy.sh`. The script acquires the existing `~/releases/arkodia-deploy.lock`, rechecks production ancestry and uses the established additive publisher.
4. Reload the game. Wood/Food counters show the untouched finite balances; future starts require and charge finite Wood/Food again. Already paid, queued jobs keep their deadlines and are not charged again. No save migration, reset, map republish or save-directory replacement is needed.

The toggle is release configuration, not a per-player cheat query or a localStorage override. To enable it again, change the same boolean to `true` and deploy.

### Validation

Focused rules cover both modes across all six create/upgrade recipes at baseline and level 29, all Gold/Core/Farm/max/co-op rejections, both faction create paths, unaffected Mana/Souls, queue duplicates, early/deadline completion, reloads, legacy fields, malformed/nonfinite save rejection and storage-failure rollback. Actual Pixi desktop and portrait touch tests exercise all six creation/upgrade buttons and repeated taps. A separate Vite run compiles the actual disabled configuration and checks all six zero-Wood disabled buttons plus normal finite deductions. Existing inventory, economy, progression, gathering and full gameplay persistence regressions are retained.

The cumulative release includes the active panel task's approved inner padding and control fixes, plus terrain ancestry. Additive deployment preserves `GAME_SAVE_DIR`, map archives and existing assets. Release and production verification JSON record the actual build, enabled flag, entry bundle hashes and published-map revision/hash.

### Browser scope

The actual local full game rendered both infinity labels and accepted a physical Lumber Build click with zero stored Wood. It saved the exact one-minute deadline, charged 75 Gold and preserved all four finite resource balances. A subsequent full-world reload exceeded its bounded 60-second initialization window with no page/network errors; this does not replace the passing focused save/load, real-store and desktop/portrait controller checks. Production verification records its own bounded full-game attempt separately.

### Verified production release

Live at https://arkodia.online/ with runtime commit `0b33347279599c034cf98c925227dd871d898184`. The production mode manifest reports `infiniteWoodFood: true` for that exact commit. All 44 release files match served hashes or decoded image pixels. The versioned font contains U+221E. Published terrain remains revision **3**, **67 objects**, SHA-256 `ad5a14c9496d1ee19e5c6eeae56a84bd85df5c548f137a5a098f5bbba16fd0cf`.

The actual production browser smoke passed with zero page errors and zero failed requests: live telemetry returned `∞ Wood` and `∞ Food`; a physical Pixi Lumber Build click with zero stored Wood charged **75 Gold**, left carried Wood **11**, Food **17**, stored Wood **0**, stored Food **19** unchanged, and saved the exact **60,000 ms** deadline. These numbers belong to an isolated browser validation save, not a user's existing save. See `production.json`, `live-smoke.json`, `tests.json`, `browser.json`, and `browser-off.json` in this directory.
