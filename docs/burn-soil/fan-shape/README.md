## Cast-origin fan correction

The Pixi flipbook previously placed Burn Soil in an ellipse around targets. It now fills a cast-origin fan, shares the flame sheet's 0.30 rad direction, uses its 395-unit forward extent and 120-unit ground half-height, and inherits the existing hand-relative two-thirds x contraction. The 54-degree sector parameter is projected onto the authored floor plane. Ground embers and tiny flames are clipped to the same outline. The raised flame curls and original ignition are unchanged.

Gameplay already used the authoritative 108-degree cast-origin sector, range, aim, wall rays and object mask. That cached sector is retained. Both gameplay and preview now fade the complete soil layer linearly from 1 to 0 over its one-second lifetime.

Lv.1–2 remain initial-only. Lv.3–5 schedule five events at +200/400/600/800/1000ms; the final event precedes expiry. Tick damage remains explicitly unset, with no extra HP mutation.

Local verification: TypeScript, production preview build, 35 cadence cases; actual gameplay module checks at 1440×900 and 390×844 across all five levels and five directions; preview shape/fade and cross-origin iframe at desktop/phone sizes. `before-*` captures are the original public runtime before this correction. `local-*` are the corrected compiled runtime. `live-*` will be public-runtime verification after release.

The first comparison fixture failed when single-process Chromium opened a page after closing its last context; reusing one page resolved it. A combined preview/game command exceeded 200s. Separate phone (59s) and desktop (110s) gameplay assertion runs passed. Controlled-gameplay screenshots were separated from assertions; live screenshots use the normal runtime. No browser clock hook is deployed. These are Chromium viewport checks, not physical-device performance measurements.

## Live verification

Implementation release `13fe8998` is public. The live preview passes shape, direction, retained reach, continuous fade, desktop/phone and cross-origin iframe checks. The unmodified game passes five events, no unapproved HP mutation and expiry on desktop and phone. Its late-lifetime opacity is approximately 0.13 at age 0.87s; the normal screenshot API may capture after expiry, so the phone capture fixture now pauses the browser debugger only to capture the already presented frame. Late gameplay ground is deliberately faint on bright snow; the isolated preview is the clearer shape evidence. No gameplay clock hook ships.
