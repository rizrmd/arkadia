## Stable masonry, preserved door animation

The generated frames still contained small changes to stone geometry and banners after registration. The packing step now locks every pixel outside the arched doorway to frame 0. It preserves the original generated doorway poses within the aperture. The output remains one complete 16-frame gateway sprite sheet with the existing timing, pivot, depth and collisions.

Regression: `node scripts/verify-gateway-stability.mjs`. The old atlas failed with over one million changed stone pixels. The stabilized atlas passes with zero visible stone pixel changes across all 16 frames, while retaining 16 distinct door poses. Transparent RGB values are ignored when alpha is zero, since the WebP encoder may change invisible colour data.

The browser animation/performance check no longer reads tower pixels from the GPU every animation frame. Static content is checked by the asset regression; runtime performance is measured without that readback overhead. The 390 × 844 / 4× CPU local check passed with p95 33.4 ms, maximum 66.6 ms, no world/light/shadow rebuilds, and successful mid-animation reversal. Depth/pivot checks and the production build passed.

Deploy with `node scripts/publish-gateway-stability.mjs`: it patches only the four gateway assets and the stability report, preserving other live app, knight and HUD changes.
