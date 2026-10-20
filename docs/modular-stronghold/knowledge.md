## Reference breakdown

The supplied screenshot is a composed scene. It is now represented by reusable ground, structure, prop, building and UI layers instead of a single courtyard background.

| Layer | Components | Delivery |
| --- | --- | --- |
| Ground | Weathered stone paving; snow-dusted earth | Two new generated surfaces, periodic UV textures and 256 × 128 diamond PNGs displayed at 128 × 64 |
| Enclosure | Northeast wall; southeast wall; corner tower; gatehouse | Four newly generated transparent sprites |
| Environment | Snowy pine; snowy rock outcrop; moss/grass decal | Three newly generated transparent sprites |
| Supplies | Wooden crate; barrel | Two newly generated transparent sprites |
| Details | Blue compass banner; burning iron torch | Two newly generated transparent sprites |
| Buildings | Forge; Barracks; Altar; Mage Tower; Mine; Expedition Table | Six existing generated transparent sprites reused with calibrated projection |
| Forge variants | Ruined; new; repaired; upgraded | Existing generated state sheet and individual runtime sprites |
| Interface | Gold, Mana, Souls; selection highlight; resource HUD; building panel; actions | Existing SVG icons and DOM controls, kept separate from terrain artwork |

Thirteen new imagegen calls produced thirteen distinct source assets. The runtime manifest contains twenty entries including reused buildings and the forge-state sheet. These are reusable assembly units; architectural details within a building remain part of that building sprite. This is not a claim that every roof tile, timber or stone has become a separate sprite.

## Files and assembly contract

- `assets-src/modular-stronghold/` preserves all thirteen original imagegen PNGs.
- `public/modular-stronghold/` contains alpha PNGs, periodic textures, contact sheet, manifest, editor and runtime evidence.
- `scripts/prepare-modular-stronghold.mjs` packages the originals reproducibly; it does not call an image API.
- Projection: `x = (u-v) × 64`, `y = (u+v) × 32`. Ground axes are ±0.5. Ground tile pivot is center; prop pivot is near the foot. Walls record their footprint correction separately in the runtime.
- The generated surfaces are sampled and reflected into periodic UV textures. Opposite UV edges are byte-identical, then mapped to exact 2:1 diamonds. This avoids relying on an AI promise of seamless edges. Reflection can produce visible symmetric/repeated motifs; more authored variants are a future visual improvement.
- Ground is generated for the visible grid range, including negative coordinates. The renderer has no finite background extent and fills newly exposed viewport space. This is an unbounded terrain grid, not an infinite list of DOM sprites.
- Standalone structures/props use ground-Y ordering; building gameplay stays in the existing economy/save system. The monolithic courtyard plate is no longer loaded.

## Editor

Open `/modular-stronghold/index.html`. Select an asset and click to place; terrain snaps to cells. Choose Pan or right-drag to move around the unbounded grid; scroll to zoom. Erase removes the topmost placed prop at that cell or restores the default tile. Export layout downloads JSON with projection, tile overrides and prop coordinates. The editor is a layout prototype: exported layouts are not automatically loaded into the live game, and editor changes are not persisted after reload.

## Generation specifications

Mode: built-in imagegen, one call per asset, transparent background enabled. No API/CLI fallback was used. All requested a detailed painterly dark medieval fortress style, orthographic 2:1 dimetric view, vertical architecture, upper-left lighting, isolated full silhouettes, no text or UI.

| Source | Final subject constraints |
| --- | --- |
| paving | Flat repeatable 2:1 diamond, weathered small gray limestone cobbles, tiny moss joints, no side thickness or surrounding scenery |
| snow | Flat 2:1 diamond, snow-dusted mountain earth, muted grass/gravel, no large rocks, no objects, no outline |
| wall-ne | Straight four-battlement gray limestone wall, lower-left to upper-right, clean vertical butt joins, no towers/caps |
| wall-se | Straight four-battlement gray limestone wall, upper-left to lower-right, clean vertical butt joins, no towers/caps |
| tower | Stout square gray limestone corner tower, open crenellated parapet, no roof or attached walls |
| gate | Compact twin gray limestone gate towers, arched wooden iron-strapped door, blue banner, two torch sconces, no attached long walls |
| pine | Single whole snow-dusted evergreen with short visible trunk and tiny roots, no ground patch |
| rocks | Single low irregular cool slate-gray snowy rock outcrop, moss at base, no surrounding landscape |
| moss | Low irregular transparent-edged olive grass/moss/pebbles decal, no soil slab or hard border |
| crate | Single weathered oak cube with cross planks and iron corner nails, no external shadow |
| barrel | Single upright dark oak storage barrel with black hoops and closed lid |
| banner | Single blue swallowtail cloth, cream compass star, short iron hanging rod, no wall |
| torch | Single black wrought iron wall sconce/cage with amber flame and small local glow, no wall |

