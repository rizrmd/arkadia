## Generated gate animation

Created with the built-in image generation tool using `public/modular-stronghold/v2/gateway-grand.png` as the appearance reference. The original transparent output is preserved in `assets-src/gate-animation/generated-sheet.png`.

Prompt: Generate only the two arched oak-and-black-iron door leaves from the reference castle gate, with no masonry, torches, floor or backdrop. Produce a transparent 4 × 4 atlas of 16 consistent poses from closed to 90 degrees open, read row by row. Preserve the warm planks, cross braces, studs, ring handles, fixed scale and hinge positions. Render changing perspective, thickness, edges and shading as the doors swing inward; do not just shrink the closed image. No labels, borders, or checkerboard.

`node scripts/pack-generated-gate.mjs` extracts fixed cells and packs the generated poses into a 544 × 592 lossless WebP atlas. It creates no poses, warps, or motion. Runtime plays those frames forward and backward at 20 fps, taking 750 ms per full swing. Reversal keeps the current frame. Collision opens at 80% of the sequence. Only the small doorway canvas changes; the stone gateway, world raster, lights and world shadows remain cached. Ambient tint is applied to the atlas when the light changes.

## Verification

The TypeScript/Vite build, generated-frame playback and opacity checks, mobile performance regression, and two-way gate/tower collision checks passed. Browser performance is measured at 390 × 844 with CPU slowed 4×. See `docs/gate-proximity/performance.json` for the captured measurements.

The work was isolated in `fix/generated-gate-sprite` because another session had uncommitted edits to the gate files in the shared checkout. Those files were left untouched.
