## Stair overlap correction

The feedback image shows the Temple staircase meeting the bordered corners of two foundation sprites. Those corner stones cross the top landing, and the two raised foundation borders create an internal seam.

The Temple now uses a single continuous podium in the same 2:1 projection, with an open 1.2-tile stair mouth. Its floor height (25.3 world pixels) and outline match the existing shared relief. Existing stairs, solid cheek walls, pillar footprints, terrain height and traversal remain intact. The original foundation asset remains available for other kit uses.

The deterministic `temple-podium.mjs` generator samples stone from the reviewed foundation and pillar artwork. The full ground-kit rebuild also invokes it. The atlas is content-addressed so its frames and pixels ship together.

Validation: TypeScript, Go simulation tests, nine browser geometry/traversal assertions, mobile 390×844 and desktop 1440×900 captures. Browser reports no page or console errors.

Evidence: `report.jpg` (human feedback), `final/` (local result), `live/` (deployed result).
