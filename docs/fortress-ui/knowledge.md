## Reference and acceptance

The first attachment showed the mobile Stronghold as a document page: navigation, a large resource row, introduction text, a small open village and building buttons. The second attachment requests a game screen with an enclosed snowy courtyard, compact resource HUD, Forge selected by default, a building detail/upgrade sidebar, forge variants below the scene, and Claim All / Expeditions / Start Run actions.

## Correction after visual feedback

The first release was rejected because it still looked wrong. It showed a complete diamond fort from outside, with too much snowy landscape, repetitive walls and floor tiles, smaller buildings, and a sidebar/action stack taller than the reference. Passing interaction tests did not establish a visual match.

The corrected scene uses a dedicated environment plate generated from the target's courtyard camera: close framing, cropped enclosing walls, varied paving, and a large foreground gate. The plate contains no buildings or UI. Forge, Barracks, Altar, Mage Tower, Expedition Table and Mine are separate interactive sprites placed at the reference's screen positions and scale. The gate uses a selectable region over the gate in the environment plate. A single 1155 × 770 coordinate space keeps environment and hit regions aligned.

The desktop game screen fits one viewport. Its left scene occupies 75.2% of the height with the four forge states below it. The right column has a bounded building panel and all three major actions visible at 1536 × 1024. Custom SVG coin, gem, skull, chest, map and sword icons replace the mismatched text symbols. Current/next forge stats use actual weapon tier, crafted health bonus and crafting costs. Detailed crafting actions, import and export remain in the utility row beneath the game screen. On narrow screens the scene, variants, building selectors and details stack vertically.

The saved level still selects new/repaired/upgraded forge sprites, and the ruined sprite is a visual reference rather than a new damage mechanic. All costs, saves, production, crafting, expedition and arena rules remain unchanged.

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

## Corrected environment plate

![Close courtyard environment without buildings or interface](https://arkadia-stronghold-whachat.fural.space/fortress-ui/courtyard-v2.webp)

## Runtime evidence

![Desktop fortress UI](https://arkadia-stronghold-whachat.fural.space/fortress-ui/desktop.webp)

![Mobile fortress UI](https://arkadia-stronghold-whachat.fural.space/fortress-ui/mobile.webp)

## Verification and publishing

TypeScript/Vite build and eight economy/save/offline tests pass. Browser checks at 1536, 844, 390 and 320 pixels select all seven buildings directly in the scene, verify matching loaded portraits, upgrade/craft/save persistence, claims and Start Run navigation, and reject page errors and horizontal overflow. An additional layout check confirms that all three main actions and the variant strip fit the target 1536 × 1024 viewport. The existing broader regression passes, including concurrent claims, expedition dispatch, arena health bonus and the controlled run reward fixture.

The revised bundle uses versioned incremental chunks staged through the supported sandboxes serve command so the current release stays intact until the final switch. The original landscape and forge generation remain preserved in the repository. The new environment prompt is recorded in docs/fortress-ui/prompts.md.

## Remaining visual differences

Most building sprites and forge variants are still separate existing artwork rather than exact copies of the target. The reference's worker/percentage/interval values are not implemented game mechanics, so the sidebar shows real weapon and crafting values. Decorative townsfolk are not present. Visual approval remains with the human; automated interaction and layout checks alone are not a visual acceptance test.
