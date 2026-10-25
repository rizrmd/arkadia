## Generated inventory artwork

Six actual raster assets generated with the built-in imagegen tool: round red-glass Health Potion, cream Stronghold Teleport Scroll with a large blue tower, plain leather drawstring bag, charcoal/gold panel frame, empty gold-rimmed slot, and blank amber/gold action button. All labels, quantities and control states remain rendered HTML in English. Item/bag alpha is preserved. Optimized WebP files total about 60 KB; item icons are 256 px, bag 128 px, slot 192 px and panel/button 512 px wide.

Prompts requested smooth non-pixel 2D illustration, strong simple silhouettes readable at 32–48 px, broad shading, restrained gold/charcoal HUD styling, no text or extra objects. The panel requested an empty center and thin symmetric gold frame for nine-slice scaling; slot requested a faint central diamond; action button requested an empty amber center and gold bevel. Generated outputs were resized/compressed with Sharp; no handcoded SVG replacements.

The existing inventory store and gameplay effects remain unchanged. Responsive layouts, safe areas, 44 px minimum controls, selected/focus states and disabled Use states remain native. Item images fit within each slot, including short landscape layouts.

Verification: `node scripts/test-inventory.mjs`, `node scripts/verify-inventory-layout.mjs`, `node scripts/verify-inventory-v2.mjs`; `VERIFY_URL=https://ark-whachat.fural.space node scripts/verify-inventory-v2.mjs` for live. The full-game check covers actual enemy damage/healing, successful return consuming one scroll, persistence, add/remove, keyboard and Settings/blessing guards at desktop/portrait/landscape.
