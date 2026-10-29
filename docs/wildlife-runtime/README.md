## Production wildlife fix

Deer and crocodiles now choose random ground waypoints, move at species-specific speeds, face their movement direction, and stop animating when stationary. Movement checks terrain, tree clearance and cliffs; loot remains fixed at the death position. Nearby prey pause during the hero's melee windup.

Previously, wildlife only changed animation frames and was absent from skill collision and automatic skill targeting. Stable wildlife combat adapters now participate in existing projectile, cone and circle hit tests. They commit the existing persisted hunt/loot transition without granting monster XP or souls. Monster checkpoint indexing remains separate. Melee reach accounts for the animal body.

Verification: TypeScript and production build; eight existing gathering/save/reward scenarios; both-species movement tests covering random displacement, speed/radius bounds, blocked paths, stationary loot and melee windup; existing gameplay persistence and progression suites. A real Chromium gameplay run checks both species move, hero combat kills them, and pickups grant exactly 100 + 500 Food once. See `local-browser.json`.

Release uses the existing additive Arkodia publisher and deployment lock, with the latest cumulative source and existing complete artwork inventory. The release adds client bundles, the matching cumulative server binary and a checksum manifest; map revisions and saves remain in their persistent locations.

## Production verification

Deployed gameplay commit: `b10792a15e80a3fa88318efb08d32b3210cc09c2` at https://arkodia.online/. The live server build matches the release manifest; all 43 client file checksums match. The production Chromium run passed all five gameplay checks with zero page errors, including both species moving, both being hunted and exactly 600 Food from both pickups. See `live-browser.json`.
