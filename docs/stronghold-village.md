## Village composition and perspective

The reported scene looked like a paved military courtyard. The revised settlement has four cottages, eight leafy oaks, 35 crop plants, textured grass parcels, a central stone square and crossing paths. The back walls remain as shelter; the front is open. The smaller gate meets the east lane.

All objects use the same 128 × 64 projection and ground-Y ordering. Barracks, expedition table and altar receive individual vertical shear around their ground pivot to bring shallow source-art edges closer to the floor axes. This preserves vertical walls but remains an approximation of painted 2D assets, not a reconstructed 3D camera. Gate and barracks scales are reduced for the settlement. Cottages are decorative, not additional economy buildings.

The built-in imagegen generated assets-src/village/cottage-oak.png: two isolated transparent production props, a medieval timber cottage and leafy oak, detailed muted dark-fantasy painting, 2:1 isometric axes, upper-left light. Left/right halves were extracted with Sharp, alpha-trimmed and resized into public/village/cottage.png and oak.png. No generated scene image replaces the runtime.

## Verification

TypeScript/Vite build; eight economy/save/offline tests; full existing browser progression (claim concurrency, upgrades, forge, expedition and controlled arena-return fixture); village browser checks at 1440, 390 and 320 pixels, all seven selections, vegetation/crop counts, loaded images, no overflow and no page errors. Public dedicated host also passed the three viewport checks. No physical-device performance claim.
