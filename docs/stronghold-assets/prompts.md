## Generation record

Mode: built-in imagegen, seven separate transparent PNG requests. Every request used the Knowledge practical mockup (DA87af4723db2c2a23d6e54f2e) as a reference image, not as a background to import.

Shared brief: One isolated import-ready game sprite matching the supplied stronghold reference. Restrained painterly dark fantasy, 2:1 orthographic isometric, upper-left light. Complete freestanding structure fully visible with generous transparent padding. No floor tile, scenery, UI, text, watermark or people. Real transparent background.

| Asset | Subject prompt |
| --- | --- |
| Forge | Gray limestone, muted red tiled roof, tall stone chimney, amber furnace, tools and small timber work porch. Weathered but usable, not collapsed. |
| Barracks | Small gothic limestone hall with weathered muted red tiled roof, red training banner, timber weapon rack and two shields. |
| Altar | Compact gothic limestone shrine, tall pointed carved ivory niche around floating cracked ivory relic, candles and short stone stair, restrained amber light. |
| Mage tower | Compact cylindrical limestone wizard tower with steep navy slate roof, small side timber study porch, circular blue mana lens, subtle blue glow and amber window. |
| Mine | Small rocky mine entrance, gray stone crags with timber support frame, pulley and hoist, cart of ore, baskets and warm amber lantern at dark entrance. |
| Expedition table | Sturdy dark wooden field map table covered in parchment map without lettering, small map pins, brass lantern, rolled scrolls, two stools, navy banner on short pole. |
| Run gate | Compact fortified gatehouse, two squared gray limestone crenellated piers, closed dark timber portcullis doorway, navy banners and amber torches. Wall axis runs upper-left to lower-right, doorway visible on front left facing camera. |

Sources are preserved in assets-src/stronghold. Run node scripts/prepare-stronghold-assets.mjs to trim transparent margins, fit each sprite inside 640 × 640, retain alpha, validate transparent/solid pixels and write the manifest/contact sheet. No image-generation API is needed to reproduce extraction from committed sources.
