## Rendering decision

Use live, screen-space serif text with warm ivory colour, a compact dark shadow, and a dark panel behind persistent HUD labels. Keep the decorative bronze frames and artwork separate from all text. This combination matches the supplied reference more closely than changing the font alone.

This is a rendering design for the next implementation pass. The game runtime has not been changed by this task. Font identification from the reference is uncertain; visual parity must be checked in the browser.

Reference asset and visual breakdown: [Typography Reference Asset](/organizations/ORd5dd6f99b4308d6187031557/projects/PJ8758f22f61165f3d3215e454/knowledge/NKBD5febf302cb477eefb51e1e59).

## Reference and current gap

The supplied snowy battle reference shows readable mixed-case serif names, larger HP and currency values, restrained gold accents and near-black backing. Fine serifs remain visible because the letters have space around them. The frame carries most of the ornamentation; the text is comparatively simple.

The current `src/stronghold/style.css` uses Georgia, disables synthetic faces and already keeps the HUD in fixed DOM elements. Preserve that useful architecture. Its hero HUD starts at 13px, HP at 14px, and combines 3px and 6px shadow blur. `src/stronghold/progression.css` uses 11.5px XP text and a 9.5px mobile skill name. These are specific readability gaps relative to the reference. `src/stronghold/combat-vfx.ts` draws floating combat text with Canvas 2D and Georgia, requiring a separate treatment from DOM labels.

## Typeface selection and delivery

**First candidate:** Source Serif 4, regular 400 and semibold 600, for names, statistics and HUD labels. Its sturdy mixed-case serif forms suit the reference better than a fragile ornamental display face. Compare it against the existing Georgia before adoption; no exact match is claimed. Use Source Sans 3, regular 400 and semibold 600, only for dense descriptions, settings and accessibility text. Keep Georgia and system-ui as immediate fallbacks. Decorative all-capital lettering may be evaluated for large menu headings later; it should not replace the mixed-case HUD.

Before adding font files, obtain them from the official upstream project, verify the specific files' SIL Open Font License and retain its notice. Self-host WOFF2 under `/fonts/`, include English letters, punctuation, digits and the actual supported player-name character ranges. Do not silently drop accented names. Start with two serif weights; add the sans family only where used. Set `font-synthesis: none` and request only shipped weights. Tabular figures must be verified in the selected build; use a fixed-width numeric span if that build lacks them.

Use `font-display: swap` with an immediately readable Georgia fallback. Preload only the above-the-fold serif resource actually requested. Load required faces through `document.fonts.load`, then remeasure text and rebuild any cached Canvas labels. Font failure must leave the HUD usable. No external font service should be required during gameplay.

## Proposed tokens

All sizes below are CSS pixels at 100% UI scale, independent of camera zoom. These are tuning values, not screenshot measurements.

| Role | Desktop / compact mobile | Weight | Treatment |
|---|---|---|---|
| Menu heading | 36 / 28 | 600 | Ivory; optional subtle gold gradient only at this scale |
| Hero name | 26 / 20 | 600 | Mixed case; 1.15 line height |
| Gold, time, location | 22 / 18 | 600 | Ivory; numeric fields use tabular figures |
| HP and XP values | 20 / 16 | 600 | Solid ivory, centered above the fill |
| Skill name | 20 / 16 | 600 | Mixed case; up to two lines, 1.2 line height |
| Level, AUTO, key hint | 16 / 14 | 600 | Uppercase only for short states; at most .04em tracking |
| Description | 16 / 15 | 400 | Sans; 1.45 line height; solid colour |

Primary text: `#F3E6C5`; secondary text: `#D4C6A7`; gold emphasis: `#E8BD62`; dark plate: `#101315` at 94% opacity. Use a warm dark shadow `0 1px 1px #160E08`, optionally a second `0 2px 3px #0009` only over exposed scenery. Avoid a large glowing halo around every letter. Persistent small labels get a dark plate rather than a heavy stroke. Normal text must achieve at least 4.5:1 contrast against the final composited backing; large text at least 3:1. Measure final states, including bright snow, red HP fill and flash VFX.

