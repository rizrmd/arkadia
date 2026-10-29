## Compact resource row

The Pixi HUD now presents Gold, Wood, Food, and game time in that order. “70% smaller” is implemented as 30% of the former resource and timer height. The surrounding zone, connection, FPS, minimap, hero console, gathering actions, and hunger UI retain their existing layout.

Wood and Food receive carried balances directly from the gathering controller, including harvest, loot, eating, and resource transaction updates. Clock interaction remains on the timer container with its transformed hit area. Both new icons use Pixi Graphics matching the existing log and meat artwork.

## Verification

TypeScript and Vite production build passed. Browser checks passed against the built client and again at https://arkodia.online: 1440×900, 390×844, and 844×390; balances of zero, ordinary values, and 9,999,999; correct label order, formatting, viewport bounds, and gathering balance synchronization. No JavaScript page errors occurred. The test explicitly lays out the Pixi HUD after viewport resizing because the introductory tutorial can pause the normal resize render; this checks component layout rather than automatic resize timing during the tutorial.

The frontend release `8e29626` used the existing versioned archive publisher and deployment lock. It preserved the running Go executable, saved games, authored map data, and existing public artwork. Public release metadata: https://arkodia.online/compact-resource-hud/release.json.
