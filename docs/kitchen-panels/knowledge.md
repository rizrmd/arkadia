## Overview

Kitchen stores hunted Food from Deer and Crocodiles. Its existing benefit is Food storage, with no new cooking or passive-production mechanic. Completed levels run from 1 through 30; one Kitchen is allowed per solo base.

## Build and Upgrade Interaction

Near the Stronghold Core in solo mode, select the Kitchen hammer badge. The native Pixi panel shows Build Level 1 when Kitchen is unbuilt, then one upgrade at a time through 29→30. At completed level 30 it shows Maximum level. PREV and NEXT browse all 30 target recipes; Return to current restores the saved operation. Browsing never changes saved levels or balances. The shared building-interaction registry hides and disables other building badges while a panel is open. The Kitchen badge sits on a second row to remain reachable on narrow screens. Escape, the close control, leaving range, or entering co-op closes/hides the interaction.

For target Kitchen level X, the Requirements section contains exactly two building rows:

- **Stronghold Core level X** — completed Core must be at least X.
- **Farm level X** — completed Farm must be at least X.

Both must already be completed. Active upgrade target levels do not count. Build 1 requires completed Core 1 and Farm 1; upgrade 2 requires Core 2 and Farm 2; the same rule continues through 30. Green checks indicate satisfied rows. Gold and Wood are shown separately under Resource Cost; time appears separately under Build Time or Upgrade Time. No implicit extra prerequisite rows are displayed.

**Current implementation:** this release provides the image-backed panels, recipe inspection, prerequisite evaluation, and target navigation. Build/Upgrade actions remain unavailable because the shared construction queue and persistent timers are not implemented. It does not deduct resources, grant buildings, start timers, or change saves. Satisfying both displayed building prerequisites does not enable a transaction. Existing ownership, solo-mode, queue, storage, placement and transaction policies remain specified by Base Building for future execution.

## Economy

Preserved published Kitchen baseline: **75 Gold, 40 Wood (Log), 1 real minute**. For target X, Gold = ceil(75 × 1.25^(X−1)), Wood = ceil(40 × 1.25^(X−1)), duration = ceil(1 × 1.20^(X−1)) minutes. Compute directly from unrounded baselines; prices are per operation and timers have no cap. Food, Mana and Soul Shards are not construction costs.

| Target | Operation | Gold | Wood | Minutes | Completed Core | Completed Farm |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Build 1 | 75 | 40 | 1 | ≥1 | ≥1 |
| 2 | Upgrade 1→2 | 94 | 50 | 2 | ≥2 | ≥2 |
| 3 | Upgrade 2→3 | 118 | 63 | 2 | ≥3 | ≥3 |
| 4 | Upgrade 3→4 | 147 | 79 | 2 | ≥4 | ≥4 |
| 5 | Upgrade 4→5 | 184 | 98 | 3 | ≥5 | ≥5 |
| 6 | Upgrade 5→6 | 229 | 123 | 3 | ≥6 | ≥6 |
| 7 | Upgrade 6→7 | 287 | 153 | 3 | ≥7 | ≥7 |
| 8 | Upgrade 7→8 | 358 | 191 | 4 | ≥8 | ≥8 |
| 9 | Upgrade 8→9 | 448 | 239 | 5 | ≥9 | ≥9 |
| 10 | Upgrade 9→10 | 559 | 299 | 6 | ≥10 | ≥10 |
| 11 | Upgrade 10→11 | 699 | 373 | 7 | ≥11 | ≥11 |
| 12 | Upgrade 11→12 | 874 | 466 | 8 | ≥12 | ≥12 |
| 13 | Upgrade 12→13 | 1,092 | 583 | 9 | ≥13 | ≥13 |
| 14 | Upgrade 13→14 | 1,365 | 728 | 11 | ≥14 | ≥14 |
| 15 | Upgrade 14→15 | 1,706 | 910 | 13 | ≥15 | ≥15 |
| 16 | Upgrade 15→16 | 2,132 | 1,137 | 16 | ≥16 | ≥16 |
| 17 | Upgrade 16→17 | 2,665 | 1,422 | 19 | ≥17 | ≥17 |
| 18 | Upgrade 17→18 | 3,331 | 1,777 | 23 | ≥18 | ≥18 |
| 19 | Upgrade 18→19 | 4,164 | 2,221 | 27 | ≥19 | ≥19 |
| 20 | Upgrade 19→20 | 5,205 | 2,776 | 32 | ≥20 | ≥20 |
| 21 | Upgrade 20→21 | 6,506 | 3,470 | 39 | ≥21 | ≥21 |
| 22 | Upgrade 21→22 | 8,132 | 4,337 | 47 | ≥22 | ≥22 |
| 23 | Upgrade 22→23 | 10,165 | 5,422 | 56 | ≥23 | ≥23 |
| 24 | Upgrade 23→24 | 12,706 | 6,777 | 67 | ≥24 | ≥24 |
| 25 | Upgrade 24→25 | 15,882 | 8,471 | 80 | ≥25 | ≥25 |
| 26 | Upgrade 25→26 | 19,853 | 10,588 | 96 | ≥26 | ≥26 |
| 27 | Upgrade 26→27 | 24,816 | 13,235 | 115 | ≥27 | ≥27 |
| 28 | Upgrade 27→28 | 31,020 | 16,544 | 138 | ≥28 | ≥28 |
| 29 | Upgrade 28→29 | 38,775 | 20,680 | 165 | ≥29 | ≥29 |
| 30 | Upgrade 29→30 | 48,468 | 25,850 | 198 | ≥30 | ≥30 |

