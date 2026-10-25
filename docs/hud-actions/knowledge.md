## Approved design

Implemented, pushed and deployed to https://ark-whachat.fural.space. Live verification passed on desktop, mobile portrait and touch landscape using the default renderer, with zero page or console errors. Use a small antique-gold gear beside the desktop minimap and below the mobile minimap, with a minimum 44 CSS-pixel touch target and safe-area spacing. Open a centered desktop modal or a tall mobile single-column panel over dimmed gameplay. Match the existing charcoal, ivory, gold and cyan HUD.

## Controls

- Visual Quality: Auto / Low / High. Auto adapts to device capability; Low reduces shadows, particles and decorative effects without hiding combat cues; High enables full visual detail.
- Frame Rate: 30 / 60, with device support respected.
- Music and Sound Effects: independent volume sliders.
- Screen Shake and Show FPS: toggles.
- Resume Game: prominent primary action; desktop also supports Escape.
- Reset Progression: separated destructive action. A second dialog must state exactly which saved progression will be cleared before confirming. Restart Run, if added, must be a separate action from persistent progression reset.

Pause solo gameplay while the menu is open. Persist preferences locally. These controls are now implemented.

## Gameplay references

![Original desktop gameplay](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA34c71a3b2141e9b75708a3a5)

![Original mobile gameplay](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAdb4e29d21aa999ec68e86fbc)

## Generated preview

![Generated desktop and mobile settings menu concept](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA057f723d84b1a480905ce88b)

Generated with the built-in imagegen tool from the supplied gameplay screenshots. The board illustrates styling and controls; final mobile implementation must retain the existing portrait HUD proportions and validate touch targets on real viewport sizes.

## Implementation and verification

The gear opens Settings below the minimap. The panel uses charcoal, ivory, gold and cyan, with a prominent Resume Game button. Solo simulation and rendering pause while it is open. Escape, the close button and the backdrop resume without resetting progression. Keyboard focus stays within the active dialog. Mobile portrait and landscape omit both the Progression heading and the Requires confirmation helper. Controls have touch targets of at least 44 CSS pixels, with safe-area padding and scrollable short-screen panels.

Visual Quality extends the existing adaptive controller: Auto uses device hints and sustained frame timing; Low reduces resolution, shadow detail, idle animation rate and particle budget; High restores full detail. Frame Rate independently selects the shared 30/60 scheduler and renderer limit; browser/device limits still apply. Music controls a quiet procedural ambient chord, and Sound Effects controls procedural skill-cast cues. Audio begins after user input. Screen Shake controls the existing combat shake offsets; Show FPS controls the actual HUD readout. Preferences are stored separately in `arkodia.settings.v1`.

### Confirmed progression reset

Reset Progression first opens a separate “Reset progression?” dialog. Cancel receives initial focus. Cancel, backdrop and Escape do not change saved data. Only the red second Reset Progression button changes progression, under the existing Stronghold save lock, and then reloads the game. No storage-wide clear is used.

Reset replaces `arkodia-stronghold-v1` with a new camp: resources and stored income, inventory/consumable counts, buildings and upgrades, Warden unlock, training, skills, weapon/affix upgrades, run rewards and completed expeditions are reset. It removes saved Stronghold position (`arkodia.stronghold.hero`), Frostpass checkpoint/cache/patrol state (`arkodia-snow-expedition-v1`), and expedition seed, chunks, visited/cleared locations, position, jobs, materials and XP (`arkodia-expedition-v1`). The current combat run also restarts. This is irreversible. Settings, chosen hero, minimap layout, player name and unrelated storage remain intact; other devices and co-op server state are unaffected.

### Local evidence

Isolated fixture verification passed at 1440×900, 390×844 and 844×390 with no page errors. Built gameplay passed on desktop and mobile, including real rendering changes, audio gains, keyboard/touch input, persistence, and all reset confirmation/cancellation paths. Desktop additionally verifies frozen simulation state and actual FPS visibility. Live delivery is verified below. All destructive tests used fresh, isolated browser storage; no human player data was used.

