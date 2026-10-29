## Mobile sidebar performance and touch UX

Baseline: `64407ef5`. Tested with headless Chromium and SwiftShader software GPU, without CPU throttling. Handler duration measures synchronous input work; it excludes the deferred UI build and GPU presentation. This is not physical-phone latency. Three open/close cycles per viewport, twenty wheel events in one burst, layer-name selection/editor open and visibility toggle were reproduced.

| Viewport | Open/close median before → after | Scroll burst before → after | Layer/editor open before → after | Eye before → after |
|---|---:|---:|---:|---:|
| 390×844 | 52.3 → 0.7 ms | 386.1 ms → 2.7 ms | 46.9 ms → 1.4 ms | 50.1 ms → 1.2 ms |
| 844×390 | 30.1 → 0.5 ms | No visible rows → 1.0 ms | Unavailable → 0.9 ms | Unavailable → 0.7 ms |
| 1440×1000 | 78.3 → 0.6 ms | 353.3 ms → 1.5 ms | 131.4 ms → 3.9 ms | 85.0 ms → 0.8 ms |

Twenty scroll events now produce one scheduled UI build at each viewport. The baseline rebuilt and synchronously rendered the full panel for every event. The updated input path schedules and combines UI/layout work once per animation frame, skips unchanged scroll boundaries, avoids per-button full-document snapshot/serialization, reuses timeline geometry, and avoids resetting unchanged canvas sizes. Active/retained spritesheets reuse their known grid rather than rescanning all pixels. Texture retirement waits until displayed sprites have been replaced.

The updated portrait scheduled build maximum was 53.8 ms; landscape/desktop cumulative build maxima reached 829/949.7 ms after resizes in this software-rendered environment. Median sampled frame interval after the interaction sequence was about 16.7 ms at all three sizes, but worst gaps remained 650/100/1517 ms. Before gaps were 1067/100/2533 ms, with medians 16.7/66.6/166.6 ms. These short noisy samples include asynchronous preview work and do not prove a stable FPS or a physical-device improvement. GPU/preview stalls remain outside the optimized handler path.

## Navigation and preserved behavior

Compact screens (<900 px wide) use Layers, Properties, Playback and View tabs. Save draft and Apply saved stay pinned and separate, with an asterisk for pending state. Touch controls are 44 px high; layer eyes are 44×44 px and rows are spaced 50 px apart. Playback can scroll in short landscape viewports to reach history controls. A scroll thumb indicates additional layer/property content. Desktop retains the full toolbar layout.

Tap a layer name to select it and open its bound Spritesheet Editor. Eye taps change visibility only. Dragging the list cancels taps and does not change the document. Per-layer sheet drafts, asset Save/Use, visual Save/Apply, authentication, hero/skill selectors, preview, movement and zoom remain available.

## Validation

- TypeScript passed. Publisher runs Vite and Go release checks.
- Isolated temporary server/storage: layer sheet FPS edit, asset Save/Use, draft Save then Apply, visibility-only eye, per-layer draft restored on mobile, close, and no JavaScript errors passed. Production writes were not used.
- Real CDP touch events at 390×844 and 844×390: open/close, tab navigation, drag without accidental editing, eye, layer sheet and reachable history controls passed.
- Existing mobile movement suite passed: movement/facing/release, hero selection, pinch zoom, desktop keyboard, Pixi-only controls.
- Desktop 1440×1000 profiled and covered by the layer-sheet/persistence regression.

## Evidence

Raw measurements: `before/measurements.json`, `after/measurements.json`. Responsive screenshots: `touch/390-layers.png`, `touch/844-layers.png`, and `after/1440.png`. No managed browser tool was exposed in this session; repository Playwright/Chromium was used. Real phones were not tested.
