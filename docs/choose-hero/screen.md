## Result

Choose Your Hero is now the game's own Pixi v8 screen ([src/stronghold/choose-hero.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fchoose-hero.ts)), opened by [src/stronghold/hero-picker.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fhero-picker.ts) exactly as before: a new tab asks once, the HUD hero name reopens it, Begin Journey swaps the hero in place and Back keeps the current one. Nothing on it is HTML. Every word is live MSDF text in named roles from [tokens.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Ftypography%2Ftokens.ts), the ARKADIA logo is an image, and every frame and button is a kit master cut into split 9-slices at @1x/@2x/@3x. Selection and the action button are highlighted with NixieFX particles.

Live: [https://ark-whachat.fural.space/](https://ark-whachat.fural.space/) (open a new tab, or add `?hero=reset` to choose again). Checked 2026-10-22 23:00 UTC: desktop 1440 × 900 DPR 2 (desktop, 0 console errors); phone 390 × 844 DPR 3 (portrait, 0 console errors).

![Live desktop](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA4aa34013aae9c5d26f882f45)

![Live phone](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA6381e1b35c6f0338748086d5)

## Reference vs result

The references are the four Choosing Hero originals. Desktop is compared at 1672 × 941 DPR 1, mobile at 432 × 912 CSS px DPR 2 (864 × 1824 device px), each with a side-by-side and a 50 % overlay.

### Desktop, Ember Warden

Desktop 1672 × 941 · DPR 1 · Ember Warden · 1672 × 941 device px · desktop layout, frames @1x. The reference is scaled to the same size.

![Desktop, Ember Warden: reference and result side by side](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA8038ab032167312ed901a9d1)

![Desktop, Ember Warden: result with the reference overlaid at 50 %](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA750b6b5e27ad3cfbe6adfb36)

### Desktop, Rift Runner

Desktop 1672 × 941 · DPR 1 · Rift Runner · 1672 × 941 device px · desktop layout, frames @1x. The reference is scaled to the same size.

![Desktop, Rift Runner: reference and result side by side](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA2c26bfdc9f00884c0b0efa01)

![Desktop, Rift Runner: result with the reference overlaid at 50 %](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA837494e2dc11c7ccbd67a1d2)

### Mobile, Ember Warden

Mobile 432 × 912 CSS px · DPR 2 · Ember Warden · 864 × 1824 device px · portrait layout, frames @1x. The reference is scaled to the same size.

![Mobile, Ember Warden: reference and result side by side](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA09a860a43fdc8e522608e799)

![Mobile, Ember Warden: result with the reference overlaid at 50 %](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA7d3582b07a368095691e0239)

### Mobile, Rift Runner

Mobile 432 × 912 CSS px · DPR 2 · Rift Runner · 864 × 1824 device px · portrait layout, frames @1x. The reference is scaled to the same size.

![Mobile, Rift Runner: reference and result side by side](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAad03f1ed39cc672bfe3e9cbb)

![Mobile, Rift Runner: result with the reference overlaid at 50 %](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAe697e67eba1e26de3e4d24f4)

## Layouts and live resize

Three compositions, chosen from the viewport and rebuilt on resize without reloading: **desktop** (1672 × 941 design canvas), **portrait** (864 × 1824, below a 0.85 width/height ratio: phones and upright tablets) and **landscape** (1240 × 600, landscape phones under 560 CSS px tall). The stage scales uniformly and centres; the castle background covers the viewport. Landscape keeps text near 14 CSS px on an 844 × 390 phone, where the desktop composition would shrink body text to 9 px. Hit targets stay at least 44 CSS px (portrait Back: 110 design px × 0.45).

![Desktop 1440 × 900 · DPR 2 · Ember Warden](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA1bbac05049413c43f328eed7)

Desktop 1440 × 900 · DPR 2 · Ember Warden · desktop layout · stage scale 0.8612 · frames @2x

![Desktop 1280 × 720 · DPR 1 · Rift Runner](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA9e0fe5a51a3da48a7674f169)

Desktop 1280 × 720 · DPR 1 · Rift Runner · desktop layout · stage scale 0.7651 · frames @1x

![Phone portrait 390 × 844 · DPR 3 · Ember Warden](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA686a6a4545075e0b299b856c)

Phone portrait 390 × 844 · DPR 3 · Ember Warden · portrait layout · stage scale 0.4514 · frames @2x

![Phone portrait 412 × 915 · DPR 2.625 · Rift Runner](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA7e8990a7900a4858f723d48a)

Phone portrait 412 × 915 · DPR 2.625 · Rift Runner · portrait layout · stage scale 0.4769 · frames @2x

![Phone landscape 844 × 390 · DPR 3 · Ember Warden](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA1d821e4152629f3dc9182695)

Phone landscape 844 × 390 · DPR 3 · Ember Warden · landscape layout · stage scale 0.65 · frames @2x

![Phone landscape 915 × 412 · DPR 2.625 · Rift Runner](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAd048a6f1810b8e5903fec53a)

Phone landscape 915 × 412 · DPR 2.625 · Rift Runner · landscape layout · stage scale 0.6867 · frames @2x

![Tablet portrait 820 × 1180 · DPR 2 · Rift Runner](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAc7ff055bf4551ecdc86f4100)

Tablet portrait 820 × 1180 · DPR 2 · Rift Runner · portrait layout · stage scale 0.6469 · frames @2x

One page resized from phone portrait to landscape to desktop:

![Live resize: 390 × 844 portrait, 844 × 390 landscape, 1280 × 720 desktop](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAca415d06e5b33c6be0a9e1be)

## Frames: split 9-slices at @1x/@2x/@3x

[build-ui.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fchoose-hero%2Fbuild-ui.mjs) reads the kit's generated masters ([assets-src/choosing-hero/v1](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=assets-src%2Fchoosing-hero%2Fv1)) and art ([public/choosing-hero/v1](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Fchoosing-hero%2Fv1)) without changing them, and writes the game's runtime set to [public/assets/choose-hero](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Fassets%2Fchoose-hero%2Fmanifest.json). Each texture is an @3x master cut from the trimmed generated master and downscaled to @2x and @1x, where @1x is the size the screen draws it. The screen picks the set from devicePixelRatio × stage scale (rounded up) and reloads it when that changes, and it loads only the panel its layout uses.

The kit frames carry ornaments in the middle of their edges (the panel crest, card finials, side stars, button centre finials), which a plain 9-slice would stretch. Each frame is therefore split into quadrants (cards, panels) or halves (button, divider). Every part is its own 9-slice whose outer corner and inner half-ornament stay fixed, so only the plain rails between them stretch, and [FrameSet.frame()](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Ftypography%2Fframes.ts) reassembles the parts. Ornaments scale uniformly, never past their @1x size along the tighter axis.

![Split seams (blue) and fixed 9-slice borders (pink) of every frame](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA132ed84552b184e5889629a4)

The generated masters are 1.8–2.3× the runtime size for the panels, button and divider. Their @3x textures, used only above 2 device px per design pixel (for example the full desktop composition at DPR 2.625), are therefore Lanczos upscales: as sharp as the generated art allows. Card frames, badges, icons and Back have native @3x detail. The castle backgrounds and hero figures keep the kit's single resolution.

## Text roles

All screen text uses `CHOOSE_HERO_TEXT` in [tokens.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Ftypography%2Ftokens.ts): one role per slot and layout, derived from the shared roles (Cinzel SemiBold display caps with the gold gradient, outline and soft shadow; EB Garamond Medium body; wide-tracked gold LOADOUT; gold accents; a wrapped, centred paragraph). Sizes are design pixels of each layout's canvas.

| Slot | Used for | Font | Desktop | Portrait | Landscape | Tracking | Fill |
|---|---|---|---:|---:|---:|---|---|
| `title` | CHOOSE YOUR HERO | Cinzel-SemiBold | 49 | 46.5 | 40 | 0.6 | gold gradient #fff4cc → #f0c464 → #a86e26 |
| `subtitle` | Choose a hero to begin your journey. (desktop only) | EBGaramond-Medium | 27 | 27 | 23 | 0 | #f3e6c6 |
| `back` | Back (desktop label) | EBGaramond-Medium | 22 | 25 | 22 | 0 | #f3e6c6 |
| `card-name` | Card names | EBGaramond-Medium | 27 | 29 | 24 | 0 | #f3e6c6 |
| `card-state` | Selected | EBGaramond-Medium | 23 | 25 | 21 | 0 | #f6d04c |
| `hero-name` | Panel hero name | Cinzel-SemiBold | 41.5 | 46 | 34 | 0.5 | gold gradient #fff4cc → #f0c464 → #a86e26 |
| `loadout-title` | Loadout as the portrait Ember panel title | Cinzel-SemiBold | 41.5 | 46 | 34 | 0.5 | gold gradient #fff4cc → #f0c464 → #a86e26 |
| `hero-desc` | Hero description | EBGaramond-Medium | 23 | 29 | 22 | 0 | #f3e6c6 |
| `loadout` | LOADOUT label | Cinzel-SemiBold | 19 | 24 | 18 | 3.2 · caps | #e2bd72 |
| `skill` | Skill names, Empty | EBGaramond-Medium | 22.5 | 25 | 21 | 0 | #f3e6c6 |
| `level` | Lv. 1 | EBGaramond-Medium | 21 | 23 | 20 | 0 | #f6d04c |
| `help` | Wrapped help paragraph | EBGaramond-Medium | 19.5 | 26 | 20 | 0 | #e4d8c2 |
| `action` | Begin Journey | Cinzel-SemiBold | 33 | 50 | 32 | 0.6 | gold gradient #fff4cc → #f0c464 → #a86e26 |

## Highlights (NixieFX)

The highlights are NixieFX effects authored in [vfx/recipes/ui.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=vfx%2Frecipes%2Fui.mjs) and compiled into the game's one effect bundle (`npm run vfx` → /vfx/skills.bin). [choose-hero-fx.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fchoose-hero-fx.ts) gives each card and the Begin Journey button its own renderer inside the screen, between frame and text. A 2D projection stretches each effect's authored frame (card 3 × 4 units, button 4.8 × 1.2) onto the control's box, so the same effect fits every layout.

- **Select:** a flash, gold glints along all four rails, flares on the top and bottom finials, and sparks and motes in the hero's element (Ember fire, Rift crystal shards and arcs).
- **Selected:** a slow looping aura of element motes with occasional rail glints.
- **Hover** on an unselected card: a glint trace along its rails, with the glowing frame shown at 45 %.
- **Begin Journey:** embers and soft light on the red face plus rail glints while it is hovered, keyboard-focused or held. Confirming adds a flash, finial flares and sparks along the rails, and the screen closes 260 ms later.

If NixieFX fails to load, the screen runs unchanged without highlights. Frames below are stepped on a frozen effect clock, so each shows the stated time after the event.

![Card highlights: hover, select burst at 0.06, 0.18 and 0.42 s, selected aura](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAc5cd450490f3baf11510a346)

![Begin Journey highlights: default, hover or focus glow, pressed, press flash](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAf513855f49823e67bd764861)

## Input

Mouse and pen get hover; touch goes default → pressed → default with no hover. A tap fires on release over the control, and releasing outside cancels. Keys while the screen is open: ← → ↑ ↓, Tab and Shift+Tab (or 1 and 2) switch hero; Enter or Space shows Begin Journey pressed while held and begins on release; Esc goes back and keeps the current hero. Keys never reach the world behind it. Selection always combines the glowing frame, the check badge and the Selected label.

![Unselected card on hover](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA3ba54d4f220758032376f18c) ![Card pressed](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAa9701f53834048a536033c1c)

![Begin Journey default, hover or keyboard focus, and pressed textures](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA93e3b10f69889fc7432e0869)

| Check (game build in Chromium) | Result | Detail |
|---|---|---|
| mouse tap on a card selects it | Pass |  |
| releasing outside Begin Journey does not confirm | Pass |  |
| mouse Begin Journey confirms and closes | Pass | saved hero ember-warden |
| the game swaps to the chosen hero (HUD name) | Pass | HUD shows Ember Warden, was Rift Runner |
| ArrowUp switches hero | Pass |  |
| Tab switches hero | Pass |  |
| Shift+Tab switches back | Pass |  |
| Enter held keeps the screen open (pressed state) | Pass |  |
| Enter release begins with the selected hero | Pass | saved hero ember-warden |
| Escape goes back and keeps the playing hero | Pass | HUD Rift Runner → Rift Runner, saved rift-runner |
| touch tap on a card selects it | Pass |  |
| touch Begin Journey confirms | Pass | saved hero rift-runner |
| touch Back closes (hit target ≥ 44 CSS px) | Pass | Back hit area 49.7 CSS px |

## Crispness at DPR 1, 2, 3 and 2.625

Edge width is measured on each text crop: the mean run of pixels between 10 % and 90 % of the crop's contrast, in device pixels (1 px is an ideal anti-aliased edge). Viewport 1280 × 720. Text edges stay between 1.11 and 1.48 device px at every DPR. Selected reads 1.7–2.0 px because its crop also catches the card name just above it and the glowing gold frame behind it (visible in the sheets), so the scan measures those gradients rather than the label's own edge. The stage scale at 1280 × 720 is 0.7651, so frames load @1x at DPR 1, @2x at DPR 2, @3x at DPR 3, @2x at DPR 2.625. The full 1672 × 941 composition at DPR 2.625 loads @3x. The sheets also show Begin Journey, a card and an icon at device resolution (frame crops are not measured).

| 1280 × 720 | CHOOSE YOUR HERO | Choose a hero to begin y… | Back | Selected | LOADOUT | Lv. 1 | Skills cast automaticall… | Frames |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| DPR 1 | 1.26 | 1.4 | 1.42 | 2.04 | 1.15 | 1.12 | 1.31 | @1x |
| DPR 2 | 1.3 | 1.33 | 1.48 | 1.98 | 1.11 | 1.14 | 1.21 | @2x |
| DPR 3 | 1.37 | 1.36 | 1.27 | 1.7 | 1.11 | 1.11 | 1.18 | @3x |
| DPR 2.625 | 1.33 | 1.41 | 1.21 | 1.92 | 1.13 | 1.13 | 1.22 | @2x |

![Choose Your Hero at DPR 1, frames @1x](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA2fa0738f026ee35287d3577c)

![Choose Your Hero at DPR 2, frames @2x](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAba310bb835f652c48ab3904d)

![Choose Your Hero at DPR 3, frames @3x](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAc5579d1f079bbd1771ed80a6)

![Choose Your Hero at DPR 2.625, frames @2x](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA591f6d228042bd0971931dc2)

## Console errors and co-op

No console or page errors on any capture page (all shots, comparisons, highlights, crispness and input checks). Co-op smoke test ([scripts/coop-smoke.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fcoop-smoke.mjs)): passed, 806 common ticks.

## Known differences from the references

- The art is the kit's own (castle, hero figures, portraits, frames), so figures, portraits and ornaments differ from the reference paintings. The kit frames' ornaments are heavier, so frame boxes are set so the rails, not the ornament tips, land on the reference rails.
- The kit fitted Rift Runner's wider master into its canvas at about 0.86× Ember's scale; the screen scales his figure by 750/640 so both heroes stand at the reference size. Card portraits are lowered so the hair is not cut under the top rail.
- As in the references, the portrait panel differs per hero: Ember shows Loadout as the panel title, Rift shows name, description, Loadout and the help line.
- Text is the reference's size on mobile (about 11–13 CSS px on a 390 px phone), as the overlay requires; landscape phones get their own larger composition instead.

## Files and rebuild

- Screen: [choose-hero.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fchoose-hero.ts) · highlights: [choose-hero-fx.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fchoose-hero-fx.ts) · picker flow: [hero-picker.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fhero-picker.ts) · roles: [tokens.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Ftypography%2Ftokens.ts) · split frames: [frames.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Ftypography%2Fframes.ts)
- UI set: `node scripts/choose-hero/build-ui.mjs` · highlights: `npm run vfx` · evidence: `node scripts/choose-hero/capture.mjs [shots|compare|fx|crisp|input|all]` (production build served by vite preview) · this page: `node scripts/choose-hero/publish-knowledge.mjs`
- Evidence data: [docs/choose-hero/evidence.json](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fchoose-hero%2Fevidence.json)
