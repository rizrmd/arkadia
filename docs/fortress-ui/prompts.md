## Generation method

Built-in imagegen, with the task target screenshot as landscape reference and the existing public/assets/stronghold/forge.png as forge edit reference. Landscape uses an opaque background; forge sheet uses transparency. Original outputs are saved in public/fortress-ui/snowy-landscape.png and public/fortress-ui/forge-states.png. Runtime WebP encodings preserve transparency. scripts/prepare-forge-states.mjs extracts the four painted states.

## Snowy landscape prompt

Use case: stylized-concept. Asset type: game environment background, landscape 3:2. Create a richly painted isometric dark medieval fantasy snowy mountain pine forest surrounding a large EMPTY diamond-shaped clearing in the center. Camera looking down 30 degrees, orthographic, textured semi realistic game art. Snowy craggy rocks and dense fir trees only along the perimeter, cold blue grey palette, snow banks, distant mountains at top. Center 75% is empty muted grey earth and rough paving where code will overlay separate fortress walls and building sprites. No buildings, no walls, no people, no text, no UI, no frames. Edge-to-edge continuous scenery. Match the atmospheric snowy outside environment of the supplied reference but do not include any of its interface or buildings.

## Forge sheet prompt

Asset type: ONE transparent game sprite sheet. Edit the supplied forge into four distinct progression states, in ONE horizontal row of FOUR EQUAL SQUARE CELLS, each isolated with transparent padding, perfectly centered, matching camera scale ground pivot and same square stone foundation. First cell: Base New simple small unlit forge cottage with low chimney. Second cell: Ruined forge, collapsed roof, broken chimney, rubble, no fire. Third cell: Repaired forge, intact red roof chimney modest warm furnace. Fourth cell: Upgraded level 3 forge as supplied reference, taller chimney large bright furnace extra anvil work area and pennant. Orthographic isometric detailed dark medieval fantasy game sprites. Actual transparent background. No words, no text, no UI. Four cells evenly spaced across a wide 4:1 canvas. Preserve source forge design language and camera orientation.
