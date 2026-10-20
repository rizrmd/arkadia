## Request and result

The annotated mobile report identifies Barracks and Expedition Table: their long edges were too shallow relative to the courtyard. Both sprites were regenerated with built-in imagegen, preserving their design, and integrated with transparent backgrounds. The follow-up requested consistent isometry across buildings, environment assets and characters.

![Human annotation showing the two mismatched assets](/api/organizations/ORd5dd6f99b4308d6187031557/task-attachments/TA30c80f66f78159b871ca84e2)

## Shared ground convention

Every world-space placement follows a 2:1 ground diamond: x = (u − v) × 64, y = (u + v) × 32. The ground directions are ±26.565°, slope ±0.5. Canvas aspect ratio (3:2) and roof pitch do not define the isometric camera.

The arena floor, grid, calibrated wall contacts, building foot pivots and actor positions share this convention. Building art receives a per-asset ground calibration about its foot pivot, preserving upright posts. Actor sprites stay upright; their feet, movement, ground shadows and depth ordering follow the same plane. Front/back animation and horizontal facing are retained. Organic vegetation, roots and rubble have irregular silhouettes; their contact pivots follow the grid. Inventory icons, portraits and the schematic expedition travel map are interface graphics, rather than ground tiles.

The courtyard remains the approved painted background. Painterly stone joints and organic silhouettes are irregular; the automated checks verify placement, contact geometry and calibrated base directions rather than certifying every painted line.

## Corrected sprites

![Regenerated Barracks](https://arkadia-stronghold-whachat.fural.space/isometric/barracks-source.webp)

![Regenerated Expedition Table](https://arkadia-stronghold-whachat.fural.space/isometric/expedition-source.webp)

## Runtime evidence

![Desktop with calibrated building ground directions](https://arkadia-stronghold-whachat.fural.space/isometric/desktop.webp)

![Mobile courtyard with corrected Barracks and Expedition Table](https://arkadia-stronghold-whachat.fural.space/isometric/mobile.webp)

![Arena floor grid, environment and actor foot pivots](https://arkadia-stronghold-whachat.fural.space/isometric/arena-grid.webp)

## Inspected art references

![Original Barracks](https://arkadia-stronghold-whachat.fural.space/isometric/barracks-before.webp)

![Original Expedition Table](https://arkadia-stronghold-whachat.fural.space/isometric/expedition-before.webp)

![Approved courtyard ground reference](https://arkadia-stronghold-whachat.fural.space/fortress-ui/courtyard-v2.webp)

![Seven-building reference sheet](https://arkadia-stronghold-whachat.fural.space/stronghold-art/contact-sheet.png)

![Altar ground steps](https://arkadia-stronghold-whachat.fural.space/assets/stronghold/altar.png)

![Mage Tower and porch](https://arkadia-stronghold-whachat.fural.space/assets/stronghold/mage.png)

![Mine rails and supports](https://arkadia-stronghold-whachat.fural.space/assets/stronghold/mine.png)

![Forge progression art](https://arkadia-stronghold-whachat.fural.space/fortress-ui/forge-states.webp)

![Original environment module kit](https://arkadia-stronghold-whachat.fural.space/assets/source-kit.png)

![Earlier character back-view reference](https://arkadia-stronghold-whachat.fural.space/isometric/character-back-reference.webp)

## Verification

Production build passes. The isometric browser check covers seven building matrices and selection, 100 tile aspect ratios, 31 prop contact/depth placements, 13 actor pivots with all available clips, four actor ground directions, and mobile fit. Existing four-viewport fortress checks, portrait/landscape mobile checks, wall endpoint continuity and 13 character/animation regressions pass. The character stress test verifies rendering at 72 enemies; software-renderer FPS is not a hardware performance claim.

[Open Stronghold](https://arkadia-stronghold-whachat.fural.space/stronghold.html) · [Open arena](https://arkadia-whachat.fural.space/) · [Generation prompts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fisometric%2Fprompts.md) · [Projection source](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fisometric.ts)
