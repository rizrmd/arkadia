## One-third forward-range correction

Preview-only correction: `x' = 171 + (x - 171) × 2/3`, measured on the scene's forward (horizontal) axis from casting hand x=171. Scene/camera scale, vertical spread, timing, source textures and original ignition remain unchanged. All seven released-effect layer containers use the same affine transform, including Nixie sheet quads, tongues, baked interior, ground heat, contacts, ember trajectories and smoke. Original compact hand ignition is retained at x=171 rather than compressed.

Target feet x coordinates: 487 → 381.6667; 417 → 335; 536 → 414.3333. Their y coordinates stay 245/335/402 so the broad fan spread is retained. Actors keep their original size; contact bursts use the matching transformed positions.

The diagnostic `geometry` state exposes the transform, target coordinates and per-layer rendered quad bounds. Nixie culling bounds are intentionally huge and are excluded: actual particle quad corners (including rotation and sheet opening) supply the reported geometry. At every phase, each released-layer forward edge relative to x=171 is exactly two-thirds of its former edge. This measures forward reach, not radial distance to every point of the broad fan.

`range-before-*` captures are from the actual public previous version at 320 ms, captured before deployment. `range-after-*` are actual public corrected captures at the same phase and viewport. Comparison images use those real captures, not concept art. Versioned `*-range-v3` verification retains earlier evidence.

Validation: TypeScript and production build; real pointer controls, layer isolation, original source hash/alpha and source frames, Nixie Sub-UV quads and ember/smoke rise/expand/fade at 1440×900, 390×844, 320×560; cross-origin iframe playback at 390/900 widths. No HTML form controls. Chromium viewport validation, not a physical Android benchmark.

Publish through the existing locked script: `fural-agent repos ship RPe11327fbfe413dbeba246526 --mode script --script scripts/flame-fan-flipbook/deploy.sh`. It excludes peer WIP, uploads bounded 6 MiB layers and performs one serialized restart. Live evidence requires a second committed publication after live capture.
