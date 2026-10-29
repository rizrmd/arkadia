## Main Hall at first spawn

Replaces the initial fortress tent with the existing imagegen Main Hall v3 from task #EACSA, retaining its exact PNG bytes. The visual uses the existing `expedition` save ID and actions. No stat bonuses, unlocks, career tree, save migration, or Stronghold Core changes are included.

Placement: world (577, 320), width 300, pivot 0.95, original isometric artwork with no additional shear or vertical stretch. Hero spawn remains (590, 420). The editor base preview uses the same art and scale. Tent-only shadow geometry is removed so the Hall uses ordinary building silhouettes.

Fresh and existing saves pass browser checks with the published environment revision 3 snapshot. Existing resources, level 3 expedition and reward ledger survive unchanged; an overlapping old position recovers to the safe spawn. Trusted keyboard input moves 106 pixels toward the exit. Collision columns leave the entire spawn-to-gateway approach clear.

The general nav exporter produced unrelated world-column differences, caught by the revenant navigation server test. Only the original tent column group is replaced (60 columns by 82); all other shipped nav columns remain identical and client/server copies match. All Go server tests pass after this targeted patch. TypeScript and Vite production build pass.

Browser diagnostics: standalone Vite needs the published environment API; local server absence and Node TLS failure were bypassed with a read-only curl snapshot. Resource load is checked from successful HTTP responses. Single-process Chromium cannot reliably create a second context after closing the first, so each test scenario uses a separate browser. Screenshot capture timed out; functional validation completes without it.

Validation: `node scripts/main-hall-spawn-verify.mjs`. Results in `validation.json`; collision patch provenance in `nav-patch.json`. Shared peer worktrees are unchanged.

## Production release

Gameplay commit `318074ac506f503440bd5e1eea7c122d74a88701` is pushed on `feat/main-hall-spawn` and live at https://arkodia.online. Supported `scripts/fural-deploy.sh` published layer `1793173189512-game-318074ac-88bd2b1d56a9` under the existing deployment lock, applied without sandbox restart. Health and public release manifest confirm this exact commit. The existing lossless WebP cache preserves every alpha value and every visible RGB pixel of the v3 PNG. Published environment data remains byte-equivalent as parsed JSON, revision 3. The release retains the existing save directory and cumulative shipped features.
