## Scope and cause

All foreground parallax artwork must remain out of focus in Safari: court and snow, left and right, desktop and mobile. Landscape strips inherit the blurred mobile texture.

The original texture bake relied on Canvas 2D `filter`. Browsers that ignore this unsupported property silently drew sharp artwork. The tested WebKit 27.2 build also takes the fallback path.

## Fix

`canvas-blur.ts` probes the actual filtered pixels once. Working browsers retain native canvas blur. Other browsers use a separable Gaussian with premultiplied alpha, preserving transparent silhouettes without dark fringes. The shared `bakeDepthBlur` calls this helper before the existing desktop feather and landscape crop. Baked dimensions, padding, cache, placement and per-frame rendering remain unchanged.

## Verification

`npm run build` passes. `node scripts/verify-safari-parallax.mjs` checks transparent-colour isolation and all eight original artworks. Set `WEBKIT_EXECUTABLE` to include a configured WebKit executable.

The recorded run covers Chromium native blur, Chromium with ignored filters, WebKit without native blur, and WebKit with ignored filters: 32 artwork cases. All retain 320×380 desktop / 180×150 mobile dimensions. Measured interior detail energy falls to 14–27% of the sharp source. This is automated browser evidence, not an assertion of testing on physical Apple devices.

See `verification.json` for individual pixel metrics and bake timings.

`node scripts/verify-safari-parallax-game.mjs` also passes on the production build in Chromium (ignored filters) and WebKit: 12 integration cases covering court/snow at 1440×900, 390×844 and 844×390. The game reaches ready state without page errors. Its visible Pixi sprites use cached canvas textures with translucent edges, the expected baked dimensions, and the landscape crops. See `game-verification.json` for the actual runtime snapshots and texture measurements.

## Delivery status

GitHub access is resolved using the explicitly authorized `thickkoezz` credentials. The parallax fix and the release GPU fixture correction are pushed to `feat/stronghold`.

The release GPU fixture now imports Pixi through Vite instead of a private optimizer-cache URL. Its 36 cases pass without WebGL errors. The full release run passed regression checks, production build, Go checks and co-op smoke, and reached release packaging. The command reached its 20-minute execution limit before publication completed. Live deployment and verification remain outstanding; no live fix is claimed.
