## Painted food drops

Deer (100 Food) and crocodile (500 Food) now share a painted raw meat sprite instead of the oval-and-bone Graphics drawing. The resource counter uses the same sprite. Loot is 38 world pixels wide, centered under the existing label; the HUD version is 25 pixels wide. Collection, cooldowns, persistence and eating are unchanged.

Generated with the built-in imagegen tool. Source: meat-source.png. Prompt: One raw meat haunch with short ivory bone toward lower right, deep crimson muscle, pale fat and broad readable marbling; hand-painted 2D fantasy inventory art, upper-left light, burgundy underside, three-quarter view, compact diagonal composition, transparent background, readable at 40 pixels. No text, plate, scenery, glow or blood splashes. Runtime PNG is trimmed, resized to 256 pixels plus eight transparent padding pixels on each side; alpha is preserved.

Verification: TypeScript and production Vite build; eight existing gathering rules scenarios; real Pixi controller checks for both drops, exactly-once proximity collection, reload, cooldowns, rollback and desktop/mobile HUD bounds. Loot screenshots use the real controller in an isolated fixture, not the full production terrain.

Deployment uses the existing cumulative release publisher and shared deployment lock, with current-production ancestry checks. The release carries compiled game code, matching server build and new assets; existing editor bundles and other artwork remain in place.
