## World and overlays

Stronghold fills the entire viewport as a single canvas. Terrain, buildings, walls and vegetation are canvas artwork. All HTML controls float above the world; the building panel and forge gallery no longer reserve permanent screen space.

Drag to pan, pinch/scroll to zoom, or choose Fit world. Click any visible part of a building, including its roof, or select it in the building dock. Its floating panel opens and the camera focuses it. Close the panel to reveal the world again. Portrait uses a bottom sheet and never scrolls the document.

The overlay menu contains the modular asset editor, legacy travel map, save import/export and forge appearance gallery. Expedition I and the Expedition Table enter the new Frostpass level. Arena remains available as a separate destination.

## Live game

[Open full-screen Stronghold](https://arkadia-stronghold-whachat.fural.space/stronghold.html)

## Runtime views

![Full-screen desktop Stronghold](https://arkadia-stronghold-whachat.fural.space/fullscreen-snow/stronghold-1536.webp)

![Wide full-screen canvas](https://arkadia-stronghold-whachat.fural.space/fullscreen-snow/stronghold-2560.webp)

![Default portrait camera](https://arkadia-stronghold-whachat.fural.space/fullscreen-snow/stronghold-mobile-default.webp)

![Portrait after Fit world](https://arkadia-stronghold-whachat.fural.space/fullscreen-snow/stronghold-390.webp)

![Landscape view](https://arkadia-stronghold-whachat.fural.space/fullscreen-snow/stronghold-844.webp)

## Verification

The production build and browser checks pass across four viewport sizes. All seven panels, upgrades and navigation into Frostpass work. Canvas selection is tested against opaque roof pixels, and dragging does not accidentally select a building. Resource/save rules remain covered by the existing eight economy tests.


[Implementation and verification notes](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Ffullscreen-snow%2FREADME.md)
