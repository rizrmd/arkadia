## Byte-proportional loading bar

The loading bar used to advance one step per finished artwork file. About 40 files of very different sizes
(2.8 MB textures next to 20 KB sprites) arrive in parallel, so on a phone the bar jumped ahead and then
sat still while the last large files downloaded.

Now the bar follows the downloaded bytes:

- The build writes `asset-sizes.json` (`vite.config.ts`) with the byte size of every public image, so the
  total (27.2 MB today) is known before any download answers. `Content-Length` is the fallback.
- `loadImage()` in `src/app/loader.ts` streams each file with `fetch`, counts bytes as they arrive, then decodes
  the image from a blob. Each URL is downloaded once and shared.
- The hero and revenant atlases are fetched in the same batch, so the hero step no longer waits on a download.
- Downloads fill 0–92%. The hero setup takes it to 96% and the first world paint to 100%.
- The label shows the transfer, for example `Loading artwork · 14.3 of 27.2 MB`.

`server.mjs` now sends `Content-Length`.

## Evidence

`node scripts/verify-loading-progress.mjs` (390 × 844 phone, throttled to `MBPS`, default 40) samples the bar
and checks it never goes backwards, the total never changes, it never stalls 2 s during downloads, and the
game finishes loading without errors. Set `VERIFY_URL` to test the live site.

- `results.json` is after the change and `results-before.json` is the old build, both at 10 Mbps.
- `progress-chart.png` plots both runs (`node scripts/chart-loading-progress.mjs`).
- At 10 Mbps the old bar sat at 14% for 4.9 s and at 32% for 2.9 s, then went from 46% to 89% in 3 s.
  The new bar climbs about 3% every 0.6 s until the artwork is in.

## Live

Deployed to `arkadia-stronghold` with `node scripts/publish-loading-progress.mjs`. The live proxy drops
`Content-Length`, so the build-time size list is what makes the total exact there.
`results-live.json`: 10 Mbps, total fixed at 27.2 MB, longest flat stretch while downloading 0.5 s, no errors.
