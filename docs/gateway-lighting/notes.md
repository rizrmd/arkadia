## Rendered gateway stability and shared lighting

The earlier stability check excluded too much of the inner arch. The new rendered-canvas regression reproduced 13,328 changed pixels on the deployed version with the camera held fixed. The packed doorway aperture is now tighter and includes only the moving leaves; its upper rim and jambs stay canonical. All 16 actual rendered frames now keep stone pixels and screen bounds unchanged in both pinned day and night conditions.

The animated gateway previously used flat ambient tint, bypassing the world's local torch lightmap and emissive bloom. It now shades each small frame with the same lightmap crop and bloom as the world, using the same world-space bounds. Lighting refreshes when the shared lighting revision changes; door motion still does not rebuild the world, light pools or shadows. Daylight resets the shared lightmap to white to avoid retaining a night tint after changing the clock.

The sprite uses versioned `full-gateway-v3-*` URLs, and its canvas identifies itself as `gateway-lightmap-v3` so deployed tests verify the actual renderer and asset generation.

## Verification

The production build, runtime stability in day/night, asset stability, lighting at noon/night/dusk, depth, passage/collision and 4× CPU mobile animation tests passed locally. Actual rendered frames: 0 changed stone pixels, 0 moved bounds, all 16 poses observed. At night, unlit masonry retains 27% of day luminance while torch-lit masonry retains 79%; flame luminance remains approximately 249/255.

Checks: `verify-gateway-render.mjs`, `verify-gateway-lighting.mjs`, `verify-gateway-stability.mjs`, `verify-gateway-depth.mjs`, `verify-open-gate.mjs`, and `verify-gate-animation.mjs`. Publish the committed build with `node scripts/publish-gateway-lighting.mjs`.

## Live release verification

Implementation `664da53` was pushed to `feat/stronghold` and deployed. Live tests verified the `gateway-lightmap-v3` renderer and versioned assets, zero changed stone pixels and zero moved bounds at noon and night, restored local torch illumination and bright flame emission, and successful night → noon → night clock transitions.

The final 390 × 844 / 4× CPU live animation check passed with p95 and maximum frame interval 33.4 ms, successful reversal, unchanged world/light/shadow counters, and no JavaScript errors. Reports and screenshots in this directory were captured from the public host.
