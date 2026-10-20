## Reference and acceptance

The first attachment showed the mobile Stronghold as a document page: navigation, a large resource row, introduction text, a small open village and building buttons. The second attachment requests a game screen with an enclosed snowy courtyard, compact resource HUD, Forge selected by default, a building detail/upgrade sidebar, forge variants below the scene, and Claim All / Expeditions / Start Run actions.

## Implemented

The introduction and top navigation no longer push the game scene down the page. Resources overlay the courtyard. A dark framed sidebar shows the selected building portrait, saved level, actual player health, weapon tier, production, restoration requirements and cost. Gold upgrade and red Start Run buttons follow the reference hierarchy. Seven independent building buttons share depth sorting with the enclosing wall segments; a real gate opening remains at the front. The mobile view stacks the scene, variants and readable detail panel without horizontal scrolling. English quick selectors remain available for accessible building navigation.

Snow-covered pine forest and mountain art sits beneath separately rendered courtyard tiles, walls and interactive buildings. The target screenshot is not used as a flattened UI background. New, ruined, repaired and upgraded forge artwork is shown in the variant strip. Saved forge levels 1/2/3 select new/repaired/upgraded artwork in both scene and portrait; ruined art is a reference variant, not a new damage mechanic. Other buildings retain their existing sprites.

Resource totals, prices and effects come from the existing economy. The reference's fictional worker counts, equipment production percentages and 60-second interval were not invented as game mechanics. Existing crafting, training, blessings, skills, claims, exports/imports, expedition navigation and arena reward integration remain functional.

## Live game

[Open Stronghold](https://arkadia-stronghold-whachat.fural.space/stronghold.html) · [Open through the main Arkadia host](https://arkadia-whachat.fural.space/stronghold.html).

## Human images

![Before: mobile document-style village](/api/organizations/ORd5dd6f99b4308d6187031557/task-attachments/TA27f70caa15e79b2c81044320)

![Target: snowy fortress game screen](/api/organizations/ORd5dd6f99b4308d6187031557/task-attachments/TAc54ebe1b54f95905b3f73908)

## Generated and source artwork

Built-in imagegen produced the snowy landscape and four-state forge sprite sheet. Original PNGs and WebP runtime encodings are in public/fortress-ui. The sheet is extracted into separate transparent sprites without changing the painted artwork. Full generation prompts are recorded in docs/fortress-ui/prompts.md.

![Snowy landscape](https://arkadia-stronghold-whachat.fural.space/fortress-ui/snowy-landscape.webp)

![Existing forge used as an art reference](https://arkadia-stronghold-whachat.fural.space/assets/stronghold/forge.png)

![Four forge states generated from the existing forge](https://arkadia-stronghold-whachat.fural.space/fortress-ui/forge-states.webp)

## Runtime evidence

![Desktop fortress UI](https://arkadia-stronghold-whachat.fural.space/fortress-ui/desktop.webp)

![Mobile fortress UI](https://arkadia-stronghold-whachat.fural.space/fortress-ui/mobile.webp)

## Verification and publishing

TypeScript and Vite production build pass. Eight economy/save/offline tests pass. New browser checks pass at 1536, 844, 390 and 320 pixels on both public hosts: all seven selections, loaded matching portraits, mine and forge upgrades, crafting, reload persistence, claims, Start Run navigation, no overflow and no page errors. The broader existing browser regression also passes on the main public host, including concurrent-tab claim protection, expedition dispatch, arena entry with 110 HP and the controlled five-kill reward fixture.

The publisher initially exceeded the platform's request/transfer timeout. A 2.44 MB incremental package in bounded chunks was published through the supported sandboxes serve command, preserving the existing full-site resource packages. Both public URLs were then checked against the new UI with real browser interactions. A gateway timeout during the main host's final boot did not indicate a failed release: boot logs confirmed the new server and the public browser regression passed. No resource-guard incidents were reported.

## Visual scope

The screen follows the reference composition and cold exterior / warm interior palette. Existing repeating masonry, floor tiles and most building silhouettes remain; this is not a pixel-identical recreation of the supplied illustration. There are no animated townsfolk or new worker-production mechanics.
