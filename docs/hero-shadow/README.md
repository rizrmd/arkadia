## Hero shadow follows the sun

The Stronghold hero used to draw a fixed dark ellipse (12 × 6 px, 30% black) under its feet at every hour, on top of its sun shadow. At night it was the only shadow in the court, and by day it sat beside a sun shadow that pointed elsewhere, so the hero looked lit from two directions.

The ellipse is gone. The hero now has only the sun-cast silhouette, which uses the same direction, length, colour and fade as the building shadows. At night, when the sun alpha is 0, the hero has no shadow, just like the buildings.

- [src/stronghold/hero.ts](../../src/stronghold/hero.ts): `render()` no longer paints the contact ellipse.

### Verification

Run `npm run build`, then `node scripts/verify-hero-shadow.mjs`. The script captures the hero at night (`?time=0`), in the morning (`0.31`), at noon (`0.5`) and in the evening (`0.7`) and saves the shots in this folder. `node scripts/verify-hero-walk.mjs` still passes, and its screenshots were refreshed without the ellipse.
