## Reference and acceptance

The first attachment showed the mobile Stronghold as a document page: navigation, a large resource row, introduction text, a small open village and building buttons. The second attachment requests a game screen with an enclosed snowy courtyard, compact resource HUD, Forge selected by default, a building detail/upgrade sidebar, forge variants below the scene, and Claim All / Expeditions / Start Run actions.

## Correction after visual feedback

The first release was rejected because it still looked wrong. It showed a complete diamond fort from outside, with too much snowy landscape, repetitive walls and floor tiles, smaller buildings, and a sidebar/action stack taller than the reference. Passing interaction tests did not establish a visual match.

The corrected scene uses a dedicated environment plate generated from the target's courtyard camera: close framing, cropped enclosing walls, varied paving, and a large foreground gate. The plate contains no buildings or UI. Forge, Barracks, Altar, Mage Tower, Expedition Table and Mine are separate interactive sprites placed at the reference's screen positions and scale. The gate uses a selectable region over the gate in the environment plate. A single 1155 × 770 coordinate space keeps environment and hit regions aligned.

The desktop game screen fits one viewport. Its left scene occupies 75.2% of the height with the four forge states below it. The right column has a bounded building panel and all three major actions visible at 1536 × 1024. Custom SVG coin, gem, skull, chest, map and sword icons replace the mismatched text symbols. Current/next forge stats use actual weapon tier, crafted health bonus and crafting costs. Detailed crafting actions, import and export remain in the utility row beneath the game screen. On narrow screens the approved landscape composition scales to the available viewport height and pans horizontally; it does not stack vertically.

The saved level still selects new/repaired/upgraded forge sprites, and the ruined sprite is a visual reference rather than a new damage mechanic. All costs, saves, production, crafting, expedition and arena rules remain unchanged.

## Live game

[Open Stronghold](https://ark-whachat.fural.space/) · [Open through the main Arkadia host](https://ark-whachat.fural.space/).

## Human images

![Before: mobile document-style village](/api/organizations/ORd5dd6f99b4308d6187031557/task-attachments/TA27f70caa15e79b2c81044320)

![Target: snowy fortress game screen](/api/organizations/ORd5dd6f99b4308d6187031557/task-attachments/TAc54ebe1b54f95905b3f73908)

## Generated and source artwork

Built-in imagegen produced the snowy landscape and four-state forge sprite sheet. Original PNGs and WebP runtime encodings are in public/fortress-ui. The sheet is extracted into separate transparent sprites without changing the painted artwork. Full generation prompts are recorded in docs/fortress-ui/prompts.md.

![Snowy landscape](https://ark-whachat.fural.space/fortress-ui/snowy-landscape.webp)

![Existing forge used as an art reference](https://ark-whachat.fural.space/assets/stronghold/forge.png)

![Four forge states generated from the existing forge](https://ark-whachat.fural.space/fortress-ui/forge-states.webp)

## Corrected environment plate

![Close courtyard environment without buildings or interface](https://ark-whachat.fural.space/fortress-ui/courtyard-v2.webp)

## Runtime evidence

![Desktop fortress UI](https://ark-whachat.fural.space/fortress-ui/desktop.webp)

![Mobile fortress UI](https://ark-whachat.fural.space/fortress-ui/mobile.webp)

## Verification and publishing

TypeScript/Vite build and eight economy/save/offline tests pass. Browser checks at 1536, 844, 390 and 320 pixels select all seven buildings directly in the scene, verify matching loaded portraits, upgrade/craft/save persistence, claims and Start Run navigation, and reject page errors and horizontal overflow. An additional layout check confirms that all three main actions and the variant strip fit the target 1536 × 1024 viewport. The existing broader regression passes, including concurrent claims, expedition dispatch, arena health bonus and the controlled run reward fixture.

The revised bundle uses versioned incremental chunks staged through the supported sandboxes serve command so the current release stays intact until the final switch. The original landscape and forge generation remain preserved in the repository. The new environment prompt is recorded in docs/fortress-ui/prompts.md.

## Remaining visual differences

Most building sprites and forge variants are still separate existing artwork rather than exact copies of the target. The reference's worker/percentage/interval values are not implemented game mechanics, so the sidebar shows real weapon and crafting values. Decorative townsfolk are not present. Visual approval remains with the human; automated interaction and layout checks alone are not a visual acceptance test.

## Mobile: full-height horizontal layout

After the human approved the corrected appearance, they requested mobile fill most of the screen, permitting horizontal scrolling and forbidding vertical scrolling. Mobile now retains the landscape game composition, scaled from the available visual viewport height with a 44-pixel utility row. The courtyard occupies roughly 70–75% of screen height. Swipe horizontally to reach the rest of the courtyard and the building sidebar. The resource HUD is compact enough to read in the initial portrait view. The building panel is slightly condensed so every building's full details and upgrade control fit without an internal vertical scrollbar.

The page and body prevent vertical scrolling; the body owns horizontal panning. Resize and visual-viewport events recalculate the fit for device rotation and browser viewport changes. The approved desktop composition remains in place above 1100 pixels.

The build and four-viewport UI regression pass. A dedicated touch/mobile browser check passes on both public hosts at 390 × 844, 360 × 640, 320 × 568 and landscape 844 × 390. It checks large scene height, portrait horizontal overflow, direct selection of all seven buildings, each panel fitting without vertical scrolling, reachable Claim All and Start Run controls, rejection of vertical wheel/page scrolling, and no page errors.

![Portrait mobile courtyard filling the screen](https://ark-whachat.fural.space/fortress-ui/mobile.webp)

![Same mobile screen panned horizontally to building details and actions](https://ark-whachat.fural.space/fortress-ui/mobile-panel.webp)
