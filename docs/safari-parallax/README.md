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

GitHub operations use the explicitly authorized `thickkoezz` credentials. The parallax fix and release GPU fixture correction are pushed to `feat/stronghold` and the fix is deployed at https://ark-whachat.fural.space/ through the current shared game release.

Live verification passes in Chromium with ignored filters and WebKit: 12 court/snow viewport cases, 24 actual visible Pixi textures, no page errors. Measured detail energy is 12.7–23.4% of each matching sharp source, including landscape strips. `live-verification.json` records the live base URL, runtime snapshots, texture dimensions, transparency and pixel metrics. Run with `PARALLAX_BASE_URL=https://ark-whachat.fural.space/` to target production instead of local preview.

The release GPU fixture imports Pixi through Vite instead of a private optimizer-cache URL; all 36 controls pass without WebGL errors. The earlier standalone release command reached its 20-minute limit after building a valid archive. A later shared deployment already included the pushed fix, so no older archive was applied over newer peer changes. Live browser/pixel evidence establishes delivery independently of that earlier timeout. Physical Apple-device testing is not claimed.
