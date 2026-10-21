## Walking the hero in the Stronghold

The player's hero (the blue knight from the arena) now stands in the Stronghold court and can be walked around.

- **Keyboard:** arrow keys or WASD. Up/down walk straight up/down the screen, left/right straight across it, and two keys together walk along a 2:1 tile edge (like the arena). Keys are ignored while the clock slider or another text control has focus, and when Ctrl/Alt/Cmd is held.
- **Touch:** the thumbstick is hidden until a touch starts in the bottom-left quarter of the screen (left half, bottom half). It then appears centred under that thumb and hides again on release. Speed follows how far the knob is pushed, with a small dead zone. That finger never pans the map or selects a building; touches anywhere else still pan, pinch and tap as before.
- **Camera:** the camera stays put while the hero walks inside a central box, then eases after them. Dragging still pans freely; the next step brings the camera back.
- **Animation:** the arena's facing rules and clips. The rear view walks up, the front view walks down, diagonals are mirrored, and the last facing is kept when the hero stops. The step cycle follows distance walked, so a hero blocked by a wall stops animating.
- **Collision:** the hero stays on the court paving and is blocked by the ground footprints of buildings, props and walls (the same solids that cast the sun shadows). Blocked steps slide along the obstacle.
- **Depth:** sprites standing in front of the hero cut it out, which reads as walking behind them. A 28% ghost remains so the hero is never lost behind the front walls or the gate.
- **Lighting:** the hero is tinted by the lightmap under its feet (blue at night, warm near braziers and windows) and casts a sun shadow in the same direction as the buildings.
- **Saved spot:** the hero's position is remembered in this browser.

### Implementation

- [src/stronghold/controls.ts](../../src/stronghold/controls.ts): keyboard and thumbstick input as one screen-space direction.
- [src/stronghold/hero.ts](../../src/stronghold/hero.ts): movement, collision, facing, and drawing the hero into its own small canvas over the pre-rastered world.
- [src/stronghold/world-view.ts](../../src/stronghold/world-view.ts): creates the hero, places it on every camera frame, and adds the camera follow.

The world stays a single pre-rastered surface. A walking frame redraws only the hero's canvas (about 90 × 70 world px) and moves compositor transforms.

### Verification

`npm run build`, then `node scripts/verify-hero-walk.mjs` (or `DEMO_URL=https://… node scripts/verify-hero-walk.mjs` against a deployed host). The script checks the following:

- W walks straight up with the rear view, and the hero keeps that facing when stopped.
- The down arrow walks down with the front view.
- D and the left arrow walk straight across with mirrored art, and W+D follows the tile edge (slope −0.5).
- The expedition table stops the hero in front of it.
- Holding right ends at the east wall inside the court.
- After a drag pans the camera away, walking brings the camera back after the hero.
- The clock slider's arrow keys do not walk the hero.
- The position survives a reload.
- At night the hero is tinted blue.
- On a 390 × 844 touch phone the thumbstick starts hidden, and a drag in the top-right quarter pans the map without showing it or walking the hero. A touch in the bottom-left quarter shows the stick centred under the thumb, a drag to the right walks the hero right, and releasing stops the hero and hides the stick.
- Desktop (mouse) never shows the thumbstick.
- No page errors.

Screenshots are in this folder: `1-spawn-noon`, `2-blocked-by-table`, `3-at-east-wall`, `4-morning-shadow`, `5-night-tint`, `6-phone-idle` (no stick at rest) and `7-phone-thumbstick` (stick under a bottom-left thumb).

### Limits

- Only walking. No attack, interaction with buildings, or other characters in the Stronghold yet.
- Depth uses one occlusion decision per sprite. Where a single sprite has parts both in front of and behind the hero (the expedition table and its stools), the whole sprite counts as in front.
- The hero's sun shadow falls over walls and buildings it reaches rather than bending onto them.
