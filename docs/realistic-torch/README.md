## Realistic torch release

Generated with the built-in imagegen tool, replacing the simple canvas silhouette in the supplied wall-torch reference. Three lit poses run at 120 ms per frame, offset across 16 torches. The unlit lower body remains baked; small 96 × 96 canvases update only the flame and glowing fuel region, without rebuilding world lighting. Daytime hides the flame layer. Free-standing torches retain their support posts. Gateway torches embedded in the gate artwork are separate assets.

Source: `assets-src/realistic-torch/generated.png`. Runtime: `public/realistic-torch/frame-{0,1,2,3}.webp` (three burning frames and one unlit frame). The packing script extracts and registers source cells, resizes them, and preserves alpha. The generated upper basket/fuel has small pose differences; this is a simple three-frame loop, not a fluid simulation.

Generation prompt: Generate a transparent horizontal four-cell realistic isometric medieval wall torch sheet: three identical torch bodies with left-curl, upright split, and right-curl flame poses, then one unlit torch. Charred wood, forged iron basket, oil-soaked cloth, small wall bracket, grain, soot and rough metal. Three-quarter camera slightly above. Orange translucent flames with pale yellow cores and wispy tips. Lock body geometry, camera, scale and pivot. No wall, floor, shadows, text, labels, grid or background.

Validation: `npm run build` and `node scripts/verify-realistic-torch.mjs`. Browser verification checks all 16 canvases, three distinct frame IDs and pixel images, unchanged lighting bake counter during animation, daytime shutdown and absence of page errors. Screenshots and results are in this folder.
