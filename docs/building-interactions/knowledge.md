## Shared building panel interaction

Core, Farm, Lumber Mill, Kitchen, Walls and Mine use the approved English Pixi layout. Every panel and its child hit areas render at **0.75 of its previous fitted dimensions**, including phone viewports. Desktop width is 405 logical pixels (previously 540); at 390px viewport width it is 274.5 pixels (previously 366). Existing portraits, recipes, target browsing, completed-level requirements, maximum levels and co-op restrictions are retained.

Context badges require isometric distance `hypot(dx, 2*dy) <= 160`, reduced from 240. The new threshold remains beyond the central Core collision reservation. Moving outside range closes the panel and hides its badges. ESC or an outside pointer release closes the panel and restores all currently eligible, in-range building badges. While open, all six external badges are hidden and excluded from hit testing. The complete outside pointer sequence is consumed before world listeners; it cannot select a building, pan, or begin a world action. Closing on release prevents the same pointer from activating the newly restored context badge.

Build/Upgrade uses the existing disabled artwork, subdued tint and noninteractive hit testing. Feedback refreshes when saved balances or requirements change: Not Enough Gold, Not Enough Wood (Log), unmet building requirements, or the existing queue/timer limitation. Previewing future targets grants no level or resources. **Construction transactions and persistent upgrade timers remain unreleased**, so even affordable, requirement-satisfying operations remain disabled. This change does not add spending, timers, save migrations, or modify maps.

## Discussion references

The following production screenshot identifies the original gold-looking unavailable button and oversized panel; it is a superseded issue reference. The human confirmed **75% of the original dimensions**, not 25%.

![Superseded production issue reference](/api/rooms/DR2d49ace0025f66084af0c78a/attachments/DAc1d6b0ee71fc8b40c49c440f)

Earlier discussion images are preserved below as historical layout evidence. Their original scale and button appearance are superseded by the current interaction policy.

![Earlier Core desktop capture](/api/rooms/DR2d49ace0025f66084af0c78a/attachments/DAadb5df24827033f01bb69b79)

![Earlier Core mobile capture](/api/rooms/DR2d49ace0025f66084af0c78a/attachments/DAde8c52c78c31cbf8a41ea290)

![Earlier all-Core transition sheet](/api/rooms/DR2d49ace0025f66084af0c78a/attachments/DA8a552b3d30c37e6f08afe2cf)

![Earlier Walls discussion reference](/api/rooms/DR2d49ace0025f66084af0c78a/attachments/DAe26e4a1b1ad0e4024ef59e3f)

## Validation evidence

Native Chromium renders actual Pixi modules with device pixel ratio 2. Physical pointer tests cover all six badges and disabled buttons, ESC, outside release without a world action, mobile bounds, proportional scaling, live Gold/Wood/prerequisite changes and co-op hiding. Distance boundaries 159/160 pass; 161 and the former in-range 239 fail. Fixtures use the real production panel modules and bitmap kits with controlled saves and positions; these captures are isolated integration evidence rather than full-world screenshots.

![Current 0.75 desktop panel and disabled Upgrade](https://arkodia.online/building-interactions/desktop.png)

![Current 0.75 mobile panel and disabled Upgrade](https://arkodia.online/building-interactions/mobile.png)

[Native Pixi browser checks](https://arkodia.online/building-interactions/browser.json) · [Production release verification](https://arkodia.online/building-interactions/production.json)

The bounded full-world attempt reached “Preparing visibility · 1/3 ready” at 97% with no browser page errors, then hit the 60-second limit. It did not alter production saves. [World attempt diagnostics](https://arkodia.online/building-interactions/world-browser.json). The six-module physical pointer/touch fixture suite is the functional interaction evidence.
