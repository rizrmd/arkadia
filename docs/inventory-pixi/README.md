## Pixi inventory migration

Inventory presentation is entirely inside the existing game UI stage. Generated bag/item/slot/button textures are Pixi Sprites, frames are NineSliceSprites and all English text/counts are Pixi Text. There is no inventory DOM dialog or stylesheet. This does not migrate other game menus.

The existing inventory store still owns Web Lock transactions, finite stack limits, save migration, effect rollback and success-only consumption. Solo gameplay and the automatic renderer pause while the inventory is open; explicit renders update only when inventory state changes. Opening resets movement keys and the touch stick. World pointer/skill handling remains gated by the existing modal checks. Pointer/touch controls, backdrop, I/Escape, Tab/Shift+Tab, left/right selection and Enter/Space run inside the Pixi presentation. Keyboard focus uses a rendered cyan ring. Previous DOM focus is restored on close.

The viewport layout uses side details on desktop/landscape and stacked details on portrait. Every active target is at least 44 pixels at the tested sizes: 1440×900, 390×844, 844×390, 667×375 and 320×568.

Run `node scripts/test-inventory.mjs` for store regressions and `node scripts/verify-inventory-pixi.mjs` for actual game interaction checks. `VERIFY_URL=https://ark-whachat.fural.space node scripts/verify-inventory-pixi.mjs` checks production. Historical inventory verifier entry points delegate to the Pixi checks. The browser uses the existing `3d=0` hero fallback, independently of inventory rendering. Mouse and browser-emulated touch are exercised; physical-device testing is not claimed.

Debug inspection: `window.__INVENTORY__.renderer` is `pixi`; `.overlay` and `.bag` expose actual Pixi containers. The verifier locates rendered controls and clicks their global bounds, rather than calling inventory actions directly. Actual enemy damage, Use potion, Use scroll, persistence, add/remove, Settings exclusion and blessing guard are checked.
