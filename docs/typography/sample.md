## Result

The HUD sample and a new Choose Your Hero sample now share one Pixi v8 typography module: MSDF BitmapText in two self-hosted OFL fonts, named text-role tokens, and an effect shader for gradients, outlines, glow and soft shadows. HUD frames are bronze bitmaps generated as @3x masters with @2x/@1x downscales and drawn as 9-slices. Every word on both screens is live MSDF text. The ARKADIA logo stays an image. Extras that are not in the reference, such as CRITICAL 248, are removed.

Live sample: [https://ark-whachat.fural.space/typography/](https://ark-whachat.fural.space/typography/) ([Choose Your Hero](https://ark-whachat.fural.space/typography/?screen=hero)). Toolbar: screen, hero, glow, and a reference-overlay slider.

## Live deployment

Checked 2026-10-22 17:11 UTC by [verify-live.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Ftypography%2Fverify-live.mjs): hud at 1672 × 941 DPR 1 (24 live texts, no errors); hero at 1672 × 941 DPR 1 (15 live texts, no errors); hero-mobile at 432 × 912 DPR 2 (13 live texts, no errors).

![Live hud capture](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA026184765f2c3d0a9a7b512c)

![Live hero capture](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAd4746cfd1a08f41e57a66c51)

![Live hero-mobile capture](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA5203d803e62929f3a442bd2e)

## Reference 1 — HUD

![Reference 1: HUD typography target](/api/organizations/ORd5dd6f99b4308d6187031557/task-attachments/TA114f71174983c55c7fe5186b)

## Reference 2 — Choose Your Hero

![Reference 2: Choose Your Hero, desktop](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA5d01916ce8cf2882df8b42ca)

Mobile comparisons use the Choosing Hero mobile references: ![Choosing Hero mobile reference, Ember Warden](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAba4a93191364d5c37912badb) ![Choosing Hero mobile reference, Rift Runner](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA20c6ffdd408994b0b23cdcfc)

## HUD: reference vs result

### HUD desktop

HUD · desktop 1672 × 941 · DPR 1 · 1672 × 941 device px, the reference scaled to the same size.

![HUD desktop: reference and result side by side](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAd1403559ce9771cd466e3370)

![HUD desktop: result with the reference overlaid at 50 %](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA53a1ebb0fc24e49792a8fb80)

### HUD phone landscape

HUD · phone landscape 836 × 470 CSS px · DPR 2 · 1672 × 940 device px, the reference scaled to the same size.

![HUD phone landscape: reference and result side by side](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA55de2affaeab587098387b6c)

![HUD phone landscape: result with the reference overlaid at 50 %](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA06216b6faa7cbd21c8e879f8)

## Choose Your Hero: reference vs result

### Desktop, Ember Warden (Reference 2)

Choose Your Hero · desktop · Ember Warden · 1672 × 941 device px, the reference scaled to the same size.

![Desktop, Ember Warden (Reference 2): reference and result side by side](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAa9e82f91b530c99a0104b09f)

![Desktop, Ember Warden (Reference 2): result with the reference overlaid at 50 %](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAff78c7c978fa8bf6223e0af8)

### Desktop, Rift Runner

Choose Your Hero · desktop · Rift Runner · 1672 × 941 device px, the reference scaled to the same size.

![Desktop, Rift Runner: reference and result side by side](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA36bda536bee23d604ca37e54)

![Desktop, Rift Runner: result with the reference overlaid at 50 %](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA054f79ce1d7cfb1f2a27383f)

### Mobile, Ember Warden

Choose Your Hero · mobile 432 × 912 CSS px · DPR 2 · Ember · 864 × 1824 device px, the reference scaled to the same size.

![Mobile, Ember Warden: reference and result side by side](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA3880caace09f1ac62ff68db8)

![Mobile, Ember Warden: result with the reference overlaid at 50 %](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA1c067cdfeffe7b9e4184e102)

### Mobile, Rift Runner

Choose Your Hero · mobile 432 × 912 CSS px · DPR 2 · Rift · 864 × 1824 device px, the reference scaled to the same size.

![Mobile, Rift Runner: reference and result side by side](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAdfce9aaf3ab9f1187c828b7d)

![Mobile, Rift Runner: result with the reference overlaid at 50 %](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAac8816ff8e2b524eff950994)

## Text roles

One module ([src/typography/tokens.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Ftypography%2Ftokens.ts)) defines the roles, and both screens use it. Sizes and widths are design pixels on the screen's reference canvas (1672 × 941 desktop, 864 × 1824 mobile). The scene scale converts them to CSS pixels. A screen may override a role's size, for example when the mobile title runs larger. Gradients run from the cap top to the baseline and are evaluated in the shader. Glow is optional and switched on per scene.

| Token | Used for | Font | Size | Letter spacing | Fill | Outline | Shadow | Glow (optional) |
|---|---|---|---:|---|---|---|---|---|
| `display-title` | CHOOSE YOUR HERO | Cinzel-SemiBold 600 | 49 | 0.6 | gradient #fff4cc → #f0c464 → #a86e26 | #2a1606 95% · 1.4px | #000000 80% · (0, 3) · soft 4px | #ffb347 45% · 5px |
| `display-name` | EMBER WARDEN, mobile Loadout | Cinzel-SemiBold 600 | 42.5 | 0.5 | gradient #fff4cc → #f0c464 → #a86e26 | #2a1606 95% · 1.4px | #000000 80% · (0, 3) · soft 4px | #ffb347 45% · 5px |
| `display-button` | BEGIN JOURNEY | Cinzel-SemiBold 600 | 33 | 0.6 | gradient #fff4cc → #f0c464 → #a86e26 | #2a1606 95% · 1.4px | #000000 80% · (0, 3) · soft 4px | #ffb347 45% · 5px |
| `label-wide` | LOADOUT | Cinzel-SemiBold 600 | 19 | 3.2 · caps | #e2bd72 | — | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `body-lg` | Subtitle, card names | EBGaramond-Medium 500 | 25 | 0 | #f3e6c6 | — | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `body` | Back, description, skill names, Empty | EBGaramond-Medium 500 | 22 | 0 | #f3e6c6 | — | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `accent` | Selected, Lv. 1 | EBGaramond-Medium 500 | 21 | 0 | #f6d04c | — | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `paragraph` | Skills cast automatically… (wrapped) | EBGaramond-Medium 500 | 19.5 | 0 | #e4d8c2 | — | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `hud-name` | Ember Warden | EBGaramond-Medium 500 | 27 | 0.2 | #f3e6c6 | #000000 50% · 0.6px | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `hud-value` | 96 / 100 HP | EBGaramond-Medium 500 | 21 | 0.2 | #f3e6c6 | — | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `hud-stat` | 250 Gold, 06:27, Wilds | EBGaramond-Medium 500 | 26 | 0.2 | #f3e6c6 | — | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `hud-level` | 9 | EBGaramond-Medium 500 | 28 | 0 | #f3e6c6 | — | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `hud-skill` | Flame Fan, Rift Trap, Seismic Slam | EBGaramond-Medium 500 | 22.5 | 0.1 | #f3e6c6 | #0a0604 70% · 1px | #000000 95% · (0, 1.5) · soft 3.2px | #000000 45% · 5px |
| `hud-badge` | Lv. 1 | EBGaramond-Medium 500 | 17.5 | 0.2 | #f3e6c6 | — | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `hud-state` | AUTO | EBGaramond-Medium 500 | 17 | 0.8 · caps | #f7e2ae | — | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `hud-xp` | 60 | EBGaramond-Medium 500 | 22.5 | 0.2 | #f3e6c6 | — | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `hud-xp-accent` | / 100 XP | EBGaramond-Medium 500 | 22.5 | 0.2 | #f6d04c | — | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `hud-key` | W A S D, Esc | EBGaramond-Medium 500 | 19 | 0 | #f3e6c6 | — | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `hud-hint` | · Move, · Menu | EBGaramond-Medium 500 | 21.5 | 0.2 | #f3e6c6 | — | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `tag-ally` | Overhead ally / party name tags | EBGaramond-Medium 500 | 15 | 0.3 | #f3e6c6 | #0a0604 85% · 0.9px | #000000 95% · (0, 1.5) · soft 3.2px | — |
| `tag-foe` | Overhead enemy & gate name tags | EBGaramond-Medium 500 | 13 | 0.3 | #f2e4c4 | #0a0604 85% · 0.8px | #000000 95% · (0, 1.5) · soft 3.2px | — |
| `combat-hit` | Floating player damage numbers | Cinzel-SemiBold 600 | 22 | 0.4 | #ffe69c | #2a1606 95% · 1.4px | #000000 80% · (0, 3) · soft 4px | — |
| `combat-crit` | Floating critical hit numbers | Cinzel-SemiBold 600 | 30 | 0.5 | gradient #fff4cc → #f0c464 → #a86e26 | #2a1606 95% · 1.4px | #000000 80% · (0, 3) · soft 4px | #ffb347 45% · 5px |
| `combat-crit-label` | CRITICAL badge over crit hits | Cinzel-SemiBold 600 | 11 | 1.6 · caps | #ffdf7a | #2a1606 95% · 1.4px | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `combat-incoming` | Floating incoming damage numbers | Cinzel-SemiBold 600 | 20 | 0.3 | #ff6452 | #1a0404 95% · 1.3px | #000000 80% · (0, 3) · soft 4px | — |
| `combat-heal` | Floating heal numbers | Cinzel-SemiBold 600 | 19 | 0.3 | #8effa8 | #061a0a 95% · 1.2px | #000000 80% · (0, 3) · soft 4px | — |
| `combat-banner` | Zone / victory / defeat banner title | Cinzel-SemiBold 600 | 28 | 2.4 · caps | gradient #fff4cc → #f0c464 → #a86e26 | #2a1606 95% · 1.4px | #000000 80% · (0, 3) · soft 4px | #ffb347 45% · 5px |
| `combat-banner-sub` | Zone / victory / defeat banner subtitle | EBGaramond-Medium 500 | 16 | 0.6 | #e4d8c2 | #0a0604 85% · 0.9px | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `panel-title` | Popover & modal headers (Clock, Co-op, Blessings, Loading) | Cinzel-SemiBold 600 | 16 | 1.4 · caps | gradient #fff4cc → #f0c464 → #a86e26 | #221104 90% · 1px | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `panel-label` | Popover section & status labels | Cinzel-SemiBold 600 | 12 | 1.6 · caps | #e2bd72 | — | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `panel-body` | Popover body & button labels | EBGaramond-Medium 500 | 16 | 0.1 | #f3e6c6 | — | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `panel-muted` | Secondary hints & loading status | EBGaramond-Medium 500 | 14 | 0.1 | #bfa982 | — | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `panel-error` | Co-op error & warning text | EBGaramond-Medium 500 | 14 | 0.1 | #f08c7a | — | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `blessing-title` | Blessing card title | Cinzel-SemiBold 600 | 18 | 0.5 | gradient #fff4cc → #f0c464 → #a86e26 | #221104 90% · 1px | #000000 72% · (0, 1.5) · soft 1.6px | — |
| `blessing-desc` | Blessing card wrapped description | EBGaramond-Medium 500 | 15 | 0 | #e4d8c2 | — | #000000 72% · (0, 1.5) · soft 1.6px | — |

Paragraph wrapping: the role sets wrap and centre, and the screen passes the wrap width from its panel. Desktop uses the panel width minus 40 px per side (405 px), which breaks the help text into the reference's two sentences. Mobile uses the panel width minus 70 px per side (676 px).

## Fonts

- Body: **EB Garamond Medium** (500). Display caps: **Cinzel SemiBold** (600). Cinzel's lower case is small caps, so "Ember Warden" and "Begin Journey" set with tall initials, as in the reference. Both are SIL Open Font License 1.1: [EB Garamond licence](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=assets-src%2Ftypography%2Ffonts%2FEBGaramond-OFL.txt), [Cinzel licence](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=assets-src%2Ftypography%2Ffonts%2FCinzel-OFL.txt). The licences also ship next to the atlases.
- MSDF atlases: msdf-bmfont-xml at 64 px with a 16 px distance range. Overlapping contours are removed first. Kerning pairs (752 for Garamond, 1711 for Cinzel) are measured with Chromium's shaper, because the tool cannot read EB Garamond's GPOS kerning. Files: [public/typography/v2/fonts/garamond-medium.fnt](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ftypography%2Fv2%2Ffonts%2Fgaramond-medium.fnt), [public/typography/v2/fonts/cinzel-semibold.fnt](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ftypography%2Fv2%2Ffonts%2Fcinzel-semibold.fnt).
- Two Pixi v8 issues are handled:
  - Pixi 8.22's text-format BMFont parser drops the `distanceField` line, so the font renders as a plain bitmap. The atlases are written as BMFont XML instead.
  - Pixi computes the MSDF edge width without the renderer resolution, so text gets softer as devicePixelRatio rises. [src/typography/msdf.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Ftypography%2Fmsdf.ts) corrects this and adds the effect shader.

## Frames

![HUD frames, icons and art at @3x with 9-slice borders](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAbfeab3c8bea0f621f05e4126)

Drawn in the Choosing Hero kit's bronze language: dark gold rails with a pale top highlight, near-black fills and four-point compass stars as finials. Every stretchable frame is a NineSliceSprite with the borders in [manifest.json](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ftypography%2Fv2%2Fhud%2Fmanifest.json): pills, key plate, keycaps, hero plate, HP and XP frames and fills, and the Lv/AUTO badges. Rings, medallion, icons and art keep a fixed size. The set is chosen from **devicePixelRatio × scene scale**, rounded up to @1x, @2x or @3x. At 1280 × 720 (scene scale 0.7651) the captures loaded @1x at DPR 1, @2x at DPR 2, @3x at DPR 3, @2x at DPR 2.625; the full 1672 × 941 layout at DPR 2.625 loads @3x. Choose Your Hero reuses the kit's frames, art and English labels read-only; the kit files are not modified.

## Crispness at DPR 1, 2, 3 and 2.625

Edge width is measured on each text crop: the average run of pixels between 10 % and 90 % of the crop's contrast, in device pixels. One pixel is an ideal anti-aliased edge. Viewport 1280 × 720. "Pixi stock" uses Pixi's own edge width (`?fix=0`).

| HUD | Ember Warden | AUTO | Flame Fan | 06:27 | Esc | Frames |
|---|---:|---:|---:|---:|---:|---|
| DPR 1 · this module | 1.25 | 1.35 | 1.63 | 1.2 | 1.54 | @1x |
| DPR 2 · this module | 1.15 | 1.21 | 1.21 | 1.14 | 1.17 | @2x |
| DPR 3 · this module | 1.15 | 1.16 | 1.18 | 1.11 | 1.15 | @3x |
| DPR 2.625 · this module | 1.16 | 1.16 | 1.16 | 1.1 | 1.18 | @2x |
| DPR 2 · Pixi stock | 2.06 | 1.91 | 2.02 | 1.88 | 2.26 | @2x |
| DPR 3 · Pixi stock | 2.88 | 2.87 | 2.71 | 2.75 | 3.02 | @3x |
| DPR 2.625 · Pixi stock | 2.6 | 2.47 | 2.47 | 2.44 | 2.66 | @2x |

| Choose Your Hero | CHOOSE YOUR HERO | Selected | LOADOUT | Skills cast automaticall… |
|---|---:|---:|---:|---:|
| DPR 1 · this module | 1.23 | 1.6 | 1.14 | 1.42 |
| DPR 2 · this module | 1.34 | 1.47 | 1.12 | 1.2 |
| DPR 3 · this module | 1.34 | 1.46 | 1.17 | 1.2 |
| DPR 2.625 · this module | 1.32 | 1.41 | 1.12 | 1.22 |
| DPR 2 · Pixi stock | 2.3 | 2.21 | 1.85 | 2.07 |
| DPR 3 · Pixi stock | 3.24 | 2.9 | 2.84 | 2.86 |
| DPR 2.625 · Pixi stock | 2.85 | 2.66 | 2.46 | 2.62 |

With the correction, text edges stay at 1.1–1.6 device px at every DPR. Pixi's stock edge widens with DPR, to 2.7–3.2 px at DPR 3. Begin Journey is shown in the sheets but not measured: it is a dark-bottomed gold gradient on a red button with gold rails, and with that little luminance contrast the scan measures the gradient rather than the edge. The panel title Ember Warden reads about 3–3.8 px at DPR 2 and above in both modes for the same reason: the panel's compass crest and gradient rails overlap its crop, as the sheets show. It is listed in the table but left out of the ranges. Display caps are measured on CHOOSE YOUR HERO.

![HUD at DPR 1, resolution-aware edge](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA6631c687c4724f6c6fc3dd93)

![HUD at DPR 2, resolution-aware edge](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA915836bcf4cd19df76304f99)

![HUD at DPR 3, resolution-aware edge](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA127ae9d0549fa72263aa9289)

![HUD at DPR 2.625, resolution-aware edge](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA599f58fa8251dc1b775a3f14)

![HUD at DPR 2, Pixi stock edge](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA4d127ff7fc90ba91e1df87ee)

![HUD at DPR 3, Pixi stock edge](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA59b258b228708f0e9f84fd55)

![HUD at DPR 2.625, Pixi stock edge](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA41330954418ef309824e56e7)

![Choose Your Hero at DPR 1, resolution-aware edge](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAbe13c968c47e126b1ac57717)

![Choose Your Hero at DPR 2, resolution-aware edge](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA1426117aa70796f5b9009d3d)

![Choose Your Hero at DPR 3, resolution-aware edge](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA091056acf857c49d1f550503)

![Choose Your Hero at DPR 2.625, resolution-aware edge](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA461e04206ab91da2f2924e76)

![Choose Your Hero at DPR 2, Pixi stock edge](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA0a223c104f2bcf24272ce53d)

![Choose Your Hero at DPR 3, Pixi stock edge](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA3480fafd0b70d0bcc3972939)

![Choose Your Hero at DPR 2.625, Pixi stock edge](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAb62eaa1b19587214054f4236)

## Optional glow

![Glow off and on for display caps and HUD skill names](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAf0685e81fd058cb029903d07)

## Known differences from the references

- Character art, card frames, panels and buttons on Choose Your Hero are the kit's own art, so the hero figure, card portraits and ornaments differ from the reference paintings. The kit frame's heavier bottom rail moves the desktop card labels about 15 px higher.
- The HUD skill art for Rift Trap and Seismic Slam is painted procedurally. Flame Fan and the portrait reuse kit masters. The HUD backdrop is the reference with its painted HUD patched out, so the rebuilt HUD sits on the same scene.
- XP: the bar shows the real 60 %, and the value sits just past the fill's end. The reference paints the fill at about 43 % with the label at its end.
- The phone-landscape HUD keeps the reference arrangement at one scale. In portrait the skill row moves above the key hints.

## Run and rebuild

`npx vite -c vite.typography.config.ts` serves the sample at http://127.0.0.1:3047/typography/. The build output is `dist/typography-sample`. [Pipeline README](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Ftypography%2FREADME.md) lists every rebuild step: fonts, frames, logo, backdrop, evidence and this page.

- Code: [tokens](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Ftypography%2Ftokens.ts) · [MSDF shader](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Ftypography%2Fmsdf.ts) · [text](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Ftypography%2Ftext.ts) · [frames](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Ftypography%2Fframes.ts) · [HUD](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Ftypography%2Fhud.ts) · [Choose Your Hero](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Ftypography%2Fhero-select.ts)
- Evidence data: [docs/typography/v2/evidence.json](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Ftypography%2Fv2%2Fevidence.json)

## Full Game UI Migration to Pixi v8 + MSDF Typography

Every screen, HUD element, popover, modal, and world label in the playable game now renders in Pixi v8 using the shared MSDF typography module ([src/typography/tokens.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Ftypography%2Ftokens.ts), `MsdfText`, `installMsdfFx` with DPR-aware edge correction, and `FrameSet` `@1x/@2x/@3x` 9-slice bronze frames). All legacy HTML/CSS overlays and stylesheets (`src/style.css`, `src/stronghold/style.css`, `src/stronghold/progression.css`, `src/expedition/style.css`, `src/expedition/snow.css`, `src/characters/ui.ts`) have been removed.

### Unavoidable DOM Exception

During play, `div#app` holds only:
1. `canvas#world-canvas` — the single WebGL2 Pixi canvas rendering the 3D/2.5D world and all UI layers.
2. `input#coop-keyboard-proxy` — a 1×1 px off-screen transparent `<input type="text" aria-hidden="true">` managed by [src/stronghold/net/lobby.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fnet%2Flobby.ts). Mobile browsers (iOS Safari / Android Chrome) only summon the native soft keyboard when a real DOM `<input>` receives focus inside a user pointer gesture; this hidden input proxies keystrokes into the Pixi Co-op Lobby room-code and player-name fields. Zero stylesheets (`document.styleSheets.length === 0`) are loaded.

### Before vs. After (HTML/CSS DOM → Pixi v8 + MSDF)

#### 1. Loading Screen (`src/app/loader.ts`)

Replaced `#loading-screen` in `index.html` with a Pixi v8 stage displaying the `ARKADIA` logo (`@1x/@2x/@3x`), `MsdfText` status and progress readouts (`panel-title`, `panel-muted`), and a 9-slice bronze progress bar (`xp-frame` + `xp-fill`).

![Loading screen before (HTML/CSS) and after (Pixi v8 + MSDF) on desktop (1440×900 DPR 1)](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA1cc539f54cbeb5d29da01c6e)

![Loading screen before (HTML/CSS) and after (Pixi v8 + MSDF) on mobile (390×844 DPR 2)](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA08440942466d70876b1717c9)

#### 2. Choose Your Hero (`src/stronghold/hero-picker.ts` & `src/typography/hero-select.ts`)

Replaced the DOM hero cards and CSS layout with the interactive Pixi `HeroSelect` scene (`MsdfText`, `FrameSet`, interactive card selection, keyboard shortcuts `1`/`2`/`ArrowLeft`/`ArrowRight`/`Enter`/`Space`, and responsive desktop + mobile portrait layout).

![Choose Your Hero before (HTML/CSS) and after (Pixi v8 + MSDF) on desktop (1440×900 DPR 1)](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAfded26f83c7a57149d675145)

![Choose Your Hero before (HTML/CSS) and after (Pixi v8 + MSDF) on mobile (390×844 DPR 2)](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAef4168997963cbbe440c6ff5)

#### 3. In-Game HUD, Overhead Tags, Combat VFX & Virtual Thumbstick (`src/typography/hud.ts`, `src/stronghold/encounters.ts`, `src/stronghold/combat-vfx.ts`)

Replaced the DOM HUD, party list, and skill strip with the interactive Pixi `HudScene` (`@1x/@2x/@3x` 9-slice bronze frames, live HP/XP bars, clickable skill slots with cooldown sweeps and star pips, interactive Clock/Zone/Co-op/Reset/Hero pills, and a Pixi virtual thumbstick for touch movement). Overhead ally/enemy/gate labels and floating combat numbers now use pooled `MsdfText` roles (`tag-ally`, `tag-foe`, `combat-hit`, `combat-crit`, `combat-crit-label`, `combat-incoming`, `combat-heal`, `combat-banner`).

![In-game HUD before (HTML/CSS) and after (Pixi v8 + MSDF) on desktop (1440×900 DPR 1)](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAf2ed274b3740eb61db4c7546)

![In-game HUD before (HTML/CSS) and after (Pixi v8 + MSDF) on mobile (390×844 DPR 2)](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA257b15ba8c1962410149f4e7)

#### 4. World Clock & Lighting Popover (`src/stronghold/clock.ts`)

Replaced the DOM time-of-day popover with a Pixi 9-slice bronze panel featuring a draggable time scrubber, live/hold toggle, preset buttons (`Dawn`, `Noon`, `Dusk`, `Midnight`), and `Esc` / outside-tap dismissal.

![Clock popover before (HTML/CSS) and after (Pixi v8 + MSDF) on desktop (1440×900 DPR 1)](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA8ad19b11b854754679afa91b)

![Clock popover before (HTML/CSS) and after (Pixi v8 + MSDF) on mobile (390×844 DPR 2)](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA50dd9bb3ae79f3209077315e)

#### 5. Level-Up Blessing Modal (`src/stronghold/encounters.ts`)

Replaced the DOM blessing modal with a Pixi 9-slice bronze modal and three interactive blessing cards (`blessing-title`, `blessing-desc`, `panel-label`, `panel-title`), supporting both pointer clicks and keyboard keys `1`/`2`/`3`.

![Level-up blessing modal before (HTML/CSS) and after (Pixi v8 + MSDF) on desktop (1440×900 DPR 1)](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAe49fdf02f65f180fd7579baf)

![Level-up blessing modal before (HTML/CSS) and after (Pixi v8 + MSDF) on mobile (390×844 DPR 2)](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA2db9d36d203c6ec254749971)

#### 6. Co-op Lobby Popover (`src/stronghold/net/lobby.ts`)

Replaced the DOM co-op drawer with a Pixi 9-slice bronze popover supporting room creation, room code entry, player name editing, invite link copying, and party member status readouts.

![Co-op lobby popover in Pixi v8 + MSDF on desktop (1440×900 DPR 1)](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAac03033f50be03c36984aa8b)

![Co-op lobby popover in Pixi v8 + MSDF on mobile (390×844 DPR 2)](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA6123dc7353f7c45dbb42415a)

### Verification & Smoke Tests

- **UI & DOM Audit** ([scripts/verify-pixi-ui.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fverify-pixi-ui.mjs) → [docs/pixi-ui/verification.json](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fpixi-ui%2Fverification.json)): Verified on desktop (`1440×900` DPR 1) and mobile (`390×844` DPR 2) with `0` console errors, `0` page errors, `0` stylesheets, only `canvas#world-canvas` + `input#coop-keyboard-proxy` in the DOM, and full pointer/keyboard interaction across Hero Picker, HUD, Clock Popover, Blessing Modal, and Co-op Lobby.
- **Co-op Smoke Test** ([scripts/coop-smoke.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fcoop-smoke.mjs) → [docs/coop/smoke.json](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fcoop%2Fsmoke.json)): Passed (`ok: true`, 806 common ticks, 14 enemies, level-up blessing offers verified across synced clients).
