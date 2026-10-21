## Why the previous fortress differed

The human's attachment showed a flat courtyard with arch/relic stand-ins, several absent building silhouettes and no enclosing walls. Knowledge → Art Direction → Stronghold — Visuals & Player Experience defines a protected courtyard, distinct forge/barracks/altar/tower/mine silhouettes, a readable map table/gate, central relic and warm interiors against a cold exterior. Its implementation reference v2 is a visual target; the earlier sandbox explicitly deferred dedicated building art.

## Implemented

Seven separate transparent imagegen sprites now replace every stronghold building stand-in, including the table. Scene and detail portraits share one sprite mapping. A manifest records source, dimensions, alpha validation and pivot. Existing calibrated wall modules enclose the courtyard with a gate opening; the central relic is reused. World fitting leaves padding for wall tops. Building selection labels are shown only for the selected building to reduce clutter; the quick selection list always names all seven. Shared wall source metadata avoids importing the Pixi renderer into the stronghold page.

## Verification

TypeScript/Vite build, eight economy/save/offline tests, four browser viewports (1440, 390, 320 and 844 pixels), seven unique loaded building sprites and matching portraits, wall count, bounds, depth order, selection and no page errors. Full browser progression covers claims, concurrent tabs, persisted upgrades, forge crafting, expedition dispatch and run reward bridge. Run reward verification uses the existing controlled five-kill fixture.

## Remaining differences from the reference

The reference is not a pixel-identical specification. Existing weathered wall and floor modules are reused, so masonry still repeats and the outer landscape is abstract. There are no decorative townsfolk. Restoration retains one building base with brightness and tier markers; separate ruined/repaired roof art and worker animation are not claimed. Full faction rosters, inventory and branching skills remain outside this asset task.

The seven missing base building assets are complete; future animation and roof variants are distinct art work, not missing runtime dependencies.

## Live result

Both deployments passed browser verification on 20 October 2026. Code commit: bdc4408 on feat/stronghold.

[Open stronghold](https://arkadia-custom-whachat.fural.space/) · [Dedicated stronghold host](https://arkadia-custom-whachat.fural.space/).

## Human report and visual target

![Reported fortress before the asset replacement](/api/organizations/ORd5dd6f99b4308d6187031557/task-attachments/TA2b56f4d634404cdb114eca0b)

![Knowledge practical reference v2](/api/rooms/DR301ca66e2d62a33fd39f4c7c/attachments/DA87af4723db2c2a23d6e54f2e)

## Generated building kit

![Seven generated building sprites](https://arkadia-custom-whachat.fural.space/stronghold-art/contact-sheet.png)

### Forge

![Forge generated transparent sprite](https://arkadia-custom-whachat.fural.space/assets/stronghold/forge.png)

### Barracks

![Barracks generated transparent sprite](https://arkadia-custom-whachat.fural.space/assets/stronghold/barracks.png)

### Altar

![Altar generated transparent sprite](https://arkadia-custom-whachat.fural.space/assets/stronghold/altar.png)

### Mage Tower

![Mage Tower generated transparent sprite](https://arkadia-custom-whachat.fural.space/assets/stronghold/mage.png)

### Mine / Farm

![Mine / Farm generated transparent sprite](https://arkadia-custom-whachat.fural.space/assets/stronghold/mine.png)

### Expedition Table

![Expedition Table generated transparent sprite](https://arkadia-custom-whachat.fural.space/assets/stronghold/expedition.png)

### Run Gate

![Run Gate generated transparent sprite](https://arkadia-custom-whachat.fural.space/assets/stronghold/gate.png)

## Runtime screenshots

![Desktop runtime after asset integration](https://arkadia-custom-whachat.fural.space/stronghold-art/desktop.png)

![Mobile runtime after asset integration](https://arkadia-custom-whachat.fural.space/stronghold-art/mobile.png)

## Source and reproducibility

[Generation prompts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fstronghold-assets%2Fprompts.md) · [Alpha and dimensions manifest](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Fassets%2Fstronghold%2Fmanifest.json).
