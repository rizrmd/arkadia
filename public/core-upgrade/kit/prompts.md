## Generation provenance

Built-in imagegen, one call per asset/variant. Every call received original DA5acc175c0ae712a3811fe761 (`reference.png`); button state calls also received the generated normal button original. Transparent background requested for every component except charcoal. No API/CLI fallback or procedural artwork. All outputs inspected inline; alpha channels checked from actual pixel data.

Shared constraints: front-facing medieval 2D game UI; strictly match reference materials and proportions; no labels, numbers, scenery or extra assets; transparent PNG exterior where appropriate.

| Asset | Prompt specification |
| --- | --- |
| frame | Outer double gold beveled ornate rectangular frame only, integrated small top diamond crest and bottom pointed gold glow. Clipped ornamental corners, fine inner stroke, dark metal edge. Transparent opening and exterior. |
| charcoal | Opaque edge-to-edge dark blue-black charcoal/slate texture, subtle smoky mottling, evenly dark readable center, no objects or frame. |
| button | Blank wide 5:1 gold upgrade button, clipped beveled corners, side diamond points, double bevel, golden mottled metal interior. Normal state. |
| hammer | Circular dark charcoal inset, double polished gold rim and halo, diagonal gold hammer, right chevron. |
| campfire | Orange-yellow flame, stacked dark logs, ring of rounded gray stones, warm glow; panel icon only. |
| header | Blank slim 8:1 dark slate plaque, tiny clipped corners, fine gray border, low contrast mottled surface. |
| gold | Three stacked warm polished gold coins, elliptical top, embossed center, brown edges. |
| wood | Three short brown cut logs stacked diagonally, pale tan circular ends lower left, warm bark shading. |
| clock | Gold circular rim, charcoal face, ivory-gold hands at twelve and three, no numerals. |
| tick | Sharp tapered lime-green check, short left stroke and long ascending right stroke, painted highlight, no circle. |
| divider | Slender warm-gold horizontal hairline, tiny hollow centered diamond, softly fading ends. |
| button-disabled | Preserve normal button geometry/framing; desaturated antique bronze border and charcoal-brown interior. |
| button-pressed | Preserve normal button geometry/framing; inset dark amber interior, muted upper highlight and bright lower bevel. |

Original files are unmodified. Runtime copies only crop transparent margins at alpha >8 and downsample with sharp. Manifest records source pixel dimensions, crop, output dimensions and original SHA-256. Frame includes both ornaments; hammer includes chevron. Runtime currently uses the normal gold button with no operation handler and an explicit unavailable label; other states are supplied for future approved transaction integration.
