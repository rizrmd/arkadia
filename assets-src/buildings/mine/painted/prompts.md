## Imagegen provenance

Built-in imagegen skill, 28 October 2026. Original 1254 × 1254 RGBA PNGs are authoritative editable raster sources; regeneration is nondeterministic. No mesh, GLB, procedural geometry or model render was used. Materials, lantern illumination and shadows are painted into the sprites.

Shared prompt constraints: Arkodia Mine game sprite; richly hand-painted chunky cool grey rocky mound, warm textured timber grain, iron joinery, amber lantern, organic snow; orthographic target azimuth 45°, elevation 30°, upper-left illumination. Entire isolated transparent square RGBA sprite, clear entrance and short rails toward screen bottom-right. Match approved Mine and Barracks reference proportions and materials; no people, text, UI or watermark. Keep footprint, camera, framing and entrance stable.

| Output | Reference | Requested change |
| --- | --- | --- |
| level-01.png | Approved Mine and Barracks | Starter timber-supported dark mine entrance, small tool crate, snow on ledges, no large hoist |
| level-05.png | Level 1 | Heavier beams, iron binding plates, weatherproof repairs; no stone arch yet |
| level-10.png | Level 1 | Chunky stone entrance arch, organized pickaxe rack and ore crate |
| level-15.png | Level 1 | Fortified stone arch, iron-bound timber, compact snowy terracotta covered loading bay |
| level-20.png | Level 15 | Refined iron beam caps, small static rope pulley, organized rack and covered side bin |
| level-25.png | Level 20 | Restrained dark red pickaxe pennant, brass rivets, refined stone facing |
| level-30.png | Level 25 | Masterwork carved ridge and fitted stone arch, signature pickaxe banner; keep Mine identity |
| repair-strap.png | New generation | Single narrow forged iron repair strap with two brass rivets, chipped edge and snow lip, isolated transparent canvas |

The public review includes seven masters, not thirty independently generated paintings. Intermediate levels compose cumulative repair straps from the generated decal. Exact source hashes and level recipes are in manifest.json. package.mjs only validates and assembles a review sheet; it does not repaint sprites.
