## Expedition tent

Replaces the oversized expedition table at the existing expedition slot with a 210-world-pixel canvas tent. The same expedition identity and position remain in place. Sprite-derived collision, hero occlusion and sun shadows follow the replacement alpha silhouette. The old stool/table foot decals are replaced with restrained dry ground contact dressing. The tent has no emissive sources.

Generated with the built-in image generation tool. Prompt: isolated medieval expedition tent, transparent background, 2:1 isometric ground projection, hand-painted fantasy RPG sprite, weathered beige canvas, blue compass banner, wooden poles and pegs, open entrance, no people, text, furniture, lanterns, ground tile or broad cast shadow.

Asset: public/assets/stronghold/expedition-tent.png. Runtime evidence: public/expedition-tent/day.png and phone.png. Original report: task attachment TAbd373c8d0f0e404f61de26d6.

Verification: npm run build; node scripts/verify-expedition-tent.mjs. Checks asset load, approach, sustained collision, walking around the tent and no page errors; captures desktop and phone. The Stronghold currently supports walking, not entering buildings.

### Doorway depth fix

The tent's front edge used to follow the lowest opaque pixel of each sprite column. In the open doorway that pixel belongs to the dark interior, far behind the canvas walls, so the hero could walk into the doorway and was drawn over the whole tent (doorway-before.png, from task attachment TA7116aca004f8165545401bd8). The tent (`hollow` in src/stronghold/world-view.ts) now takes the lower convex hull of its ground contour (wall feet, poles, rope pegs) as its footprint's front edge. Collision, hero occlusion and sun shadows all read that footprint. The hero now stops in front of the doorway (doorway-blocked.png) and is covered by the tent when standing behind it (hero-behind.png, public/expedition-tent/behind.png). scripts/verify-expedition-tent.mjs asserts both.
