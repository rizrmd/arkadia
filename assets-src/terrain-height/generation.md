## Cliff module generation

Built with the built-in imagegen tool, using the imagegen skill. Source: `cliff-strip-source.png`; runtime: `public/terrain-height/natural/cliff-strip.webp` (1536 × 512, 308284 bytes). Alpha is preserved; source is kept outside public runtime assets.

Prompt:

> Use case: stylized-concept. Production game terrain texture module, wide horizontal strip of ONE continuous fractured gray granite cliff wall covered with snow. Orthographic front elevation, no perspective, vertical rock fissures, detailed realistic painted fantasy RPG artwork, blue gray shaded cracks, subtle warm upper left light. Seamlessly connected solid rock face across full width, approximately 4:1 width to height, irregular thick overhanging white snow lip at top, snow tongues in fissures, small blended snow bank along foot. Transparent background above snow crest and below foot. Fill nearly entire canvas horizontally. No isolated boulders, no rows of rocks, no landscape or sky, no text, no UI, no cast shadow outside asset. Keep cliff depth low and wide; suitable for mapping onto polygon side walls. Output 1536x512 if possible.

The renderer maps this reusable strip across the connected outer wall panels of the collision polygon and paints the summit and ramp together once. The west terrace intentionally retains its existing art.