Initial mobile gameplay verification (before the final cyan slider styling):

![Mobile Settings gameplay verification](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA9e59d4023a6ad5dffc889905)

![Separate mobile progression reset confirmation](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAa2240461d792ed2bb0b9d706)

### Approved mobile correction

The following crop identifies the mobile area to simplify: remove the pictured heading and helper line, while retaining Reset Progression and its separate confirmation dialog.

![Mobile correction reference](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA8cd9286737a9acfc3ed73be9)

## Generated Settings icon assets

Three built-in imagegen assets replace the Unicode gear and repeated music-note placeholders: an eight-tooth gold gear, paired musical notes for Music, and a speaker with sound waves for Sound Effects. Each uses antique gold, ivory highlights and dark bronze bevels, with true alpha transparency. Original generated PNGs are preserved in `assets-src/ui/settings/`; game-ready lossless 128×128 WebP files live in `public/ui/settings/`. The gear displays at 28×28 inside its unchanged 46×46 button; audio icons display at 20×20. Images are decorative with empty alt text and hidden from assistive technology; existing accessible labels and control behavior remain intact.

![Generated Settings gear](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA1b2f1bc6412f221a3875c6db)

![Generated Music icon](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA4bf3aeb403eca0102704b721)

![Generated Sound Effects icon](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAd11ccffb7e0f9ecd0bdb116b)

Generation prompts: isolated front-view antique-gold eight-tooth cog with open center; paired beamed eighth notes; speaker with two broad sound-wave arcs. All prompts requested bold small-size silhouettes, painted gothic metal, clean transparent edges, and no text, frame, glow or cast shadow. Generated using the built-in imagegen tool.

## Live delivery

Settings implementation commit: `d43947a`. Final browser verifier and evidence commit: `1a6baa9`. The shared release initially shipped with inventory at `5b4daf6`, then remained integrated in the Ember game release `7a8edb4` and its complete tree-asset layer. Deployment used the repository’s supported release script and serialized peer publishing. The portable USTAR/server-binary and unique validated archive fixes remain preserved.

