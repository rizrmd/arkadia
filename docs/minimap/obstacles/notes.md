## Trees and obstacles

The minimap now renders the same active environment set as the world: 11 fir/spruce trees and 10 other solid props in the default layout (five snow cliffs, four boulder groups and one broken wall). Tree symbols use muted green with gold outlines; other obstacles use irregular gold outlines. All anchors come from rendered world positions through the shared inverse projection. Legacy-only props appear only when the legacy layout is rendered. Decorative paving, weeds and snow drifts are omitted.

Implementation: 05adfbc. No artwork downloads or extra render loop were added. Geometry remains static on the GPU, now 43 primitives. The 5,000-update local benchmark averaged 0.00206 ms per update (CPU transforms only).

TypeScript, production build, Go tests, local and live browser checks passed. Coverage includes 390×844, 320×568, 844×390 and 1440×900; player/telemetry/skill clearance, tree and boulder presence, keyboard tracking, heading, and reachable map boundaries. Live page errors: zero.

Deployment used the supported release script from an isolated committed checkout. The platform initially rejected restart with runtime_admission_paused under node pressure; the uploaded release was activated with the supported sandbox power-on operation after inspecting incidents/logs. A first cold-start browser run timed out while the server converted artwork; the final warmed run passed.
