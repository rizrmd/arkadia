## Eight compass directions

Deer and crocodile now use separate N, NE, E, SE, S, SW, W, NW walking views. Each direction has four distinct generated gait poses: 64 frames total. The game selects the row from the projected movement vector in the existing 2:1 isometric projection. Idle animals keep their last facing and use the first pose. Movement speed, hunt eligibility, Food rewards, respawns and saves retain the existing rules.

Atlas: `/wildlife/eight-directions-atlas.png`, 1024 × 4096 RGBA, 256px cells, four columns. Deer occupies rows 0–7; crocodile rows 8–15. Foot pivot is 210/256 (runtime 0.82). A fixed scale per species preserves gait proportions.

## Generation

Tool: built-in imagegen, using the existing painted species sheets as visual references, transparent background. Each prompt requested a 4-column × 8-row atlas, four consecutive walking/crawling poses per direction, ordered N, NE, E, SE, S, SW, W, NW, a fixed elevated camera, consistent anatomy and scale, complete silhouettes, and no text, ground or shadows. Deer preserves brown spotted fur, white chest and antlers; crocodile preserves olive-brown armored scales and long tail.

Original generated PNGs remain in `assets-src/wildlife/*-eight-directions*.png`; crocodile v2 is the selected source. `scripts/wildlife-sprites/pack-directions.mjs` segments complete silhouettes before assigning rows and columns, removes stray fragments, uses a fixed species scale, and packs the runtime atlas.

## Verification and release

`node scripts/wildlife-directions/test.mjs` checks all eight projected directions for both species, idle facing, zero movement, alpha, bounds and 64 unique frames. Existing wildlife motion and gathering behavior tests cover movement bounds, collision rejection, hunting, exactly-once Food, saves and respawns. `scripts/wildlife-directions/deploy.sh` typechecks, runs these tests and Go tests, builds the cumulative production client/server and publishes with the shared deploy lock and live-ancestor guard. Existing public layers, map data, saves and editor remain in place.
