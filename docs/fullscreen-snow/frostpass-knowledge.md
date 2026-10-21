## Mission

Frostpass is the first playable snow expedition. Begin at the blue camp marker, recover the three golden supply caches, defeat the six revenants, then return to the campfire and interact to extract. The patrol is finite and does not respawn.

The first clear adds **150 Gold, 30 Mana and 5 Souls** to the Stronghold. Later clears do not repeat that reward. Stronghold health bonuses apply on entry. The previous procedural travel map remains accessible from the Stronghold menu.

## Controls and progress

WASD/arrows move; Space attacks; E interacts. Mobile provides a direction pad, Attack and Interact. Tap the ground for direct movement, use the minimap to find supplies, and enable Auto fight if desired. Pause, return home or reload to retain a browser checkpoint. Restart begins again at camp without resetting Stronghold resources or first-clear history.

The world uses a following camera and modular snow, trees, cliffs, stones and camp props, with reduced-motion-aware snowfall. This first authored level is a bounded clearing rather than a procedural campaign. Saves and progression are local to this browser.

## Play

[Enter Expedition I — Frostpass](https://arkadia-custom-whachat.fural.space/snow-expedition.html) · [Return to Stronghold](https://arkadia-custom-whachat.fural.space/)

## Runtime evidence

![Frostpass desktop gameplay](https://arkadia-custom-whachat.fural.space/fullscreen-snow/frostpass-desktop.webp)

![Frostpass portrait controls](https://arkadia-custom-whachat.fural.space/fullscreen-snow/frostpass-mobile.webp)

![Extraction and first-clear reward](https://arkadia-custom-whachat.fural.space/fullscreen-snow/frostpass-complete.webp)

## Verification

The production build, objective/checkpoint/reward unit tests, real movement and attack inputs, finite patrol, three-cache interaction, resume, extraction reward, duplicate-reward prevention, restart and defeat checks pass. The end-to-end test uses controlled enemy/position fixtures for objective completion; it is not an unaided gameplay playthrough.


[Implementation and verification notes](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Ffullscreen-snow%2FREADME.md)
