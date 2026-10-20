## Directional walls and ground contacts

The left boundary uses `public/assets/walls/wall-left.png` and `wall-left-broken.png`; the right boundary retains the original `wall-a.png`. `wall-corner.png` is available in the source gallery, not placed at the arena's open arch corner.

`src/walls.ts` records the two ground-contact centres of each segment in source pixels. A uniform scale gives each segment a horizontal ground span of 128 world units (two cells), then a small vertical shear maps its baseline to slope +0.5 or -0.5 without leaning vertical posts. The anchor is the midpoint of these contacts. Segment centres lie on the outer tile edges at grid -0.5, with a two-cell step; the opening beside the arch is intentional. This aligns ground contacts rather than pretending irregular generated masonry is seamless.

The image preview's apparent brown halo contains RGB under zero alpha. Browser canvas sampling and rendering on a checker background verify transparency at the suspect pixels. Runtime uses the original generated PNGs with their alpha intact; no destructive background stripping was needed. The original extraction manifest remains unchanged and separate from the three generated additions.

`npm run build` checks TypeScript and builds the site. `node scripts/verify-walls.mjs` starts a temporary local server and verifies the existing 13 compositor checks, all eight segment slopes and adjacent endpoint joins, source-gallery assets, suspect alpha samples, character movement and browser errors. `DEMO_URL=https://arkadia-whachat.fural.space/ node scripts/verify-walls.mjs` runs the same checks against deployment. Evidence is written to `public/evidence/walls/`.
