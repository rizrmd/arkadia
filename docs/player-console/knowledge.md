## Deployed portrait console

The player portrait and meters use painted circular portraits with double gold bezels, a lower-left level badge, bold ivory serif text, and separate slanted crimson HP, cyan GATE and gold XP meters. Labels and numeric values remain live and in English.

[Open the reference and implementation preview](https://ark-whachat.fural.space/player-console/)

<iframe src="https://ark-whachat.fural.space/player-console/" title="Player portrait and status bars reference comparison" height="760"></iframe>

### Supplied reference

![Requested portrait and player bars](https://ark-whachat.fural.space/player-console/reference.png)

### Verified deployed result

![Deployed desktop game with the revised portrait, textured bars and bold serif text](https://ark-whachat.fural.space/player-console/live-desktop.png)

![Deployed console detail with HP 100 / 100, GATE 100 / 100 and XP 10 / 20](https://ark-whachat.fural.space/player-console/live-console-detail.png)

## Mobile Portrait Player Bar — Shortened Width & Increased Height

On mobile portrait viewports (`width < height`, e.g. `390×844`), the full desktop horizontal bar length (`rightTop = 558`) previously required scaling `groups.tl` down to `0.82×` so the right tip of the meters would not collide with the top-right `0 Gold` medallion. That downscaling compressed the entire player console vertically to `55.4 px` (`9.05 px` HP/GATE bar height and `6.41 px` XP bar height).

To resolve this on mobile portrait viewports without moving Gold/Time onto a second row:

- **Shortened Horizontal Meter Span (`PlayerConsole.setPortrait(true)`):** Reduced the outer bar right edge on mobile portrait from `558` to `392` design units (`trackRightTop = 389`, `trackRightBot = 376`, `valueX = 370`). On a `390×844` screen, the rendered console width shrinks from `208.7 px` to `192.7 px` (`x = 3.0..195.7 px`), leaving `~20.3 px` of horizontal breathing room before the `0 Gold` medallion (`x = 216.0 px`).
- **Increased Bar & Console Height:** Increased mobile portrait bar heights in `PlayerConsole` from `h = [24, 24, 17]` to `h = [35, 35, 27]` (`y = [56, 97, 138]`), enlarged the portrait frame to `154×154`, scaled meter value/label text (`1.18×` / `1.06×`), and raised the mobile portrait `groups.tl` scale factor in `Hud.layout()` from `0.82` to `1.08`.
- **Verified Screen Metrics (`390×844`):**
  - Total console height: **`82.0 px`** (up from `55.4 px`, **+47.9% taller**).
  - HP & GATE bar height: **`17.38 px`** on screen (up from `9.05 px`, **+92.0% taller**).
  - XP bar height: **`13.41 px`** on screen (up from `6.41 px`, **+109.2% taller**).
  - Total console width: **`192.7 px`** on screen (down from `208.7 px`, **16.0 px shorter horizontally**).

```d2
direction: right

mobile_viewport: Mobile Portrait Viewport (390x844) {
  tl_console: Top-Left Player Console (1.08x Scale) {
    portrait: Portrait & Lv Badge (154x154 design units)
    bars: Shortened & Taller Meters (rightTop 392) {
      hp: HP Bar (h=35 -> 17.4px screen height)
      gate: GATE Bar (h=35 -> 17.4px screen height)
      xp: XP Bar (h=27 -> 13.4px screen height)
    }
    portrait -> bars: 192.7px total width (82.0px height)
  }
  tr_hud: Top-Right Gold & Timer Plaques (1.06x Scale)
  tl_console -> tr_hud: 20.3px clear horizontal gap
}
```

### Annotated Mobile Issue (Before Fix)

![Human-annotated mobile screenshot highlighting the wide, vertically small player bar](https://ark-whachat.fural.space/player-console/mobile-annotated-issue.png)

### Verified Mobile Portrait Result (After Fix)

![Deployed mobile portrait layout with shortened width and taller player bar height](https://ark-whachat.fural.space/player-console/live-mobile.png)

### Generated production assets

The following assets were generated using the built-in image generator from the supplied reference and existing character identity art, then packaged into the game at 1×, 2× and 3×. The raster artwork follows the reference; it is not a pixel extraction. Meter masks reveal a fixed-size painted material without stretching it as values change.

![Crimson, cyan and gold irregular crystal materials](https://ark-whachat.fural.space/player-console/materials.png)

![Rift Runner circular portrait with gold bezel](https://ark-whachat.fural.space/player-console/rift-portrait.png)

![Ember Warden circular portrait with gold bezel](https://ark-whachat.fural.space/player-console/ember-portrait.png)

A separate EB Garamond Bold MSDF atlas supplies the heavier console typography. Other HUD text roles retain their existing fonts. The transparent portrait includes its bezel as one asset, removing the opaque overlapping layer that caused the empty portrait in the earlier implementation.

### Earlier reported result

![Human-reported earlier result with an empty portrait and simple geometric bars](https://ark-whachat.fural.space/player-console/reported-result.png)

The simpler vector meter pattern and lighter type shown above have been replaced.

### Validation and release

Latest mobile player bar commit: `e6c0d93` (building on `c059f04`), pushed to `feat/stronghold` and deployed via `scripts/fural-deploy.sh`. The production TypeScript/Vite build, Go server tests and release smoke checks passed.

Local and live browser runs cover both heroes, level changes, empty/partial/full/over-maximum values, desktop 1440×900 (`476.7×126.6 px`), mobile portrait 390×844 (`192.7×82.0 px`), landscape 844×390 (`229.4×60.9 px`) and resizing back to desktop (`476.7×126.6 px`) with zero console or page errors.

[Live browser report](https://ark-whachat.fural.space/player-console/live-verification.json) · [Live asset audit](https://ark-whachat.fural.space/player-console/live-asset-audit.json) · [Implementation notes](https://ark-whachat.fural.space/player-console/implementation.md)

## Earlier Mobile Readability Explorations (Superseded Concept Mockups)

### Multi-Row Mobile Concept

![Mobile HUD readability feedback](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA10163934a54a3608d8770e8c)

![Proposed mobile portrait and player status bar redesign](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAa2fa1858530aedba445bfa72)

### Compact Horizontal Mobile Concept

![Compact horizontal mobile HUD concept with larger portrait and readable player bars](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA448e920c47d46396646ff1c2)

### Corrected Portrait Mobile Concept

![Corrected tall mobile portrait mockup with compact player HUD](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA74ea20e524a67f546ac8a187)
