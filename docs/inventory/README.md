## Early consumables and responsive inventory

Implemented for #HXSUC. Open the gold bag below the minimap or press I. Desktop details sit beside the grid; mobile details and Use sit below it. The solo inventory pauses simulation and background rendering. Close, backdrop, I and Escape resume play. Portrait controls reserve space above the skill sockets.

Only Health Potion and Stronghold Teleport Scroll exist. New and legacy saves receive five potions and two scrolls once. There are eight visible slots, one stack per item type and a 99-item stack cap. Explicit empty stacks do not refill after reload. No drop/reward sources, equipment or crafting were added.

Potion restores 40% of maximum HP and cannot be wasted at full HP. Scroll uses the validated teleport API to reach the existing Stronghold spawn, saves that position and cancels auto-walk. It is retained if teleport fails, the hero is dead or already home, or a conflicting gameplay choice is open. It grants no rewards and preserves combat progression. Consumables are solo-only; co-op remains server authoritative.

Counts live in the existing Stronghold save and share its Web Lock with economy writes and progression reset. Add/remove reject invalid counts, overflow and underflow. Use rechecks gameplay conditions inside the lock, rejects overlapping requests and rolls gameplay back if the save write fails. The existing reset creates a fresh inventory with starter counts.

## Verification

- `node scripts/test-inventory.mjs`: migration, concurrent add/remove, stacks, bounds, duplicate use, failed effect, save failure rollback and save/load.
- `node scripts/test-stronghold.mjs`: eight existing economy/save/offline cases.
- `node scripts/test-snow-progress.mjs`: checkpoint, extraction and first-clear reward persistence.
- `node scripts/verify-inventory-layout.mjs`: component browser checks at 1440×900, 390×844, 844×390, 667×375 and 320×568, including the longer scroll details, touch slot sizes, visible Use and portrait control gutter.
- `node scripts/verify-inventory.mjs`: actual game, real enemy damage, potion healing, scroll return, count and position reload persistence, add/remove, desktop/mobile layouts, keyboard and focus. `VERIFY_URL` selects the live site. Tests use an isolated browser profile and the existing `3d=0` fallback to avoid an unrelated pre-existing hero shader error.
- `npm run build`: TypeScript and production Vite build.

The English Knowledge page "Early Consumables — Item Progression Concepts" contains the approved references, implementation details and inline validation images. Local and live reports are stored alongside this document. Release uses `scripts/fural-deploy.sh` from a clean committed checkout to avoid packaging peers' uncommitted work.
