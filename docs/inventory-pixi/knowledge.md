## Current direction
Early-game scope contains only two consumables: Health Potion and Stronghold Teleport Scroll. Use smooth, non-pixel 2D illustrations, simple everyday forms, broad shading, and strong silhouettes readable at small inventory sizes. Avoid intricate ornament and excessive glow. The approved concepts are implemented and live-verified by #HXSUC.

## Current visual reference
![Non-pixel Health Potion and Stronghold Teleport Scroll concept with small icon previews](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA4a2f0b47796423caf2d25fc2)

Generated exploratory illustration. Small previews communicate the intended readability; final in-game size still requires validation.

## Consumables
| Item | Proposed use | Visual cue |
|---|---|---|
| Health Potion | Restore health; consumed on use. | Simple round red bottle with a plain cork. |
| Stronghold Teleport Scroll | Return to the Stronghold; consumed after successful teleport. | Cream parchment with one large blue stronghold symbol. |

Implementation tuning and restrictions are documented below.

## Superseded references
The following concepts are retained only as discussion history. Pixel art, additional consumable types, and equipment are outside the current early-game scope.

![Superseded pixel-art consumable exploration](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DAe81527e2ed5425e3398a53bb)

![Superseded equipment exploration](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA659457aeda8306c79a33eb6d)

## Inventory UI exploration
The two-item visual direction was approved. This mockup explores an inventory bag button and responsive desktop/mobile landscape panels matched to the supplied gameplay HUD: charcoal surfaces, thin gold frames, and ivory labels. Desktop shows item details beside the grid; mobile places details below larger touch slots. Only Health Potion and Stronghold Teleport Scroll are included. Stack counts and slot capacities are illustrative, not finalized rules. All UI copy is English. This is the approved generated mockup; the implemented behavior is documented below.

### Gameplay screenshot reference
![User-provided snowy gameplay HUD reference](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA65db71ba59c8cdc64b007a89)

### Desktop and mobile inventory concept
![Desktop and mobile inventory concept with bag button and two consumables](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA3b08091d9b143fdb36a42f28)

## Implementation
Implemented by #HXSUC in commit `3205e15` (pushed). Clean production build and full-game verification passed. Follow-up commits `1a06b31` and `18c9441` freeze the background renderer while inventory is open and keep portrait panels above skill controls. The final gameplay guard is included in the committed Settings integration and regression check `5b4daf6`. Supported deployment and final live verification are complete; final evidence appears below.

### Items and tuning
- Only Health Potion and Stronghold Teleport Scroll are supported. Icons are smooth SVG illustrations with broad color areas, a red round bottle and a cream scroll with a large blue tower.
- New saves and legacy saves without an inventory receive five potions and two scrolls once. Explicit zero counts stay zero after reload. No automatic refill, drops, equipment, crafting or additional consumables were introduced. The module exposes locked add/remove operations for future reward sources.
- Capacity is eight visible slots with one stack per item type and a maximum of 99 per stack. Empty slots are presentation space for the early inventory; only the two approved types are valid. These counts and capacity are tuning choices, not quantities inferred from the mockup.
- Potion restores 40% of maximum HP, capped at maximum. Full-health and dead heroes cannot use it.
- Scroll returns instantly to the existing Stronghold hero spawn using the normal collision-validated teleport API. It does not heal, reset combat progression or grant run rewards. The return position is saved immediately, and auto-walk is cancelled. Already-home, dead or unsuccessful teleports retain the scroll. No cast timer or combat interruption rule was added.

### Save safety and gameplay transitions
Inventory is part of the existing `arkodia-stronghold-v1` save. Add, remove and use share its Web Lock with economy transactions and reset; read migration preserves unrelated progression fields. Counts are finite whole numbers, bounded from zero to 99. Invalid changes and insufficient stock are rejected. Use has an in-flight guard; conditions are rechecked inside the lock. Gameplay effects run synchronously before consumption is saved; failed effects do not commit, and save-write failure undoes the gameplay effect.

Consumables are currently solo-only because co-op combat is server authoritative. Hero selection, clock, lobby, world map, skill tree and blessing choices prevent opening another inventory overlay. Blessing choices retain their existing non-modal gameplay and movement; only inventory opening is gated during a choice. Inventory blocks movement and skill input and pauses solo game frames and the background renderer until closed. It retains the current HP, skills, level and enemies while open. Existing Reset Progression recreates the same Stronghold save and therefore resets consumable counts to the starter allocation.

