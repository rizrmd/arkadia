## Eight-direction walking

Deer and crocodile now face **N, NE, E, SE, S, SW, W and NW** as they walk in the live [Arkodia game](https://arkodia.online/). Each species has four distinct gait poses per direction: **64 transparent frames** total. The runtime chooses the direction from actual movement after the existing 2:1 isometric projection. It keeps the last facing when idle and stops the walking cycle. No horizontal mirroring is needed.

![Eight-direction deer and crocodile rendered in Pixi](https://arkodia.online/wildlife-directions/pixi-directions.png)

## Production behavior

The current asset is `/wildlife/eight-directions-atlas.png`: 1024 × 4096 RGBA, four columns of 256px cells. Rows 0–7 are deer; rows 8–15 are crocodile, both ordered N, NE, E, SE, S, SW, W, NW. Each species uses a fixed scale and the same foot pivot at 210/256. Source silhouettes are segmented before packing so antlers, snouts and tails remain complete even where generated spacing differs from a perfect grid.

Movement speed, collision checks, hunt eligibility, Food collection, cooldowns, saves and the existing world/editor are preserved. The cumulative release includes the latest snowy starter walls, Gold/time resource panel and auto-chop fix.

![Live production game with directional wildlife](https://arkodia.online/wildlife-directions/live-game.png)

## Verification

Shipped gameplay commit: **d2162c7**. Production `/healthz` and the client release manifest match. All **43** release client/atlas files passed exact byte hashes or decoded RGBA comparison for PNG. The environment editor remains available.

The production browser loaded without page errors, observed both animals changing their actual ground positions, hunted deer through a real projectile and crocodile through nearby combat, and collected **600 Food exactly once**. All eight direction selections and idle facing passed for both species. All 64 transparent frames passed silhouette/pivot/uniqueness checks and rendered in Pixi. TypeScript, production build, existing wildlife/gathering tests and all Go packages passed.

[Production browser results](https://arkodia.online/wildlife-directions/live-browser.json) · [Release verification](https://arkodia.online/wildlife-directions/live-verification.json) · [Atlas metadata](https://arkodia.online/wildlife-directions/atlas.json)

## Image generation and sources

Created with the **imagegen skill and built-in image generation** using the previous painted species sheets as reference. Prompts requested four consecutive walking/crawling poses for each of eight directions, a fixed elevated camera, consistent anatomy/scale, transparent background and no text, ground or cast shadows. Deer retains brown spotted fur, white chest and antlers; crocodile retains olive-brown armored scales and a long tail. Crocodile v2 adds generous spacing; packing preserves complete connected silhouettes.

### Selected directional sources

![Deer eight-direction source](https://arkodia.online/wildlife-directions/deer-eight-directions.png)

![Crocodile eight-direction source v2](https://arkodia.online/wildlife-directions/crocodile-eight-directions-v2.png)

### Previous reference sheets

These are the earlier single-view sheets used only as style references; gameplay now uses the directional atlas above.

![Previous deer reference sheet](https://arkodia.online/wildlife-directions/deer-source.png)

![Previous crocodile reference sheet](https://arkodia.online/wildlife-directions/crocodile-source.png)

### Layout review history

The first crocodile directional sheet and first Pixi layout are retained for the images discussed during implementation. The selected v2 source and final Pixi gallery above supersede them; the final packer prevents cropping at nominal cell boundaries.

![Initial crocodile directional sheet](https://arkodia.online/wildlife-directions/crocodile-eight-directions-v1.png)

![Initial layout before complete-silhouette packing](https://arkodia.online/wildlife-directions/pixi-directions-draft.png)