## Verification

Production TypeScript/Vite build passes. Automated browser checks cover four viewport sizes (1536 × 1024, 1920 × 1080, 2560 × 1080, 390 × 844), all seven building selections, loaded props, no monolithic courtyard, opaque terrain at both viewport edges, and editor placement/pan/zoom without page errors. Both ground UV textures have byte-identical opposite edges. Eight economy/save/offline tests and the existing gameplay browser regression also pass. Browser evidence is synthetic desktop/mobile viewport testing, not physical device testing.

## Live tools and downloads

[Open the modular editor](https://arkadia-stronghold-whachat.fural.space/modular-stronghold/index.html) · [Open the game](https://arkadia-stronghold-whachat.fural.space/stronghold.html) · [Download runtime kit ZIP](https://arkadia-stronghold-whachat.fural.space/modular-stronghold/kit.zip)

## Human reference

![Reported courtyard and empty side space](/api/organizations/ORd5dd6f99b4308d6187031557/task-attachments/TA1c2c474293792da1bac027a7)

## Asset overview

![Modular asset breakdown](https://arkadia-stronghold-whachat.fural.space/modular-stronghold/contact-sheet.webp)

## Generated source artwork

The following are previews of each independent imagegen output; original full-resolution PNGs remain in the repository. Terrain previews show the generated surface before periodic UV packaging.

### Banner

![banner generated source](https://arkadia-stronghold-whachat.fural.space/modular-stronghold/source-banner.webp)

### Barrel

![barrel generated source](https://arkadia-stronghold-whachat.fural.space/modular-stronghold/source-barrel.webp)

### Crate

![crate generated source](https://arkadia-stronghold-whachat.fural.space/modular-stronghold/source-crate.webp)

### Gate

![gate generated source](https://arkadia-stronghold-whachat.fural.space/modular-stronghold/source-gate.webp)

### Moss

![moss generated source](https://arkadia-stronghold-whachat.fural.space/modular-stronghold/source-moss.webp)

### Paving

![paving generated source](https://arkadia-stronghold-whachat.fural.space/modular-stronghold/source-paving.webp)

### Pine

![pine generated source](https://arkadia-stronghold-whachat.fural.space/modular-stronghold/source-pine.webp)

### Rocks

![rocks generated source](https://arkadia-stronghold-whachat.fural.space/modular-stronghold/source-rocks.webp)

### Snow

![snow generated source](https://arkadia-stronghold-whachat.fural.space/modular-stronghold/source-snow.webp)

### Torch

![torch generated source](https://arkadia-stronghold-whachat.fural.space/modular-stronghold/source-torch.webp)

### Tower

![tower generated source](https://arkadia-stronghold-whachat.fural.space/modular-stronghold/source-tower.webp)

### Wall Ne

![wall-ne generated source](https://arkadia-stronghold-whachat.fural.space/modular-stronghold/source-wall-ne.webp)

### Wall Se

![wall-se generated source](https://arkadia-stronghold-whachat.fural.space/modular-stronghold/source-wall-se.webp)

## Runtime evidence

![Modular game composition](https://arkadia-stronghold-whachat.fural.space/modular-stronghold/runtime-1536.webp)

![Wider viewport filled by tiles](https://arkadia-stronghold-whachat.fural.space/modular-stronghold/runtime-2560.webp)

![Mobile modular game](https://arkadia-stronghold-whachat.fural.space/modular-stronghold/runtime-390.webp)

![Infinite tile editor](https://arkadia-stronghold-whachat.fural.space/modular-stronghold/editor.webp)

## Publishing

The task commit was pushed to feat/stronghold. A bounded asset overlay was transferred through supported Fural home-files transfer and sandboxes serve to both existing public hosts, preserving unrelated live arena releases. Public-host browser verification passed on the Stronghold host. The ZIP contains runtime assets and the editor, not the full-resolution generation sources.