Keep at least 8px clear distance from glyphs to frame ornament at desktop size, 6px on compact mobile. Give text its own content inset inside the nine-slice frame. Never use the frame's visible outer bounds as the text box. Keep text above fill and cooldown overlays so their alpha does not dim labels.

## Rendering recipe

The following is an implementation sketch, not a patch applied to the game. Font resources must be installed before the custom family becomes available.

```css
:root {
  --font-hud: "Source Serif 4", Georgia, serif;
  --font-body: "Source Sans 3", system-ui, sans-serif;
  --text-ivory: #f3e6c5;
  --text-gold: #e8bd62;
}
.hud-label {
  font-family: var(--font-hud);
  font-weight: 600;
  font-size: 20px;
  line-height: 1.2;
  color: var(--text-ivory);
  font-synthesis: none;
  text-shadow: 0 1px 1px #160e08;
}
.hud-value {
  font-variant-numeric: lining-nums tabular-nums;
  white-space: nowrap;
}
.hud-text-plate { background: rgb(16 19 21 / 94%); }
@media (max-width: 520px) {
  .hud-label { font-size: 16px; }
}
```

DOM HUD: render at its final CSS size; do not resize the whole HUD with `transform: scale(...)` or reuse a low-resolution HUD screenshot. Keep fixed overlays outside the camera-transformed world. Camera pan/zoom must change world positioning without shrinking HUD letters. Text should use browser antialiasing; do not apply pixelated image rendering or force platform-specific font smoothing as a universal fix. Use real text once, with accessible labels for icon-only controls; decorative duplicate layers should be hidden from assistive technology.

Canvas combat text: retain a dedicated transparent overlay. Set backing dimensions from CSS dimensions times a tested DPR cap (start with 2), and reset its transform to the DPR on resize. Specify font sizes in CSS pixels after that transform, avoiding a second DPR multiplication. Anchor floating text to projected world coordinates but give its glyphs a readable screen-space size. At 20–26px use a 1–2px dark stroke with round joins before the solid fill; reserve gold gradients and stronger effects for critical hits. Restore Canvas state after each label. Load the font before measuring or caching glyphs and invalidate caches after a font or DPR change. Cache by text, family, weight, size, DPR and effect; bound the cache. Use text metrics plus stroke padding to prevent clipping. Introduce an SDF/MSDF atlas only if profiling proves Canvas text is a bottleneck; it adds shaping and effect complexity without solving HUD layout.

## Responsive behaviour

At widths at or below 520px, reflow the HUD instead of shrinking the desktop composition. Keep HP, gold, timer and skill names at the compact sizes above. Wrap long skill names into two lines and increase the label area; move optional hints to a help panel. Give a long hero name a bounded second line or an ellipsis with its full accessible name. Reserve numeric space for `9,999 Gold`, `100 / 100 HP`, `100 / 100 XP` and `99:59`; use actual game limits if larger. Preserve safe-area padding and 44px interactive targets. Test 200% text scaling; panels may grow or move, but essential values must stay visible.

## Implementation sequence

1. Install licensed font resources and shared tokens. Compare Georgia and Source Serif 4 using the same strings and backing before choosing the final family.
2. Apply hero HUD and clock tokens in `src/stronghold/style.css`; apply skill and progression tokens in `src/stronghold/progression.css`. Expand content insets and mobile layout to fit the proposed sizes.
3. Synchronize Canvas font loading and DPR handling in `src/stronghold/combat-vfx.ts`. Keep critical-hit styling distinct from quiet persistent HUD text.
4. Capture the acceptance matrix below and tune against the original child-page reference. Publish actual comparison captures as additional Typography child-page assets when implementation is performed.

## Acceptance and verification