[Open the live game](https://ark-whachat.fural.space/) · [Open the verification report](https://ark-whachat.fural.space/settings-verification/) · [Full live browser results](https://ark-whachat.fural.space/settings-verification/live-results.json)

The final live pass covered 1440×900 desktop, 390×844 mobile portrait and 844×390 touch landscape with the default renderer. It verified Auto/Low/High, real resolution and 30/60 renderer/scheduler changes, independent audio gains, actual FPS visibility, Screen Shake preferences, solo pause, keyboard focus and slider keys, touch controls and short-screen scrolling, reload persistence, cancellation through Cancel/backdrop/Escape, and the explicit second reset. Each confirmed reset restored a playable new camp and retained settings, chosen hero and unrelated storage. The fresh economy has 600 gold, 80 mana, 20 souls, five health potions and two Stronghold scrolls; upgrades and prior rewards are cleared.

The final pass reported zero page errors and zero console errors. Earlier attempts crossed peer publishing restarts; the successful report was collected after those publishers finished. An evidence-only layer `1792920959840-settings-verification-0274e674df14` publishes this report and the screenshots without replacing game code. Post-publish checks confirmed health and required FX/tree assets return HTTP 200, the game entry remains `/assets/index-CujZprs2.js`, and all six original PNG downloads (`?format=png`) match their local SHA-256 hashes. Normal image requests use the existing lossless WebP cache.

### Desktop

![Live desktop Settings menu](https://ark-whachat.fural.space/settings-verification/live-desktop-menu.png)

![Live desktop reset confirmation](https://ark-whachat.fural.space/settings-verification/live-desktop-confirmation.png)

### Mobile portrait

![Live mobile Settings menu](https://ark-whachat.fural.space/settings-verification/live-mobile-menu.png)

![Live mobile reset confirmation](https://ark-whachat.fural.space/settings-verification/live-mobile-confirmation.png)

### Mobile landscape

![Live landscape Settings menu](https://ark-whachat.fural.space/settings-verification/live-landscape-menu.png)

![Live landscape reset confirmation](https://ark-whachat.fural.space/settings-verification/live-landscape-confirmation.png)

### Icon integration local verification

TypeScript and focused Settings/reset tests pass. Gameplay checks pass at 1440×900, 390×844 and 844×390: all three images decode at 128×128 and return HTTP 200; the gear retains its 46×46 target; panels fit the viewport; Resume, keyboard reopening and reset cancellation preserve behavior. Chromium is launched separately per viewport.

![Mobile Settings with generated audio icons](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA7419fbe6105fe48ea1a6f7f1)

### Icon release and live verification

Implemented and pushed in `a327cd3`; deployed using the repository's supported `scripts/fural-deploy.sh` from a clean snapshot. Release layer: `1792921769926-game-a327cd3-2761c57bdacd`. The subsequent integrated `5c39b81` game release retains the icons. Production build, Go tests and co-op smoke passed.

Live icon verification passed on desktop 1440×900, portrait 390×844 and landscape 844×390 at https://ark-whachat.fural.space. Each view verifies the three decoded assets, HTTP 200 responses, unchanged 46×46 gear target, panel bounds, keyboard opening, Resume and reset cancellation with unchanged saved progression. No page errors occurred. Direct live icon downloads match the committed WebP bytes. Landscape retains the existing scrollable panel. Earlier verification attempts intersected two peer release restarts; the final complete pass succeeded after those restarts.

The existing Settings acceptance tests additionally cover persistence, real rendering/audio controls and confirmed progression reset. This icon change does not alter that behavior.

[Live icon verification report](https://ark-whachat.fural.space/settings-icons-verification/live-results.json)

![Live Desktop Hud — generated Settings icons](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAa941d7847bed1c2be1f75038)

![Live Desktop — generated Settings icons](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA018e4619094c60a93dedba8c)

![Live Mobile Hud — generated Settings icons](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAb589d1eceee32e20da978369)

![Live Mobile — generated Settings icons](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA6efd2e9c0692ffd1dfca086c)

![Live Landscape Hud — generated Settings icons](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA37aefad37775a442126a1ed8)

![Live Landscape — generated Settings icons](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA796d347e07fa672c9f35dbdb)

## Frameless HUD actions

The Inventory pouch and Settings cog use new painted leather and aged brass artwork. Both HUD buttons have transparent backgrounds, no border, no backing plate and no box shadow. Their 46 × 46 CSS-pixel targets, keyboard focus indicators and existing panel interactions are retained. Panel artwork is unchanged.

### Reference

![Annotated request](/api/organizations/ORd5dd6f99b4308d6187031557/task-attachments/TA0af0ffc841ddb9dbe77fdf38)

### Generated artwork

![Painted pouch and cog](/organizations/ORd5dd6f99b4308d6187031557/sandbox/US4f550b10dab65dc9756fa429/files?file=.codex%2Fgenerated_images%2F01a172b1-9dda-7080-bbe0-7e38b8b3c569%2Fexec-feda299e-3aeb-4d74-9248-ab7e184fdaa4.png)

### Local mobile verification

![Frameless mobile HUD](/organizations/ORd5dd6f99b4308d6187031557/sandbox/US4f550b10dab65dc9756fa429/files?file=projects%2Farkadia%2Frepos%2Farkadia%2Fdocs%2Fhud-actions%2Flocal-portrait.png)

Build and desktop, portrait and landscape interaction checks passed. The check verifies transparent backgrounds, zero borders and box shadows, decoded new assets, touch target dimensions, and opening both panels.
