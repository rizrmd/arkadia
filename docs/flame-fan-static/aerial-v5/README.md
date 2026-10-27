## Static aerial flames — revision 5

Adds 14 upright, depth-sorted flame curls using actual frames 4–11 from `public/flame-fan-flipbook/hand-ignition-source.png`, the curling-tongue source used by the supplied flipbook review. No generated replacement illustration. Each sprite is anchored near its hot foot, with varied scale and frozen frame; existing smoke sorts around it. Broad dark ground gaps remain visible.

All revision 4 generation code and random draws stay intact. The new placements are appended after the last original random draw. Soil projection, fissures, low flames, smoke and embers retain their baseline positions and styling. `?baseline` hides only the new aerial sprites for comparison. Rejected plates are not used. All controls remain English Pixi objects; ticker stopped.

Baseline PNGs were captured from live revision 4 before deployment. `node scripts/flame-fan-static/verify-baseline.mjs` compares hidden-aerial renders against these saved PNGs at 1440×1000, 390×844 and 320×560. Average channel differences are 0.177, 0.083 and 0.099 out of 255 (maximum 6, 5, 5), within mean <0.3/max ≤8 tolerance for texture batching/rounding; this is not an exact pixel identity claim. Consecutive combined frames are byte-identical. `verify.mjs` also checks one canvas, no HTML controls, Pixi buttons, upright sprites, stopped ticker and no missing assets/page errors. TypeScript and isolated Vite build pass.

The source flipbook live URL was inspected visually with Chromium and its source/atlas inspected locally. Managed browser tools were unavailable, so the existing Playwright Chromium was used. An initial large raw-buffer assertion diff exceeded the session RAM allocation; the verifier now computes bounded numeric differences rather than formatting buffers.
