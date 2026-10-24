## Mobile Gold/Time padding and alignment

The coin originally touched the plaque's left edge and both text labels sat below the icons' visual center. The mobile plaque now has 10 design units of icon inset, 10 between each icon and label, equal 24×24 icon boxes, and a taller 44-unit plaque with breathing room above and below. Gold gets 60% of the plaque width. Both labels share a fitted text scale.

Vertical centering uses actual bitmap glyph geometry. Pixi's text bounds include font leading and do not describe the visible letter center; `MsdfText.inkCenterY()` calculates the center from the loaded font's glyph offsets and texture quads. Only the mobile counter layout calls it. Desktop text positioning remains unchanged by this fix.

Implementation: 6da7945 and 05a7cf2, with the separate index correction 1c11eab preserving unfinished peer desktop edits in their working tree. Later peer desktop release 26fb7f8 includes this mobile change and was confirmed applied by the public boot log.

Local and live browser checks pass at 320×568, 390×844, 430×932, 844×390 and 1440×900, with 430 and 9,999 Gold, identical label scales, more than 3 CSS pixels between icons and text at mobile sizes, aligned visible glyph/icon centers, and no page errors. TypeScript, production build and Go release checks pass.

The first release attempt hit an invalid tar archive during concurrent same-commit publishes. Its manifest was quarantined with all parts retained. The healthy subsequent supported release applied successfully. Deployment helper f8980c2 now uses unique mktemp archive filenames and validates completed archives before upload; the peer's portable ustar fix is preserved. No fast deployment or direct asset injection was used.
