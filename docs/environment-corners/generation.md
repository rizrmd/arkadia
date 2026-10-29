## Generation record

Built-in image_gen, eight independent stylized-concept calls, transparent_background=true. No CLI/API fallback. Sources: assets-src/environment-corners/v1/. Exports: public/environment-corners/v1/. Re-export: node scripts/export-environment-corners.mjs.

Shared prompt: painterly medieval fantasy foreground cutout, genuine alpha, cool blue-violet/charcoal shadows, subtle amber torch rim, soft painted depth, no characters, UI, text, watermark or scenery rectangle. Distinct left/right silhouettes, never mirror.

| Asset prompt | Composition |
|---|---|
| snow-left | Tall spruce, smaller boughs at bottom, bottom-left anchor |
| snow-right | Broken leaning trunk, uneven pine crowns, snowy rock, bottom-right |
| snow-left-mobile | Single sparse snow-laden bough hanging from top-left |
| snow-right-mobile | Short forked diagonal spruce twigs, small icicle, top-right |
| court-left | Pillar, navy banner, short wall, barrel and crate, bottom-left |
| court-right | Buttress, rounded finial, parapet, staggered crates and navy cloth, bottom-right |
| court-left-mobile | Thin carved lintel, corbel and short navy pennant, top-left |
| court-right-mobile | Arch springer, stepped masonry, iron ring and folded navy cloth, top-right |

Desktop export 640×760; mobile export 360×300. Generator canvases had matching aspect ratios; deterministic resize/format conversion only. Alpha is preserved without background removal. WebP quality 86, alphaQuality 100, effort 0; high-effort encoding exceeded command limits. This affects compression efficiency, not dimensions or alpha preservation.
