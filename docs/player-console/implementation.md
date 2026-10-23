## Reference portrait console

The console now uses generated painted portraits with a thin double gold bezel, a lower-left level badge, bold ivory serif text, and independent slanted red HP, cyan GATE and gold XP meters. All game UI labels remain English. The prior simple geometric meter pattern and light text have been replaced.

Rift Runner follows the supplied portrait composition. Ember Warden uses matching framing with her existing character identity. Three raster material swatches provide organic irregular crystal/stone detail. The loader packages the new named assets at 1×, 2× and 3× without replacing other screens’ portrait artwork. The transparent portrait includes its own bezel, avoiding the opaque overlapping layer that caused the reported empty portrait.

Text uses an additional EB Garamond Bold MSDF atlas, derived from the OFL font source; other HUD text roles retain their existing fonts. Meter textures remain fixed size while masks reveal the current ratio. Empty and over-maximum values clamp to the track, and numeric values remain live. Gate is a full labeled meter; XP retains its tick marks and a vertical progression boundary.

Run `node scripts/build-player-console.mjs` to package raster masters, `FONT_ONLY=garamond-bold node scripts/typography/build-fonts.mjs` to build the console font, `npm run build` for the production build, and `node scripts/verify-player-console.mjs` for browser verification. Set `VERIFY_URL` to the deployed host to verify the production release.

Browser coverage: both heroes, level changes, HP/GATE/XP empty, partial, full and over maximum, desktop, mobile portrait, landscape, and resizing back to desktop. Screenshots and JSON reports accompany this page. The generated artwork follows the supplied reference; it is not a pixel extraction of the source image.
