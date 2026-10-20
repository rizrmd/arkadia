## Mobile pan benchmark

Run `npm run build`, then `REPORT=/path/to/report.json node scripts/benchmark-mobile-pan.mjs`. The script uses Chromium mobile emulation (390 × 844, DPR 3, 4× CPU slowdown) with 101 pointer movements. Reports capture Canvas2D work, synchronous handler durations and sampled animation-frame intervals. Results include idle frames between inputs and are not a physical-device FPS guarantee.

The baseline and optimized samples are in `before.json` and `after.json`. The script also asserts that panning does not resize the backing store or recreate patterns, resource ticks do not redraw the world, and zoom, selection and resize still work. Cache memory is bounded to 32 MiB except when the active viewport itself needs more; visible sections remain protected.
