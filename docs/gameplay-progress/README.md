## Complete gameplay checkpoints

Solo play now resumes the current game for each hero across refresh and browser close/reopen. Checkpoints include level, current/max HP, XP, run gold, stars, learned active and passive ranks, all equipped slots, pending blessing choices, hero position and combat clip/impact/immunity/death timing, enemies and corpses, spawn timing, RNG state, uncollected souls, projectiles and their already-hit enemies, pending AoEs, burn-soil elapsed time and emitted ticks, cooldowns, gate animation/health, route destination, elapsed gameplay and day-clock phase.

Gameplay simulation pauses while the page is hidden or closed. A restored checkpoint advances from its saved simulation time rather than catching up wall-clock time. Existing passive Stronghold resource income retains its established economy rules. The current game has no separate poison/slow/buff inventory; its implemented timed gameplay states are fighter immunity/hit/death, cooldowns, projectiles, AoEs and burn soil, all covered by the checkpoint.

## Save ownership and compatibility

The existing `arkodia-stronghold-v1` envelope gains a `gameplay` map keyed by hero. Existing currency, inventory, upgrades, buildings, reward ledgers and unknown fields are preserved. Without a checkpoint, existing per-hero skill-unlock records seed the current run; legacy files are retained. New snapshots retain additional ranks and passives rather than converting them back to base rank.

A page holds exclusive Web Locks for gameplay and the economy envelope. Other solo tabs wait before creating a hero or writing position. Same-page economy transactions execute under that ownership; consumable counts and gameplay effects commit in one atomic localStorage write. Autosave runs every 500 ms, after blessing/equip changes, on visibility loss and on pagehide. Compare-and-swap revision checks reject stale snapshots or a save erased by explicit reset. Invalid/future checkpoints remain intact and show an English Pixi notice. If a collision update blocks a saved foot position, restoration searches only nearby walkable ground while retaining the full run; if no nearby position exists, the original save is kept and play waits for recovery. Write failures pause simulation and retry the unchanged in-memory state. Settings Reset Progression explicitly erases both heroes' saved games and legacy unlocks while keeping preferences and hero choice.

## Co-op authority

Diagnostic co-op remains server-owned and never imports a solo checkpoint or client reward claims. Rooms save full private simulation checkpoints by temporary-file write, fsync and atomic rename under `GAME_SAVE_DIR`; the gateway uses a persistent `game-saves` directory outside release assets. Checkpoints include RNG state, retired players, souls, private skill cooldowns and burn-soil timers. Empty rooms pause and remain available across browser and server reopen. When other players remain online, the shared world continues while disconnected heroes and their personal effect timers wait.

Only a private 192-bit resume credential can reclaim a hero; public player IDs are not credentials. The browser stores only room/identity/credential for co-op resume. Rejoining retains server HP/progression and ignores a new client maximum-HP claim. Invalid resume identities do not silently create a replacement hero. Explicit Leave ends automatic resume. A checkpoint write failure pauses room simulation until persistence succeeds. Startup rejects unsupported/corrupt server checkpoints instead of overwriting them.

## Maintaining the checkpoint contract

New gameplay-bearing fighter fields, statuses, world timers or rewards must be added to capture, restore and validation together. Bump or migrate the schema when meanings change. Store remaining simulation time, never an offline wall-clock deadline, and retain consumed/rewarded markers in the same atomic checkpoint.

## Verification

- `node scripts/gameplay-progress/test.mjs`: legacy preservation, both heroes, full roundtrip, stale writers, quota failure/retry, atomic consumable envelope, future saves, reset fence and burn-soil deadlines without repeated ticks.
- `node scripts/gameplay-progress/browser.mjs`: production build, desktop 1440×900 and touch 390×844, both heroes, real combat damage/death, ranks/passives/pending choices, uncollected souls and reward markers, two exact reloads, full Chromium shutdown/relaunch using the same persistent profile, paused offline durations and independent heroes. Checks compare state while loading still holds simulation.
- `node scripts/gameplay-progress/coop.mjs`: real WebSocket movement/combat, forged reward/checkpoint rejection, public-ID takeover rejection, offline pause and actual Go server stop/restart with retained identity, HP, position and progression.
- Existing progression, inventory, settings, Frostpass reward, legacy unlock and Go suites cover compatibility. Server checkpoint tests compare the next 100 simulation ticks with an uninterrupted world.

Browser fault checks (`scripts/gameplay-progress/faults.mjs`) exercise legacy migration, quota pause/retry, actual Pixi consumable rollback/atomic commit, multi-tab ownership, future-save preservation, explicit reset and automatic mobile browser co-op resume. `scripts/gameplay-progress/verify-release.mjs` verifies public health, the running Go build identity and every compiled JS/CSS asset against the release SHA-256 manifest. Browser acceptance and release verification reports are published with the deployed release. Browser tests are intentionally sequential to stay within the shared sandbox memory budget; each hero/device case takes several minutes with the software renderer.