## Existing completed-level benefits

These are the established balancing specification; panel browsing does not grant them. Food storage = 1,000 + 50 × (L−1); maximum HP = 500 + 50 × (L−1). Level 1 has 1,000 storage and 500 HP; level 30 has 2,450 storage and 1,950 HP. No hero combat bonus or new production output is introduced.

## Bitmap asset kit and Pixi composition

The Kitchen pantry icon was generated using the built-in imagegen tool. The original transparent PNG is preserved; the runtime copy only trims transparent margins and downsamples. Gold-charcoal frame, texture, hammer badge, header, divider, green check, Gold, Wood, clock and button states reuse the separately imagegen-generated Core kit. English titles, target levels, prerequisite states, costs, duration and controls are rendered dynamically by Pixi MSDF text. No HTML/React game UI, GLB, or 3D substitute is used.

[Original PNG source archive](https://arkodia.online/kitchen-panels/kit/source-kit.zip) · [Kitchen manifest](https://arkodia.online/kitchen-panels/kit/manifest.json) · [Generation prompt](https://arkodia.online/kitchen-panels/kit/prompts.md)

![Kitchen original imagegen pantry icon](https://arkodia.online/kitchen-panels/kit/kitchen-original.png)

![Shared imagegen Core bitmap kit](https://arkodia.online/core-upgrade/kit/contact-sheet.png)

## Current panel gallery

![Kitchen build level 1 desktop](https://arkodia.online/kitchen-panels/pixi-desktop.png)

![Kitchen build level 1 mobile](https://arkodia.online/kitchen-panels/pixi-mobile.png)

![Kitchen upgrade level 1 to 2](https://arkodia.online/kitchen-panels/target-02.png)

![Kitchen upgrade level 14 to 15](https://arkodia.online/kitchen-panels/target-15.png)

![Kitchen upgrade level 29 to 30](https://arkodia.online/kitchen-panels/target-30.png)

## Validation

Recipe checks cover all 30 targets, both independent prerequisite boundaries, maximum level, malformed completed-level metadata and active-timer exclusion. Chromium renders all 30 target panels with zero page errors and verifies pointer opening, target browsing/reset without changing saved level, Escape, range/co-op hiding, and mobile bounds. The 390px-wide mobile viewport contains the 366px-wide panel. TypeScript passes.

Current verified live release: `7b6c3851cde1cb8531ad419e2d469c14eb3537c5`. Health is OK. Forty-two production checks confirm all 30 Kitchen target captures and icon/mobile visible pixels, exact original source ZIP, peer archives and Core manifest, the current deployed entry point and compiled bundle, all six building panel integrations, and preserved retired-editor redirects. The verifier accepts a later cumulative release only when its Git ancestry includes the Kitchen release and its manifest matches the current healthy build.

[Production verification](https://arkodia.online/kitchen-panels/production.json) · [Browser checks](https://arkodia.online/kitchen-panels/browser.json) · [Release manifest](https://arkodia.online/kitchen-panels/release.json)
