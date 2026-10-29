## Approved starter component integration

The approved starter-components sheet supplies every runtime pixel. Original discussion master, extracted sheet, imagegen cutout, approved concept, and extraction prompt are preserved in `assets-src/starter-boundary`. The original RGB channels can look brown when alpha is ignored; alpha-zero pixels are transparent. The blue composite confirms the cutout.

Sixteen individual sprites are exported: four straight variants, four corner variants, frame, two leaves, threshold, two broken runs, debris and endcap. The Starter category in the Pixi editor exposes these plus assembled closed/open gate previews. The assembled gameplay gate uses sixteen hinged poses made from the approved leaves, with the same frame and anchor throughout.

The previous 320-unit palisade registration is retired. Each straight variant has measured source contacts. Four pieces fit each existing court side; front runs terminate at the gate's two returns. Runtime widths and affine transforms follow those contacts. Low boundary collision is continuous between contacts, regardless of sparse timber or transparent holes. No economy recipe, saved building record or higher-tier artwork was changed.

The game and editor share geometry. Pixi's skew matrix is compensated so its actual coefficients equal the game's canvas affine transform; the browser fixture checks those coefficients. The gate retains the existing authoritative passage and timing contract, including passability at frame 12/16. The obsolete castle apron is removed from the starter rendering.

Co-op navigation replaces the obsolete enclosure portion of the last committed nav snapshot and preserves all 1,344 unrelated columns byte-for-byte. Client and embedded server nav files match. The compound Stronghold editor asset and the embedded server asset catalog are regenerated from that data.

## Verification

- `node scripts/starter-boundary/export.mjs`: reproducible isolation and gate poses.
- `node scripts/starter-boundary/navigation.mjs`: scoped nav update with historical signature/count guards.
- `node scripts/starter-boundary/catalog.mjs`: game/editor and client/server asset registry parity.
- `node scripts/starter-boundary/test.mjs`: transformed endpoints, joins, full boundary columns, alpha, palette and opening pixels.
- `node scripts/starter-boundary/editor.mjs`: real Pixi placement, duplicate/remove/undo/redo; authenticated isolated draft save/load/publish/reload; desktop/mobile; actual matrix parity. Requires a locally built test server at `$HOME/releases/starter-boundary-editor-server`.
- `node scripts/starter-boundary/browser.mjs`: isolated offline gameplay storage; closed/open threshold collision, actual player crossing, reclosing, movement, visible sprite/GPU agreement and mobile resize.
- `node scripts/building-tree/test.mjs`: construction, resource charges, unlocks and save regressions.
- `go -C server test ./...` and TypeScript/game/editor builds.

Reports and screenshots in this folder are actual executed evidence. The first legacy fixture startup timed out; real-time 2D validation succeeded. Test saves and map publishing used a temporary server, never the production map. Release builds use a separate checkout so unrelated workspace changes are excluded. Deployment uses the existing Arkodia lock, cumulative production ancestry guard and normal release-layer publisher.
