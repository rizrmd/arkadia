## Coverage and files

The kit contains **31 reusable runtime PNG assets**, 19 generated production masters, 6 assembled portrait/card exports, 6 transparent typography exports, 4 assembled screen previews, and the component contact sheet. One rejected opaque Ember precursor is retained only for provenance. No game code, thumb stick or gateway assets are changed.

![Complete component contact sheet](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAd3c238881e1c045570aac4d5)

[Asset manifest with dimensions, alpha and hashes](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Fchoosing-hero%2Fv1%2Fmanifest.json) · [Exact layer coordinates for all four assemblies](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Fchoosing-hero%2Fv1%2Flayouts.json) · [English label strings](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Fchoosing-hero%2Fv1%2Flabels.en.json) · [Prompt set and generation provenance](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fchoosing-hero%2Fgeneration.json)

## Reference inventory

| Visible component | Reusable deliverable | Desktop | Mobile |
|---|---|---|---|
| Castle arches, banners, braziers, stairs and embedded embers | Separate desktop/mobile backgrounds | Full bleed | Portrait full bleed |
| ARKADIA wordmark and compass | wordmark label + compass-crest | Upper left | Top center |
| Hero heading, rules and subtitle | title label + divider + live subtitle | Centered across stage | Title above hero; no subtitle in reference |
| Back navigation | back arrow + Back label | Arrow and text | Arrow only |
| Main selected hero and elemental glow | ember-warden / rift-runner transparent layers | Central figure | Large upper figure |
| Both hero portraits and dark name fades | 2 portrait exports | Left rail | Two-card row |
| Default/selected gold frames | 2 hollow frames | Stacked | Side by side |
| Selected check medallion and text | selected-badge + selected label | Selected card | Selected card |
| Information frame, black textured backing and compass crest | panel-desktop / panel-mobile | Right detail panel | Lower loadout panel |
| Hero name and description | English JSON | Both heroes | Rift Runner reference only |
| Loadout title and ornamental rules | loadout label + divider | Inside detail panel | Panel title or subsection |
| Flame Fan and Rift Bolt | 2 skill icons | First slot | First slot |
| Two empty circular slots and central compass plus | skill-empty reused twice | Slots 2 and 3 | Slots 2 and 3 |
| Skill caption, Empty, level indicator | English JSON | Under circles | Under circles |
| Automatic-cast and blessing guidance | English JSON | Both help sentences | Rift automatic-cast sentence; Ember omitted in reference |
| Red journey action and gold ornaments | 4 button-state textures + journey label | Panel footer | Full-width lower action |
| Compass corner flourishes and diamond rules | Included in frames; standalone crest/divider | Across panel and headings | Across cards, panel and heading |

## Desktop assembly

Use a **1672 × 941** design canvas. Draw background → main hero → card rail → information panel → controls → text. Hero crop is top-aligned at (346, 141), showing the top 800 px of an 800 × 1200 rendering; the reference intentionally crops lower legs. Keep the card rail above the figure.

| Layer | x | y | Width | Height |
|---|---:|---:|---:|---:|
| Cards, top / bottom | 60 | 158 / 508 | 270 | 338 |
| Detail panel | 1155 | 130 | 485 | 660 |
| Skill icons, three columns | 1194 / 1333 / 1472 | 427 | 126 | 126 |
| Journey button | 1155 | 744 | 485 | 97 |

Keep panel copy within its dark interior, at least 50 design pixels from the side ornaments. The help text is wrapped to three lines in this reconstruction to avoid clipping.

### Ember Warden desktop

![ember-warden assembled desktop](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA47cc99b34cd8fa646c6e3063)

### Rift Runner desktop

![rift-runner assembled desktop](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAb98ec7ffab2b34a7939a54ab)

## Mobile assembly

Use an **864 × 1824** portrait design canvas. Hero sits at (0, 174), using a top-aligned 864 × 1296 rendering cropped to 1080 px tall. Place the two 324 × 405 cards at (100, 866) and (440, 866); cards overlay the hero's lower body. Place the lower panel at (24, 1255), width 816. Ember uses a 350 px panel with Loadout as the title and its action at y=1605. Rift uses a 425 px panel with hero title, description, Loadout subsection, help sentence and action at y=1660. Both action textures are 816 × 164. Exact icon and label positions are recorded in the assembler source and layouts JSON.

At a 390 px viewport, the fixed composition scale is 390/864 ≈ 0.451. For implementation, allow the document to scroll and keep text at 14–16 CSS px minimum rather than shrinking all text. Use 44 CSS px minimum hit targets for Back, card selection and the main action. Keep safe-area padding at the bottom. Choose the portrait layout below approximately 900 CSS px; preserve proportional stage scaling on desktop and center the canvas on wider displays. Do not stretch the whole screen to a different aspect ratio.

### Ember Warden mobile

![ember-warden assembled mobile](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DAde7e20e9b1f9e68421548249)

### Rift Runner mobile

![rift-runner assembled mobile](/api/rooms/DRcf2ef6dd892ac62cb18a5766/attachments/DA3e959d85539e6e10ad3a5520)

## Rebuild and verification

Run `node docs/choosing-hero/prepare-assets.mjs`, `node docs/choosing-hero/build-kit.mjs`, `node docs/choosing-hero/assemble.mjs`, then `node docs/choosing-hero/finalize.mjs`. The first command reads the preserved generated masters. No new model calls are required to rebuild the deterministic exports. Use `node docs/choosing-hero/verify.mjs` to validate decoding, hashes, alpha and all layout bounds.

The assembled images were visually inspected against all four originals. Art is newly generated to match their identity and material style; small ornament and typography differences are expected. The original Choosing Hero reference page is the visual source of truth.

## Validation results

31 runtime PNGs passed decoding, dimensions, SHA-256 and alpha checks. All four assembled layouts passed canvas-bound checks. All five pages preserve the requested parent and order; the original reference page is unchanged. All 39 inline images downloaded and decoded successfully, and all 54 original repository preview links resolved. The same 39 images rendered successfully in local Chromium using the published attachment URL paths and verified downloaded bytes. Authenticated live Fural UI rendering was unavailable.

[README.md](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fchoosing-hero%2FREADME.md)

[verification.json](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fchoosing-hero%2Fverification.json)

[publication-verification.json](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fchoosing-hero%2Fpublication-verification.json)

