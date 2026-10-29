## Full gateway sprite animation

Generated with the built-in image tool from the existing closed/open gateway references. Each of the 16 frames contains both towers, the arch, banners, torches and both door leaves together. The opening and closing are played at 20 fps (750 ms), with reversal continuing from the current frame.

Prompt: Create a transparent 4 by 4 sprite sheet of the complete reference gateway, with synchronized doors swinging inward behind the stone jambs. Keep the entire gateway in every cell: both stone towers, arch, blue banners, torches, bases and both wooden leaves. Progress from closed to 90 degrees open across 16 frames. Preserve stationary stonework, camera, scale, baseline and framing, with consistent 2:1 ground perspective. No floor, environment, people, labels or grid lines. Refinement: remove all backdrop and floor shadows, including through the open arch, while preserving the exact grid and all 16 poses.

The source image is `assets-src/full-gateway/generated.png`. `node scripts/pack-full-gateway.mjs` finds the sixteen complete alpha silhouettes and registers them to one 384 × 256 cell and one 270 × 180 world rectangle. This avoids cutting tower tops at the generated sheet's uneven margins. No door geometry or new poses are created in the packing step.

Runtime uses `full-gateway-sheet.webp` and its JSON manifest. The gate has one pivot at the scene slot (577, 790), with a 0.97 vertical pivot. Its old static image is excluded from the world raster. Each full frame is drawn once on the separate gateway canvas; the hero is layered behind or in front according to the threshold/tower ground edge. The hero no longer uses a second, mismatched gate silhouette for ghost clipping. Picking samples the actual displayed frame.

## Verification

The build and browser checks passed locally: full sprite frames contain both towers, closed/open passage alpha, frame reversal, unchanged world/light/shadow rebuild counts during transitions, two-way passage, tower collision, depth order on both sides, absence of a duplicate static gate, and pivot placement before/after camera movement. Position error was below 0.001 world/screen pixel in the recorded depth check.

Performance is measured on a 390 × 844 viewport with CPU slowed 4 times. See the gate performance and full-gateway depth JSON reports. Runtime screenshots are recorded for closed, opening, open and closing poses.

## Live verification

Implementation `cab26d0` was pushed to `feat/stronghold` (with documentation-only merge `84fa4a8`) and deployed to the canonical Stronghold sandbox. All three browser checks passed on the public host: `verify-gateway-depth.mjs`, `verify-gate-animation.mjs`, and `verify-open-gate.mjs`.

The live 390 × 844 / 4× CPU test measured p95 frame interval 66.7 ms and maximum 83.3 ms, with no world, light or shadow rebuild during the animation and no JavaScript errors. Both full towers were present in every sampled frame. Mid-swing reversal, two-way passage and tower collision passed. The live depth test measured placement errors below 0.001 pixels before and after camera panning, with correct hero/gateway order on either side of the threshold and zero duplicate gate draws in the cached world.