### Responsive controls
The gold bag button is under the minimap, separate from the skill sockets. It reserves space next to the Settings gear where present. Desktop uses a grid with side details. Mobile uses touch slots, details beneath the grid and a wide Use button. The compact landscape layout keeps Use visible. Safe-area padding is applied at each screen edge; overlay pointer and keyboard handling prevents interaction with gameplay controls beneath it. Close, backdrop, I and Escape dismiss the panel; keyboard focus returns to the opener and Tab stays inside the panel.

### Verification history
- Transaction tests pass: legacy save migration, concurrent stacking, add/remove, invalid/negative/overflow guards, duplicate use, save rollback, failed/successful teleport and save/load.
- Browser component layout checks pass at 1440×900, 390×844, 844×390, 667×375 and 320×568; all touch slots are at least 44 pixels, and Use stays inside the viewport.
- Earlier full-game desktop verification confirmed real enemy damage, potion healing, one-scroll return, saved return position and persisted counts. Its initial keyboard assertion incorrectly expected a disabled Use button to receive focus; corrected to check enabled focus targets.

### Iteration evidence
These interim screenshots were inspected during implementation and are retained as validation history. They show the initial twelve-slot layout before the eight-slot tuning. The landscape capture exposed a clipped Use button; that layout was corrected and passed the component viewport checks above. Final release screenshots appear below.

![Interim desktop inventory with scroll details](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA7866208167d3f1aba8577816)

![Interim portrait inventory before compact tuning](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DAd32c89b33655fef28d9ad86d)

![Interim landscape regression showing clipped Use button, subsequently fixed](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA4ec87f7c7bd4363f31939da7)

### Clean game verification
The clean committed game passed real enemy damage and potion healing (84 → 100 HP), successful return teleport consuming exactly one scroll, repeated-use guards, persisted counts (four potions and one scroll) and Stronghold position after reload, add/remove stacking, I/Escape and keyboard focus trapping. Full-game desktop (1440×900), portrait (390×844) and landscape (844×390) layouts and touch-slot bounds passed with zero page errors. The existing 2D hero fallback (`3d=0`) was used because an unrelated pre-existing 3D shader emitted a GLSL integer/float compile error; inventory icons are SVG and independent of that renderer. Existing economy tests (eight cases) and Frostpass checkpoint/reward tests also passed.
### Eight-slot game captures before final portrait spacing
These full-game baseline images passed touch/use visibility checks; the final release adds a larger portrait skill-control gutter.

![Eight-slot portrait game inventory baseline](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DAde8ed55c02728b1713f4abd8)

![Eight-slot landscape game inventory baseline](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA24815004f5921bfe91ee196e)

### Final release and live verification
#HXSUC shipped through the repository-supported `scripts/fural-deploy.sh` from a clean committed checkout. Inventory was published in game release `5b4daf6`, layer `1792919544044-game-5b4daf6-b90275c01bc4`. Subsequent peer deployments integrated it into the verified live game `ade07d2` (layer `1792919754727-game-ade07d2-ae20577e0f18`). Git ancestry confirms the inventory commits are included, and the served HTML exactly matches that integrated release archive. Peer Settings, Rift Runner and Ember Warden work is preserved.

Live game: https://ark-whachat.fural.space/ . The smoke run used the existing 2D fallback at https://ark-whachat.fural.space/?3d=0 .

The final live browser run passed at 1440×900, 390×844 and 844×390. It confirmed real enemy damage and healing (84 → 100 HP), exactly one scroll consumed on successful return, return position and counts preserved on reload (four potions, one scroll), add/remove, full-HP and already-home guards, I/Escape, focus trapping, Settings exclusion in both directions and preservation of the non-modal blessing flow. There were zero page errors. Both live SVGs match the committed files byte-for-byte and return HTTP 200; health and existing Rift Bolt/Ember review URLs also return 200. The longer scroll details passed component checks at five viewports, including 667×375 and 320×568. Production build, all Go server tests, the deployment co-op smoke, eight economy regressions, Frostpass save/reward tests and the inventory transaction suite passed.

[Live verification report](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Finventory%2Flive-results.json)

[Implementation and verification guide](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Finventory%2FREADME.md)

### Final live screenshots

![Live desktop inventory — Health Potion](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA7b86ef32015775cb4bb4e4c4)

![Live desktop inventory — Stronghold Teleport Scroll](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA66a232b636986df2754f608c)

![Live portrait inventory — Health Potion](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA7c858893afd6251eb42ad91a)

![Live portrait inventory — Stronghold Teleport Scroll](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DAe451123d692030049196e442)

![Live landscape inventory — Health Potion](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA76fc9602a4436a0dbf9ba3ec)

![Live landscape inventory — Stronghold Teleport Scroll](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA910f789cb2a03f6389f3b2fa)

### Published evidence
Evidence commit `5009944` is pushed. Final reports and screenshots were deployed using the existing publisher as layer `1792920203685-inventory-verification-f9a275ee9394`; they preserve the game release. The public report, integrated-build proof, both icons and health were checked again after this final restart.

