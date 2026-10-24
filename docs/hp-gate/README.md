## Responsive health artwork and gate encounters

The top-left health meter uses an imagegen brass frame. CSS retains the runtime image's 2166:212 aspect ratio on phones and desktop; the dynamic green/red fill remains independent of the frame. HP text stays readable and the HUD reserves space for the time chip. No distance appears in the HUD.

Monster packs spawn exactly 10 ground meters from the gate threshold (world 577,790; ground tile 14.84375,14.84375). One tile is 3 meters. Candidates lie in the outward-facing 120-degree arc, must be walkable, and must be outside the court. Every member and respawn uses the same distance. The court side of the gate is safe; monsters stay outside and the hero heals there. The former 100-meter tent radius and hero-relative recycling are removed.

## Image generation

Tool: built-in imagegen, transparent background. Original: `assets-src/ui/health-frame.png`. Runtime: `public/ui/health-frame.webp` (transparent padding trimmed and encoded with sharp; artwork unchanged).

Prompt: Use case: stylized-concept. Asset type: production fantasy RPG health bar frame for Arkodia HUD. Generate ONE horizontal slim empty health bar frame, front view, centered isolated on real transparent background. Muted aged brass bevel edging, dark charcoal inset, restrained medieval craftsmanship matching a snowy isometric fantasy game. Overall object aspect ratio exactly 6:1, straight rectangular inner opening with subtly rounded corners; tiny decorative endcaps only, no large ornaments. The inner opening must be transparent so a dynamic health fill can be placed behind it in code. Frame occupies almost full image width, ample clear separation from canvas edges. No health fill, no letters, no numbers, no icons, no additional objects, no drop shadow outside frame. Crisp readable silhouette when displayed 180 pixels wide on mobile. Render canvas landscape.

The generated artwork has a slimmer actual ratio than requested; the UI follows its measured dimensions to avoid stretching.

## Verification and publishing

`npm run build` and `node scripts/verify-hp-gate.mjs` pass. The legacy `verify-encounters.mjs` entry point runs the current acceptance suite. It checks 20,000 spawn samples, walkability rejection, mobile widths 320/390 and desktop width 1440, artwork ratio, clock clearance, no distance text, safe court, auto combat, wounded health fill and recovery, and no browser errors. Screenshots and JSON results are in this folder.

Build a committed release in an isolated directory, then run `RELEASE_DIR=<directory> node scripts/publish-hp-gate.mjs` to publish via the managed Stronghold sandbox. Run `DEMO_URL=https://arkadia-stronghold-whachat.fural.space node scripts/verify-hp-gate.mjs` to verify the public site.
