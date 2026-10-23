## Reference portrait console

The console uses generated painted portraits with a thin double gold bezel, a lower-left level badge, bold ivory serif text, and independent slanted red HP, cyan GATE and gold XP meters. All game UI labels remain English.

Rift Runner follows the supplied portrait composition. Ember Warden uses matching framing with her existing character identity. Three raster material swatches provide organic irregular crystal/stone detail. The loader packages the named assets at 1×, 2× and 3× without replacing other screens’ portrait artwork. The transparent portrait includes its own bezel, avoiding the opaque overlapping layer that caused the reported empty portrait.

Text uses an additional EB Garamond Bold MSDF atlas, derived from the OFL font source; other HUD text roles retain their existing fonts. Meter textures remain fixed size while masks reveal the current ratio. Empty and over-maximum values clamp to the track, and numeric values remain live. Gate is a full labeled meter; XP retains its tick marks and a vertical progression boundary.

### Mobile portrait optimization (shorter width, increased height)

On mobile portrait viewports (`width < height`), `PlayerConsole.setPortrait(true)` shortens the horizontal meter span (`rightTop = 392` vs `558` on desktop) and increases the vertical bar heights (`h = 35` for HP and GATE vs `24` on desktop; `h = 27` for XP vs `17` on desktop) alongside a `154×154` portrait and scaled-up value/label typography. Combined with raising the top-left HUD mobile portrait scale factor in `Hud.layout()` from `0.82` to `1.08`, the mobile player bar on a `390×844` viewport is both narrower horizontally (`192.7 px` vs `208.7 px`, maintaining clear breathing room before the top-right `0 Gold` medallion) and significantly taller vertically (`82.0 px` total console height vs `55.4 px`, with HP/GATE bars `+92%` taller and XP bar `+109%` taller).

Run `node scripts/build-player-console.mjs` to package raster masters, `FONT_ONLY=garamond-bold node scripts/typography/build-fonts.mjs` to build the console font, `npm run build` for the production build, and `node scripts/verify-player-console.mjs` for browser verification. Set `VERIFY_URL` to the deployed host to verify the production release.

Browser coverage: both heroes, level changes, HP/GATE/XP empty, partial, full and over maximum, desktop, mobile portrait, landscape, and resizing back to desktop. Screenshots and JSON reports accompany this page.
