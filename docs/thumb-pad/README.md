[Play Stronghold](https://ark-whachat.fural.space/)

## Touch controls

A single touch (or mobile portrait drag) starting anywhere across the bottom third of the world (outside interactive HUD sockets) opens the floating thumb pad centered at the touch point. Drag to deflect the cap and walk the hero; release to stop and hide the thumb pad. By default when idle, the thumb pad remains hidden (`visible = false`). Dragging in the upper two-thirds pans the camera without showing the thumb pad.

Adding a second world touch while walking cancels the active thumb pad. Tapping a Crescent Action Arc skill socket does not spawn the thumb pad when idle and does not interrupt an active thumb pad walk.

## Verification

Run `npm run build && node scripts/verify-thumb-pad.mjs`. The script uses Chromium mobile touch emulation (`390x844`) to verify default hidden state, upper two-thirds camera pan without showing the pad, bottom-third floating thumb pad activation centered under the touch, cap deflection and hero movement while dragging, release hiding, HUD skill socket hit exclusion, multi-touch cancellation, and mobile portrait pointer preview support. Use `DEMO_URL=https://ark-whachat.fural.space/ node scripts/verify-thumb-pad.mjs` for the live build.
