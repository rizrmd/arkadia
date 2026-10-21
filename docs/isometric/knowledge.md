## Request and result

The follow-up report shows that the Barracks foundation still rises too shallowly compared with the paving. Both the original and annotated reports were inspected. Acceptance: align the visible foundation directions with the courtyard tile directions while keeping vertical posts upright, building selection functional, and the foot pivot fixed.

The earlier runtime correction used estimated slopes. The actual Barracks masonry edge rises 117 pixels over 327 pixels (slope −0.358), rather than the assumed −0.43. Its second base direction falls 94 pixels over 196 pixels. The corrected runtime matrix maps those measured directions to −0.5 and +0.5. Foundation, stair, rail and tabletop landmarks were also recorded for Forge, Altar, Mage Tower, Mine and Expedition Table in the scene source. Gate art is already painted into the background.

![Original human report](https://ark-whachat.fural.space/angle-alignment/report.png)

![Human annotation identifying the shallow foundation direction](https://ark-whachat.fural.space/angle-alignment/report-annotated.png)

## Corrected foundation evidence

These are browser captures of the actual rendered game. Pink follows the long Barracks foundation and cyan follows its side; both lines extend onto the paving. Guides appear only in verification screenshots.

![Corrected Barracks with foundation direction guides](https://ark-whachat.fural.space/angle-alignment/barracks-guides.webp)

![Corrected Barracks without guides](https://ark-whachat.fural.space/angle-alignment/barracks.webp)

![Updated desktop courtyard](https://ark-whachat.fural.space/angle-alignment/desktop.webp)

![Updated mobile courtyard](https://ark-whachat.fural.space/angle-alignment/mobile.webp)

## Shared ground convention

Every world-space placement follows a 2:1 ground diamond: x = (u − v) × 64, y = (u + v) × 32. The ground directions are ±26.565°, slope ±0.5. Canvas aspect ratio (3:2) and roof pitch do not define the isometric camera.

The arena floor, grid, calibrated wall contacts, building foot pivots and actor positions share this convention. Building art receives a per-asset ground calibration derived from explicit source-pixel edge endpoints about its foot pivot, preserving upright posts. Actor sprites stay upright; their feet, movement, ground shadows and depth ordering follow the same plane. Front/back animation and horizontal facing are retained. Organic vegetation, roots and rubble have irregular silhouettes; their contact pivots follow the grid. Inventory icons, portraits and the schematic expedition travel map are interface graphics, rather than ground tiles.

The courtyard remains the approved painted background. Painterly stone joints and organic silhouettes are irregular; the automated checks verify placement, contact geometry and calibrated base directions rather than certifying every painted line.

## Corrected sprites

![Regenerated Barracks](https://ark-whachat.fural.space/isometric/barracks-source.webp)

![Regenerated Expedition Table](https://ark-whachat.fural.space/isometric/expedition-source.webp)

## Earlier release evidence

The captures below are retained for comparison; use the corrected foundation evidence above for the current Stronghold.

![Desktop with calibrated building ground directions](https://ark-whachat.fural.space/isometric/desktop.webp)

![Mobile courtyard with corrected Barracks and Expedition Table](https://ark-whachat.fural.space/isometric/mobile.webp)

![Arena floor grid, environment and actor foot pivots](https://ark-whachat.fural.space/isometric/arena-grid.webp)

## Inspected art references

![Original Barracks](https://ark-whachat.fural.space/isometric/barracks-before.webp)

![Original Expedition Table](https://ark-whachat.fural.space/isometric/expedition-before.webp)

![Approved courtyard ground reference](https://ark-whachat.fural.space/fortress-ui/courtyard-v2.webp)

![Seven-building reference sheet](https://ark-whachat.fural.space/stronghold-art/contact-sheet.png)

![Altar ground steps](https://ark-whachat.fural.space/assets/stronghold/altar.png)

![Mage Tower and porch](https://ark-whachat.fural.space/assets/stronghold/mage.png)

![Mine rails and supports](https://ark-whachat.fural.space/assets/stronghold/mine.png)

![Forge progression art](https://ark-whachat.fural.space/fortress-ui/forge-states.webp)

![Original environment module kit](https://ark-whachat.fural.space/assets/source-kit.png)

![Earlier character back-view reference](https://ark-whachat.fural.space/isometric/character-back-reference.webp)

## Verification

TypeScript and the Vite production build pass. The updated isometric browser check transforms the recorded edge endpoints through the actual CSS matrices and checks both resulting directions, upright verticals, unchanged foot positions, depth ordering and seven selectable buildings. It also checks 100 floor aspect ratios, 31 grounded props, 13 actors with all available clips, four actor ground directions and mobile fit. The existing four-viewport fortress regression passes selection, portraits, upgrades, crafting, persistence, claim and starting a run.

Both public hosts passed the updated isometric browser check after publication. Stronghold HTML and its referenced bundle are checked against the built release. The arena host briefly returned 502 while its release loader was being repaired; its final public browser check passes. The building changes are a scoped overlay that preserves the arena release.

Painted masonry and paving contain irregular lines. Calibration aligns the recorded structural ground edges; it does not straighten every roof, curved tower course, loose stone or painted joint.

[Open Stronghold](https://ark-whachat.fural.space/) · [Open arena](https://ark-whachat.fural.space/) · [Projection source](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fisometric.ts) · [Measured foundation landmarks](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fscene.ts)