[Public live verification report](https://ark-whachat.fural.space/inventory-verification/live-results.json) · [Release proof](https://ark-whachat.fural.space/inventory-verification/release-http.json)

## Generated inventory visual revision

The approved dark/gold HUD direction is now implemented with actual image-generated raster artwork. English labels and counts remain rendered HTML. The six optimized WebP assets total approximately 60 KB. Transparent item and bag silhouettes remain readable at small sizes. The panel and detail frame use nine-slice artwork; slots and controls use generated textures. No consumable rules or save transactions were changed.

### Generated assets

![Health Potion — generated raster artwork](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA3a71d50f0e2d437b71ad2204)

![Stronghold Scroll — generated raster artwork](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA3906612899f94acb55f530e0)

![Bag — generated raster artwork](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA5c5a35c5c260bfc8b017c9da)

![Panel — generated raster artwork](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DAe68fa209977b17995f62759b)

![Slot — generated raster artwork](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DAc0bbb331f41ef4abfcbc9b54)

![Button — generated raster artwork](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DAc1b56d0ac8358a5c53087f4a)

### Actual game verification before release

Transaction regressions and five component viewports pass. Full game desktop, portrait and landscape checks pass: real enemy damage and potion healing, exactly one scroll consumed after successful return, counts and return location preserved after reload, add/remove, keyboard focus, Settings exclusion, blessing guards and zero page errors. The short landscape item fit was corrected and reverified. Screenshots use the existing 2D hero fallback.

![Actual game desktop inventory — potion](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA24afed40637250a74bf8c971)

![Actual game desktop inventory — scroll](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA4bd181777bf7b467ee646726)

![Actual game portrait inventory — potion](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA2c97e90d36c65113edec52b1)

![Actual game portrait inventory — scroll](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DAf94804c6afddbb95fc806464)

![Actual game landscape inventory — potion](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA525760f0d7194fe446c34d19)

![Actual game landscape inventory — scroll](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA9bc8befccda6eebc18b698ea)

### Generated artwork release and live evidence

Revision `1a9d931` was pushed and deployed from a clean committed worktree through `scripts/fural-deploy.sh`, release layer `1792924887127-game-1a9d931-4f36ca046ed7`. Production TypeScript/Vite build, all Go tests and deployment co-op smoke passed. The peer’s uncommitted Flame Fan correction was preserved and excluded from this release.

Live game: https://ark-whachat.fural.space/ . Full live interaction verification used the existing `?3d=0` fallback. Desktop 1440×900, portrait 390×844 and landscape 844×390 passed with zero page errors, loaded raster icons, actual healing, exactly one scroll consumed on return, save/reload, stacking, keyboard focus and overlay transition guards. All six live WebP assets return HTTP 200 and match the committed files byte-for-byte. Health and the existing Flame Fan review route return 200.

[Live results](https://ark-whachat.fural.space/inventory-v2-verification/live-results.json) · [Asset release proof](https://ark-whachat.fural.space/inventory-v2-verification/release-http.json)

![Live generated inventory artwork — desktop, potion](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DAa3b06708125ebe5372cd52e0)

![Live generated inventory artwork — desktop, scroll](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA8ca1ed930d8279aad0828c26)

![Live generated inventory artwork — portrait, potion](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DAd1a964b7d65e69898549bc46)

![Live generated inventory artwork — portrait, scroll](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DAd7c4c7b637f7d0eac6a52077)

![Live generated inventory artwork — landscape, potion](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DAb8cb01dcceac85dde3e5d9de)

![Live generated inventory artwork — landscape, scroll](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA41b486291c4e5f79708ff4a5)

Evidence commits `98331f7` and `c459407` are pushed. Reports and screenshots were published through the existing release publisher as layer `1792925068844-inventory-v2-verification-1fb9b2e49490`, preserving game release `1a9d931`. After the final restart, all six asset hashes, health/review HTTP responses, and the published passing live report were checked again.

## Pixi renderer correction
The human requires the inventory interface to be built with the Pixi renderer. This supersedes the HTML presentation described in the previous release history. The proposed migration covers the bag button, panels, slots, generated item textures, labels, counts and controls on desktop and mobile, while preserving consumable behavior and save safety. Implementation was approved and completed; the current Pixi release is documented below.

![User-provided inventory renderer correction reference](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DAfe80ace8b579b6b2d1683fe6)

## Inventory rendered entirely in Pixi

The approved migration is implemented in commit `e121bf2f` and pushed. The bag button, panel and detail frames, eight slots, generated item artwork, English item labels and descriptions, stack counts, Use/Close controls and keyboard focus ring are all drawn by the existing Pixi game UI stage. The obsolete HTML inventory dialog and inventory stylesheet were removed. Sprites reuse the six approved image-generated textures; frames use NineSliceSprite and labels use Pixi Text. The earlier HTML implementation sections above are retained as release history.

### Behavior and input

Item transactions, Web Locks, stacking, save migration and rollback are preserved. Potion healing remains 40% of maximum HP, capped at maximum. A scroll is consumed only after successful return. Solo simulation and automatic rendering pause while inventory is open; explicit Pixi renders update the interface when state changes. Opening clears held movement keys and the active touch stick. Mouse/touch, backdrop close, I/Escape, Tab/Shift+Tab, left/right selection and Enter/Space are supported; a cyan Pixi ring shows keyboard focus. The previous DOM focus is restored after close. Existing Settings and gameplay guards remain in force.

### Verification and deployment

The transaction suite, production TypeScript/Vite build, all Go server tests, shadow checks and deployment co-op smoke passed. Local and live actual-game checks passed at 1440×900, 390×844, 844×390, 667×375 and 320×568. All active panel targets are at least 44 pixels and fit the viewport. The live run clicked actual rendered Pixi bounds and confirmed no HTML inventory elements, real enemy damage and healing (84 → 100 HP), one-scroll return, already-home/full-HP guards, save/reload, add/remove, keyboard navigation, Settings exclusion, paused movement/skill input and the blessing guard. There were zero page errors.

The clean release pipeline registered `1792941370464-game-4c77a1c2-8e0b585e469b`, including inventory `e121bf2f`. Newer peer releases preserve it; final interaction verification ran against the integrated game containing `2b84667d`, including committed shadow, Flame Fan, audio and Settings work. Uncommitted peer files were preserved. All six served textures match committed bytes and the public HTML matches the sandbox's current game page.

Upload/restart interruptions were diagnosed during deployment: a transient TLS upload failure, an oversized peer evidence layer causing boot OOM, and temporary unknown-domain/loading failures while concurrent sessions restarted the sandbox. The peer removed the oversized pending evidence layer; the supported pipeline then applied the game archives. The final passing run navigated with HTTP 200 without retry.

Live game: https://ark-whachat.fural.space/ . Verification uses the existing `3d=0` hero fallback and browser-emulated touch; physical mobile-device/GPU testing is not claimed.

[Live Pixi verification](https://ark-whachat.fural.space/inventory-pixi-verification/live-results.json) · [Texture and release proof](https://ark-whachat.fural.space/inventory-pixi-verification/release-http.json)

### Actual live Pixi captures

![live desktop potion — actual Pixi inventory](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA38a475cead9fb71fd843b9f0)

![live desktop scroll — actual Pixi inventory](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA4a1468908b8f2c04fa385e2f)

![live landscape potion — actual Pixi inventory](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA5ea620c5be630f742e7c6b3d)

![live landscape scroll — actual Pixi inventory](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DAa7d1434ed201656a93aa78da)

![live portrait potion — actual Pixi inventory](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA866e1fb6961934aecd6b623e)

![live portrait scroll — actual Pixi inventory](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA4f7f110da14cb828c1b7dc26)

![live small landscape potion — actual Pixi inventory](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA275ec43c22ae25c426272d86)

![live small landscape scroll — actual Pixi inventory](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA4ea14805359467fa48e241c1)

![live small portrait potion — actual Pixi inventory](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DAfc59868750f15aef5feb655c)

![live small portrait scroll — actual Pixi inventory](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DAc9b71ff239f4c7d9256ed12b)

### Local Pixi verification captures

![local desktop potion — actual Pixi inventory](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DAc6c257c572c6763bd83a51fc)

![local desktop scroll — actual Pixi inventory](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA37bb1dad6a5fe6ad592d64f8)

![local landscape potion — actual Pixi inventory](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA110b420aa69774c5f4370348)

![local landscape scroll — actual Pixi inventory](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DAa090662de5b2acf7a505c56f)

![local portrait potion — actual Pixi inventory](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA316afa6adb2d92176a314b57)

![local portrait scroll — actual Pixi inventory](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA5401b735f8fd410db3be2e44)

![local small landscape potion — actual Pixi inventory](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DAdf86e95d8bb15476fdaefe76)

![local small landscape scroll — actual Pixi inventory](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA89d1702b53e666a824168430)

![local small portrait potion — actual Pixi inventory](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DA4a7da6c1f898dbc6bc5700e5)

![local small portrait scroll — actual Pixi inventory](/api/rooms/DRb09f5901faa3e7743efe84e2/attachments/DAc7c7771fe2cf5991ed13cfd4)
