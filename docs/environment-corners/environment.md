Reusable foreground artwork for **court** (inside the castle) and **snow** (gate/outskirts). Eight transparent WebP assets are ready; gameplay integration remains a separate task.

## Reference and concept

Painterly blue shadows, restrained amber torch rims, darker foreground silhouettes and soft painted depth. Left and right are independently generated, never mirrored.

![Original desktop mockup](/api/rooms/DR2acdbf9c7c4af10516c89541/attachments/DA522af51364879138364af8a8)

![Snow gate concept](/api/rooms/DR7f0a660e4dfc6ca5002753b3/attachments/DA09f0b9e6d337117fec3f3fad)

![Court and snow: desktop left/right, then mobile left/right](/api/rooms/DR7f0a660e4dfc6ca5002753b3/attachments/DAce39824167b3dc85ab1f8911)

## Asset kit

Desktop: **640×760 px**, bottom corners, camera parallax and area cross-fade. Mobile: **360×300 px**, separately composed thin top corners, static with area cross-fade. Dimensions are @2x targets; all files retain alpha. No CSS blur is needed.

### Court

**Left · 640×760 · 83.8 KiB**

![court Left · 640×760 · 83.8 KiB](/api/rooms/DR7f0a660e4dfc6ca5002753b3/attachments/DA5179568cb568ef325e3bf238)

[corner-court-left.webp](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Fenvironment-corners%2Fv1%2Fcorner-court-left.webp)

**Right · 640×760 · 76.8 KiB**

![court Right · 640×760 · 76.8 KiB](/api/rooms/DR7f0a660e4dfc6ca5002753b3/attachments/DA4ca2c1824167bc1f6a169eb7)

[corner-court-right.webp](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Fenvironment-corners%2Fv1%2Fcorner-court-right.webp)

**Left Mobile · 360×300 · 18.7 KiB**

![court Left Mobile · 360×300 · 18.7 KiB](/api/rooms/DR7f0a660e4dfc6ca5002753b3/attachments/DAf26e1265e9feb2be0a04814c)

[corner-court-left-mobile.webp](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Fenvironment-corners%2Fv1%2Fcorner-court-left-mobile.webp)

**Right Mobile · 360×300 · 19.9 KiB**

![court Right Mobile · 360×300 · 19.9 KiB](/api/rooms/DR7f0a660e4dfc6ca5002753b3/attachments/DAe7d643d7456a12273e0bb284)

[corner-court-right-mobile.webp](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Fenvironment-corners%2Fv1%2Fcorner-court-right-mobile.webp)

### Snow

**Left · 640×760 · 118.1 KiB**

![snow Left · 640×760 · 118.1 KiB](/api/rooms/DR7f0a660e4dfc6ca5002753b3/attachments/DA1fa3464ad322b0777090b5b0)

[corner-snow-left.webp](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Fenvironment-corners%2Fv1%2Fcorner-snow-left.webp)

**Right · 640×760 · 138.5 KiB**

![snow Right · 640×760 · 138.5 KiB](/api/rooms/DR7f0a660e4dfc6ca5002753b3/attachments/DA9736c481e9a1351b9250b57f)

[corner-snow-right.webp](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Fenvironment-corners%2Fv1%2Fcorner-snow-right.webp)

**Left Mobile · 360×300 · 32.6 KiB**

![snow Left Mobile · 360×300 · 32.6 KiB](/api/rooms/DR7f0a660e4dfc6ca5002753b3/attachments/DA1edaa0b36a91eeb5003d0edb)

[corner-snow-left-mobile.webp](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Fenvironment-corners%2Fv1%2Fcorner-snow-left-mobile.webp)

**Right Mobile · 360×300 · 24.2 KiB**

![snow Right Mobile · 360×300 · 24.2 KiB](/api/rooms/DR7f0a660e4dfc6ca5002753b3/attachments/DA47516f12b74dab486c0c3bb2)

[corner-snow-right-mobile.webp](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Fenvironment-corners%2Fv1%2Fcorner-snow-right-mobile.webp)

## Placement and handoff

- Desktop: bottom-left/right at `clamp(220px, 22vw, 380px)` width. Overscan outer edges by at least 60 px and limit camera movement to ±60 px; keep the center open. Render below the HUD, never intercept input.
- Mobile portrait (≤700 px): top corners at `18vw`, height ≤`16dvh`, behind HUD. Landscape (height ≤500 px): crop the same mobile pieces into narrow outer side strips. Keep clock, health, thumb stick, skills and XP unobstructed. No camera motion.
- Resolve `court` before outdoor biomes; crossing the gate selects `snow`. Preload the next set, hold an area change for ~1.5 s or ~2 tiles, then cross-fade 600–800 ms. Reduced motion disables parallax; fade corners near combatants.

[Technical handoff and future biomes](/organizations/ORd5dd6f99b4308d6187031557/projects/PJ8758f22f61165f3d3215e454/knowledge/NKBD0baba175de862e64cfff7319) · [Manifest](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Fenvironment-corners%2Fv1%2Fmanifest.json) · [Review gallery](https://ark-whachat.fural.space/environment-corners/v1/)

## Verification and limits

All eight exports were visually inspected, decoded and checked for exact dimensions and genuine alpha. Desktop files are 77–139 KiB; mobile files are 19–33 KiB. Distinct silhouettes, clear interior space and consistent materials are present. PNG generation sources and export script are retained in the repository.

This is an artwork delivery. In-game HUD clearance, camera motion, gate-triggered cross-fades, reduced-motion behavior and mobile FPS must be tested when integrated; they are not claimed here.
