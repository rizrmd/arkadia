## Flame Fan combat review preview

Separate preview only; game VFX and mechanics are unchanged. Revised after human feedback that ranks looked alike and combat actors were missing.

Uses actual game atlases from public/assets/characters/manifest.json: Ember Warden attack-E/idle-E, Revenant idle/hit. The build packages exact atlas bytes and a two-character manifest under this preview's assets/actors prefix, avoiding edits to shared game assets. Actors are drawn above the flame for review readability. Recoil, contact glow and impact rings are illustrative rather than a damage simulation.

A stationary NixieFX/Pixi billboard renders a procedural WebGL flame material. All ranks retain a connected 108-degree fan from release (0.42 s), with no projectile emitter. The five ranks add one through five curled tongue strata, increasing density, gold/ivory heat and contact effects. Radius, damage and cooldown come directly from flameFanLevel; there are no new balance values. The fan radius uses the existing 4.4 × (1 + 0.18 × (rank − 1)) tiles; angle remains 108 degrees.

One clock drives the selected view and all five comparison cards. Rank changes preserve time/paused state, so scrubbing or pausing makes exact-phase comparisons possible. Camera, target positions and 49-pixel tile scale are identical for every rank. Desktop displays five cards at once; mobile provides horizontally scrollable 260px cards with selection and the same large player controls. Game sprites and UI render at 600×400; the procedural texture uses 300×200 to reduce comparison cost. Playback requests at most 30 frames/s; no hardware/mobile FPS claim is made.

Build: `node scripts/flame-fan-preview/build.mjs`.
Verify: `node scripts/flame-fan-preview/verify.mjs` (local), or set VERIFY_URL to the public preview URL (live).
Publish: `node scripts/flame-fan-preview/deploy.mjs` through the existing supported additive publisher; only /ember-warden-review/flame-fan-preview is written. No game release or gateway mutation.

Verification covers 1440×900, 390×844 and 320×560, all ranks at 0.20/0.58/0.95/2.20 s, loaded actor assets, shared camera/clock, pixel coverage progression, Play/Pause, Replay, Loop and end behavior, scrubbing, rank/card selection, Day/Night, overflow and cross-origin iframe. The browser is fresh for each viewport. Software GPU checks use state-based waits for playback, rather than assuming a fixed short sleep proves a rendered frame. Earlier iterations caught overexposed flame detail, premature hit reactions and brittle fixed-delay assertions; final reports describe the revised build.

This remains a procedural interpretation of the approved painted reference, requiring WebGL. It does not implement gameplay damage, game projection/occlusion, or integration of this candidate into the actual game.
