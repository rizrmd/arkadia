[Play Stronghold](https://ark-whachat.fural.space/)

## Touch controls

A single touch starting anywhere across the bottom third of the world opens the floating thumb pad. Drag to walk. Release to stop and hide the pad. Touches above this area pan the camera.

Adding a second world touch while walking stops the hero and hands both fingers to the camera for pinch zoom. Neither finger can restart the thumb pad until all touches end. Pinches starting above the pad also ignore the pad area when another finger lands there. Mouse and keyboard controls are unchanged.

## Verification

Run `npm run build && node scripts/verify-thumb-pad.mjs`. The script uses real Chromium touch events to check the left, middle and right activation zones, the upper boundary, normal pinches, a pinch after active walking, a stationary hero during zoom, remaining-finger behavior and cancellation recovery. It also checks snow coverage, stable snow layer size and runtime errors. Use `DEMO_URL=https://ark-whachat.fural.space/ node scripts/verify-thumb-pad.mjs` for the live build.
