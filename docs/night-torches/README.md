## Nighttime Stronghold torches

Twelve wall-mounted torches illuminate the outer enclosure, with four wooden torch posts around the central tent and courtyard. Their light pools also illuminate moving characters through the shared lightmap. Flames, halos and light pools turn on at 20:00 and off at 04:00, following the same Night phase as the game clock. Unlit brackets and posts remain visible during daylight.

The torches are drawn with Canvas paths, requiring no additional downloaded artwork. Pools are cached at lightmap resolution; camera movement reuses the existing compositor transforms.

Verification: `npm run build` and `node scripts/verify-night-torches.mjs`. The browser check covers 00:00, 03:45, 04:00, noon, 19:45, 20:00 and a second dawn, checking both slider preview and settled lighting with no browser errors.