| Check | Pass condition |
|---|---|
| Desktop 1672×941 and 1440×900; DPR 1 and 2 | Fine serifs visible at native size; no clipping, wide halo or stretched glyphs |
| Mobile 390×844 and 844×390; DPR 2 and 3 | HP/XP ≥16px, names readable, no overlap with skills or safe areas |
| Snow, dusk, torch light and active combat | Contrast targets met; cooldown and fill never obscure values |
| Camera minimum and maximum zoom | Persistent HUD text retains exactly the same CSS size |
| Font blocked, cold load and slow network | Fallback immediately readable; final font does not clip or overlap; Canvas refreshes |
| Numeric and long-name fixtures | No timer width jitter; maximum values fit; names wrap or truncate deliberately |
| 200% text scale and keyboard navigation | Essential values remain visible; focus and accessible names preserved |
| Full three-skill combat load | No unbounded text cache growth; no new text-related long tasks over 50ms in a 30s trace on the target device |

This task verified the source audit, reference asset identity and published Knowledge content. Runtime screenshots, font licensing/download checks, contrast measurements and performance captures remain acceptance work for the subsequent game implementation; no visual parity or performance result is claimed yet.

Rendering output: [Typography Rendering Sample](/organizations/ORd5dd6f99b4308d6187031557/projects/PJ8758f22f61165f3d3215e454/knowledge/NKBDdb2b11d05be02c9301d0bedc).

## Verified integration with this codebase

The current application is Vite + strict TypeScript with native DOM/CSS and Canvas 2D. React, Tailwind, shadcn and a new text renderer are not required. The sample deliberately uses the existing Georgia fallback, so it works immediately without installing a candidate font. Candidate font adoption remains a separate visual comparison.

| Existing integration point | Compatible change |
|---|---|
| `src/app/main.ts` dynamically imports `src/stronghold/main.ts` | Keep the existing single-page mount; do not add a competing router |
| `src/stronghold/main.ts` imports `style.css` | Import a scoped shared typography stylesheet before component rules, then update the actual selectors below |
| `encounters.ts` imports `progression.css` | Update its later and mobile overrides as well; generic `.hud-label` rules alone lose to existing ID selectors |
| `#hero-hud .hud-label` and `.hud-hero` | The hero picker attaches here; style the existing text/button and preserve its interaction |
| `#hero-hud .hud-hp`, `.hud-xp-text`, `.hud-lv-badge` | Apply value/label tokens to existing spans; do not change meter/progressbar semantics or update loops |
| `.clock-time`, `.clock-phase` | Keep existing tabular time and clock handlers |
| `.skill-btn .skill-name`, `.skill-status`, `.skill-key`, `.skill-rank` | Increase label area along with font size; replace `nowrap`/ellipsis for names when using two-line labels; remove the conflicting 9.5px mobile override |
| `.skill-btn` height 58px / 52px on mobile | Two 16px name lines already need about 39px; add state/rank rows and padding, so the original height cannot be preserved. Reflow and measure the full bar rather than only increasing fonts |
| `combat-vfx.ts` render loop | Already caps DPR at 2 and resets `oc.setTransform(dpr,0,0,dpr,0,0)` every frame. Reuse this; never multiply font sizes by DPR again |
| Canvas `oc.font` assignments | Existing branches request 700/800/900. If only 400/600 are installed, replace all branch weights with available weights; otherwise browser matching may hide the intended difference |

Combat text currently draws directly every frame with no glyph cache. Newly loaded fonts will be used on subsequent draws after changing `oc.font`; cache invalidation is only needed if caching is added later. Keep `toScreen()` for world anchors and the existing critical-hit pop animation; glyph size is already screen-space while offsets use the camera scale. The DPR and projection machinery do not need replacement.

Vite copies `public/fonts/*` and `public/typography/*` into `dist/`. The game's asset-size manifest only scans PNG/WebP, so font readiness must use CSS/FontFaceSet and must not depend on that image manifest. Apply prototype tokens under `#stronghold` and `#hero-hud` when integrating: the sample's `body`, `.plate` and `.scene` rules belong to the standalone specimen and must not be pasted globally into the game stylesheet.

The production server redirects secondary `.html` pages and directory routes to the game SPA; `/typography/` is therefore a standalone preview-server path, not a claimed production game route. The release script also stages an explicit asset subset. Publishing a public game-host sample later requires deliberate routing/staging changes. Knowledge attachments and repository source are the published outputs for this study.
