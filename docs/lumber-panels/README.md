## Lumber Mill build and upgrade panels

Pixi-only, image-backed panels for Build 1 and Upgrade 1→2 through 29→30. Costs and duration come directly from the published Lumber Mill Knowledge baselines (75 Gold, 40 Logs, 1 minute; 1.25 cost growth, 1.20 timer growth, ceil from baseline).

The requirements section has one row only: Stronghold Core level X for target X. Only completed Core levels count. Queue, ownership, placement and spending validation are not additional displayed building requirements. No economy, timer, save migration or purchase behavior is added.

Find Lumber Mill beside the Core's proximity hammer. PREV/NEXT browse target recipes without changing completed levels. Return to current resets preview. Escape, leaving range or co-op closes/hides the panel. Level 30 has no next operation.

Existing saves default to Not Built; optional lumberMill.completedLevel is read only and checked within 0–30. No storage writes. The Lumber Mill world building is not granted or mapped into legacy building IDs. Transactions and persistent construction timers remain unreleased, and all operation buttons are disabled with an explanation.

### Bitmap assets

One new Lumber Mill emblem was generated with built-in imagegen. Original RGBA PNG retained; runtime version only trims alpha margins and downsamples. Shared ornaments, background, icons and button states reuse the Core peer's separately generated kit. The source ZIP includes both sets; manifest and prompt are in /lumber-panels/kit/. No decorative procedural replacements.

### Validation

TypeScript; all 30 catalog recipes; Core below/equal/above target; completed-level-only save metadata; maximum level; desktop/mobile Pixi pointer open, Escape, proximity, co-op hide, preview controls and screenshot coverage for all targets. See coverage.json, browser.json, coverage.png and target-01.png through target-30.png.
