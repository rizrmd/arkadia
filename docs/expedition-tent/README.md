## Expedition tent

Replaces the oversized expedition table at the existing expedition slot with a 210-world-pixel canvas tent. The same expedition identity and position remain in place. Sprite-derived collision, hero occlusion and sun shadows follow the replacement alpha silhouette. The old stool/table foot decals are replaced with restrained dry ground contact dressing. The tent has no emissive sources.

Generated with the built-in image generation tool. Prompt: isolated medieval expedition tent, transparent background, 2:1 isometric ground projection, hand-painted fantasy RPG sprite, weathered beige canvas, blue compass banner, wooden poles and pegs, open entrance, no people, text, furniture, lanterns, ground tile or broad cast shadow.

Asset: public/assets/stronghold/expedition-tent.png. Runtime evidence: public/expedition-tent/day.png and phone.png. Original report: task attachment TAbd373c8d0f0e404f61de26d6.

Verification: npm run build; node scripts/verify-expedition-tent.mjs. Checks asset load, approach, sustained collision, walking around the tent and no page errors; captures desktop and phone. The Stronghold currently supports walking, not entering buildings.
