## Method

Built-in imagegen, two separate transparent edit requests. The original sprite was image 1 (edit target); public/fortress-ui/courtyard-v2.png was image 2 (camera reference). Originals are retained. Selected generated files are assets-src/stronghold/barracks-isometric.png and assets-src/stronghold/expedition-isometric.png; runtime files are public/assets/stronghold/barracks.png and expedition.png. Alpha is preserved by the existing trim/resize pipeline.

## Barracks prompt

Use case: precise-object-edit. Regenerate the barracks in image 1 as a standalone transparent game sprite, correcting its ground-plane camera to fit image 2's paving grid. CRITICAL geometry: orthographic 2:1 isometric, all horizontal world axes projected at +30 and -30 degrees from screen horizontal (rise/run approximately 0.577), vertical posts exactly vertical. The existing barracks long facade is too shallow at about 15 degrees; redraw it with the long facade rising towards screen right at 30 degrees and side wall falling towards screen right at 30 degrees, no perspective convergence. Preserve its gray stone, red tile roof, twin doors, red sword banner, side awning, crates, spear rack, warm lanterns and detailed painted fantasy style. More visible roof/top surfaces consistent with courtyard. Isolated single building, no courtyard, no ground diamond/platform, no text, no other objects. Entire silhouette inside image with margin. Actual transparent background.

## Expedition Table prompt

Use case precise-object-edit. Regenerate image 1 expedition map table as isolated transparent fantasy game sprite correcting camera to match paving axes in image 2. Long table edges and rear fence must rise towards screen right at 30 degrees from horizontal, short table edges descend towards screen right at 30 degrees. All parallel edges stay parallel, verticals vertical, orthographic isometric camera, symmetrical ground axes. Existing long edges too shallow: significantly steepen from about 15 to 30 degrees. Preserve detailed hand painted wood and iron table, parchment map with pins, rolled scrolls, lantern, chests, two stools, blue compass banner on rear fence. Entire silhouette visible with margin. No ground platform, no scenery, no labels, transparent background. Match courtyard overhead view and established fantasy art.

## Final runtime calibration

The initial art briefs used ±30° to steepen the previously shallow facades. That is NOT the final game convention: a 2:1 ground diamond has axes ±26.565° (slope ±0.5). src/isometric.ts is authoritative. A small foot-pivot matrix fits the two measured painted ground directions to ±0.5 without leaning vertical posts. Each building has its own calibration in src/stronghold/scene.ts. Do not infer ground angles from pitched roofs. Future generation briefs must request slope ±0.5 / ±26.565° explicitly, avoiding the ambiguous term “30-degree isometric”.
