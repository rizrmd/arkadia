## Flame Burst Pixi player

Live path: https://ark-whachat.fural.space/ember-warden-review/flame-burst/

The original discussion PNG DAe32537184886822bfa31e1b6 is preserved byte-for-byte in public/flame-burst/source.png. No new art or background removal is used. The 1254×1254 RGBA source has 860,945 zero-alpha pixels, 711,567 partial-alpha pixels and four opaque pixels. No opaque neutral checkerboard pixels were found. Dark/light/checker backgrounds expose the source transparency without additive blending.

Sixteen row-major cells use rounded quarter boundaries [0,314,627,941,1254]. The cell-bottom center is the stable sprite registration point (0.5,1); frames are never independently cropped, recentered or rotated. This registers the cell, not an inferred physical flame origin: generated art has residual internal motion, occasional boundary specks and an intentional visible decay-to-ignition loop cut. Source continuity is a concept-art limitation, not a production guarantee.

All visible controls and labels are English Pixi Text/Graphics inside one canvas. Play/Pause, 1–60 FPS (+/−), eight spawn headings and checker/dark/light backgrounds support pointer input. Keyboard Space toggles playback, arrows left/right pause and step, up/down adjust FPS. The three bursts stay screen-up while heading changes only their placement. This is a billboard arrangement, not universal geometric rotation invariance or a 3D volume. Playback uses elapsed ticker milliseconds, with a 100ms long-frame clamp to avoid jumping over the burst after suspension.

TypeScript and the Vite production build are checked. The Playwright fixture checks actual pointer controls, pauses, frame stepping, all 16 frames, all eight headings, viewport control bounds, no HTML form controls and asset/page errors. Run each viewport in a fresh Chromium process on this sandbox (the installed single-process Chromium wrapper can stall after repeated WebGL reloads):

    node scripts/flame-burst/build.mjs
    WIDTH=1440 HEIGHT=900 node scripts/flame-burst/verify.mjs
    WIDTH=390 HEIGHT=844 node scripts/flame-burst/verify.mjs
    WIDTH=320 HEIGHT=560 node scripts/flame-burst/verify.mjs
    WIDTH=844 HEIGHT=390 node scripts/flame-burst/verify.mjs

Set PLAYER_URL=https://ark-whachat.fural.space/ember-warden-review/flame-burst/ to verify production. These are desktop/mobile browser viewport checks, not physical-device GPU benchmarks.

Release: commit selected owned paths, push, then `fural-agent repos ship RPe11327fbfe413dbeba246526 --mode script --script scripts/flame-burst/deploy.sh`. The script holds the shared lock, verifies matching committed source, builds the isolated page, includes committed evidence and publishes one bounded layer through the existing Arkodia publisher. No game files or peer WIP are packaged. The /ember-warden-review/flame-burst prefix survives subsequent game layers because it is independent of their selected file set.

Knowledge supports an HTML iframe, with the deployed URL. Chat capability inspection: this session exposes message text, file/photo/audio attachments, download and sandbox file-preview links; no tool or CLI operation exposes an inline interactive chat embed. An iframe is not presented as working chat content. Use the live link or the Knowledge player. The platform was not modified.

## Release verification

Implementation 4042a86e and public-route correction c089cf50 were pushed and deployed through the repository script pipeline. Live checks passed 1440×900, 390×844, 320×560 and 844×390, all sixteen frames, repeated Play/Pause/FPS/background controls and all eight upright headings. Cross-origin iframe animation and pointer Pause passed at 390×700. The public `source.png?raw=1` SHA-256 matches the original attachment, and game /healthz returns 200. JSON reports and screenshots are retained alongside this document. An early /flame-burst/ route returned the game's SPA fallback; the final URL uses the existing public /ember-warden-review/ gateway route. No gateway/platform code changed.

## Modular sprite sheet player

`src/sprite-sheet/playback.ts` exports `SpriteSheetConfig`, `validateConfig`, `sliceGrid` and `SpriteSheetPlayback`. This engine owns cell views, frame selection and a shared clock. It has no Flame Burst asset paths, DOM controls, heading logic or scene layout. The Pixi viewer in `src/fx/flame-burst.ts` is a separate consumer. Grid slicing supports unequal cell dimensions, non-square sheets and partially occupied final rows. The viewer preserves cell aspect ratio.

`public/flame-burst/clip.json` configures the Flame Burst preset. The same viewer accepts `?clip=URL_TO_JSON`; image URLs resolve relative to that JSON URL. Supply CORS access for external metadata/images. Metadata fields: `title`, `source`, `columns`, `rows`, optional `frameCount`, `fps` (1–60), normalized `pivot: {x,y}` and optional `loop` (default true). Invalid metadata produces an English error within Pixi. A preset example:

```json
{"title":"My effect","source":"effect.png","columns":3,"rows":2,"frameCount":5,"fps":10,"pivot":{"x":0.5,"y":1},"loop":false}
```

In another Pixi scene, construct `new SpriteSheetPlayback(texture, config)`, attach `player.createSprite()` to your container, and call `player.update(ticker.deltaMS)`. Use `playing`, `fps`, `seek(index)` and `step(delta)` to control it; call `resetClock()` after suspension, `detach(sprite)` when removing an instance, and `destroy()` to release generated frame views. The shared source texture remains caller-owned. Positions, scale and rotation remain scene-owned; this viewer explicitly sets rotation to zero for upright flames.

`node scripts/flame-burst/test-modular.mjs` checks independent 101×99 / 3×2 / five-frame input, custom pivot, synchronization of two sprites, placement preservation, pause, step, FPS changes, looping and non-looping completion, rejected metadata and source ownership. It does not merely retest the Flame Burst preset.
