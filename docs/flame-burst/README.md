## Flame Burst Pixi player

Live path: https://ark-whachat.fural.space/flame-burst/

The original discussion PNG DAe32537184886822bfa31e1b6 is preserved byte-for-byte in public/flame-burst/source.png. No new art or background removal is used. The 1254×1254 RGBA source has 860,945 zero-alpha pixels, 711,567 partial-alpha pixels and four opaque pixels. No opaque neutral checkerboard pixels were found. Dark/light/checker backgrounds expose the source transparency without additive blending.

Sixteen row-major cells use rounded quarter boundaries [0,314,627,941,1254]. The cell-bottom center is the stable sprite registration point (0.5,1); frames are never independently cropped, recentered or rotated. This registers the cell, not an inferred physical flame origin: generated art has residual internal motion, occasional boundary specks and an intentional visible decay-to-ignition loop cut. Source continuity is a concept-art limitation, not a production guarantee.

All visible controls and labels are English Pixi Text/Graphics inside one canvas. Play/Pause, 1–60 FPS (+/−), eight spawn headings and checker/dark/light backgrounds support pointer input. Keyboard Space toggles playback, arrows left/right pause and step, up/down adjust FPS. The three bursts stay screen-up while heading changes only their placement. This is a billboard arrangement, not universal geometric rotation invariance or a 3D volume. Playback uses elapsed ticker milliseconds, with a 100ms long-frame clamp to avoid jumping over the burst after suspension.

TypeScript and the Vite production build are checked. The Playwright fixture checks actual pointer controls, pauses, frame stepping, all 16 frames, all eight headings, viewport control bounds, no HTML form controls and asset/page errors. Run each viewport in a fresh Chromium process on this sandbox (the installed single-process Chromium wrapper can stall after repeated WebGL reloads):

    node scripts/flame-burst/build.mjs
    WIDTH=1440 HEIGHT=900 node scripts/flame-burst/verify.mjs
    WIDTH=390 HEIGHT=844 node scripts/flame-burst/verify.mjs
    WIDTH=320 HEIGHT=560 node scripts/flame-burst/verify.mjs
    WIDTH=844 HEIGHT=390 node scripts/flame-burst/verify.mjs

Set PLAYER_URL=https://ark-whachat.fural.space/flame-burst/ to verify production. These are desktop/mobile browser viewport checks, not physical-device GPU benchmarks.

Release: commit selected owned paths, push, then `fural-agent repos ship RPe11327fbfe413dbeba246526 --mode script --script scripts/flame-burst/deploy.sh`. The script holds the shared lock, verifies matching committed source, builds the isolated page, includes committed evidence and publishes one bounded layer through the existing Arkodia publisher. No game files or peer WIP are packaged. The /flame-burst prefix survives subsequent game layers because it is independent of their selected file set.

Knowledge supports an HTML iframe, with the deployed URL. Chat capability inspection: this session exposes message text, file/photo/audio attachments, download and sandbox file-preview links; no tool or CLI operation exposes an inline interactive chat embed. An iframe is not presented as working chat content. Use the live link or the Knowledge player. The platform was not modified.
