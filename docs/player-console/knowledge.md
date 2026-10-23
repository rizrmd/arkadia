## Deployed portrait console

The player portrait and meters have been replaced following the supplied reference and visual feedback. The game uses painted circular portraits with double gold bezels, a lower-left level badge, bold ivory serif text, and separate slanted crimson HP, cyan GATE and gold XP meters. Labels and numeric values remain live and in English.

[Open the reference and implementation preview](https://ark-whachat.fural.space/player-console/)

<iframe src="https://ark-whachat.fural.space/player-console/" title="Player portrait and status bars reference comparison" height="760"></iframe>

### Supplied reference

![Requested portrait and player bars](https://ark-whachat.fural.space/player-console/reference.png)

### Verified deployed result

![Deployed desktop game with the revised portrait, textured bars and bold serif text](https://ark-whachat.fural.space/player-console/live-desktop.png)

![Deployed console detail with HP 100 / 100, GATE 100 / 100 and XP 10 / 20](https://ark-whachat.fural.space/player-console/live-console-detail.png)

### Generated production assets

The following assets were generated using the built-in image generator from the supplied reference and existing character identity art, then packaged into the game at 1×, 2× and 3×. The raster artwork follows the reference; it is not a pixel extraction. Meter masks reveal a fixed-size painted material without stretching it as values change.

![Crimson, cyan and gold irregular crystal materials](https://ark-whachat.fural.space/player-console/materials.png)

![Rift Runner circular portrait with gold bezel](https://ark-whachat.fural.space/player-console/rift-portrait.png)

![Ember Warden circular portrait with gold bezel](https://ark-whachat.fural.space/player-console/ember-portrait.png)

A separate EB Garamond Bold MSDF atlas supplies the heavier console typography. Other HUD text roles retain their existing fonts. The transparent portrait includes its bezel as one asset, removing the opaque overlapping layer that caused the empty portrait in the earlier implementation.

### Mobile verification

![Deployed mobile portrait layout with Ember Warden](https://ark-whachat.fural.space/player-console/live-mobile.png)

### Earlier reported result

![Human-reported earlier result with an empty portrait and simple geometric bars](https://ark-whachat.fural.space/player-console/reported-result.png)

The simpler vector meter pattern and lighter type shown above have been replaced.

### Validation and release

Implementation commit: `c059f04`, pushed to `feat/stronghold`. Released using the repository's standard `scripts/fural-deploy.sh` path. The production TypeScript/Vite build, Go server tests and release smoke checks passed.

Local and live browser runs cover both heroes, level changes, empty/partial/full/over-maximum values, desktop 1440×900, portrait 390×844, landscape 844×390 and resizing back to desktop. Both portraits are visible, all values and clamped ratios are correct, no legacy XP bar is shown, and the console stays within the viewport. The final run reported no browser JavaScript errors. An initial post-deploy font request returned a transient 404; subsequent direct URL checks and the complete browser run passed.

All 17 live console assets match the packaged build: font definitions match exactly, and raster pixels match after the server's lossless WebP conversion.

[Live browser report](https://ark-whachat.fural.space/player-console/live-verification.json) · [Live asset audit](https://ark-whachat.fural.space/player-console/live-asset-audit.json) · [Implementation notes](https://ark-whachat.fural.space/player-console/implementation.md)

Generation prompts and original raster masters are versioned under `assets-src/player-console`. Reproduce packaging with `node scripts/build-player-console.mjs`, the console font with `FONT_ONLY=garamond-bold node scripts/typography/build-fonts.mjs`, and live verification with `VERIFY_URL=https://ark-whachat.fural.space node scripts/verify-player-console.mjs`.
