## Why the previous fortress differed

The human's attachment showed a flat courtyard with arch/relic stand-ins, several absent building silhouettes and no enclosing walls. Knowledge → Art Direction → Stronghold — Visuals & Player Experience defines a protected courtyard, distinct forge/barracks/altar/tower/mine silhouettes, a readable map table/gate, central relic and warm interiors against a cold exterior. Its implementation reference v2 is a visual target; the earlier sandbox explicitly deferred dedicated building art.

## Implemented

Seven separate transparent imagegen sprites now replace every stronghold building stand-in, including the table. Scene and detail portraits share one sprite mapping. A manifest records source, dimensions, alpha validation and pivot. Existing calibrated wall modules enclose the courtyard with a gate opening; the central relic is reused. World fitting leaves padding for wall tops. Building selection labels are shown only for the selected building to reduce clutter; the quick selection list always names all seven. Shared wall source metadata avoids importing the Pixi renderer into the stronghold page.

## Verification

TypeScript/Vite build, eight economy/save/offline tests, four browser viewports (1440, 390, 320 and 844 pixels), seven unique loaded building sprites and matching portraits, wall count, bounds, depth order, selection and no page errors. Full browser progression covers claims, concurrent tabs, persisted upgrades, forge crafting, expedition dispatch and run reward bridge. Run reward verification uses the existing controlled five-kill fixture.

## Remaining differences from the reference

The reference is not a pixel-identical specification. Existing weathered wall and floor modules are reused, so masonry still repeats and the outer landscape is abstract. There are no decorative townsfolk. Restoration retains one building base with brightness and tier markers; separate ruined/repaired roof art and worker animation are not claimed. Full faction rosters, inventory and branching skills remain outside this asset task.

The seven missing base building assets are complete; future animation and roof variants are distinct art work, not missing runtime dependencies.
