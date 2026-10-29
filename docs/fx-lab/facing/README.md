## WASD facing correction

FX Lab previously passed isometric tile-space yaw to the 3D hero renderer. Gameplay's hero renderer expects `atan2(screenX, screenY)`, so the model faced a different heading from screen-space keyboard movement. The Facing label also retained its old text during movement.

The lab now converts screen heading to gameplay model yaw independently from tile-space movement/VFX aim, uses exact 45-degree diagonal screen headings, and updates the Pixi Facing label and URL when keyboard heading changes. The gameplay renderer, combat and player-save rules are unchanged.

`node scripts/fx-lab/verify-facing.mjs` exercises real W/A/S/D keyboard events for all eight headings on both heroes, verifies projected movement, the model yaw supplied to the gameplay renderer, the live Pixi label and URL, and checks return to idle after release. South-facing screenshots are captured without active VFX to make orientation visible. Production mode: `BASE_URL=https://arkodia.online OUT_DIR="$HOME/reports/fx-lab-facing-production" node scripts/fx-lab/verify-facing.mjs`.
