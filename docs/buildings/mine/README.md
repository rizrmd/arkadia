## Mine painted asset delivery

Seven imagegen milestone masters at 1, 5, 10, 15, 20, 25 and 30, one imagegen repair strap and a 30-row composition manifest. Review at https://arkodia.online/sprite-player/mine/ . Sources: assets-src/buildings/mine/painted; runtime files: public/buildings/mine/painted.

Canvas 1254 × 1254, 8-bit RGBA PNG, sRGB. Pivot (627,1130), normalized anchor (0.5,0.9011164274). Proposed reserved integration footprint 6 × 5 m, consistent for every level, with 1.5 m clear approach along rails toward screen bottom-right. These are art integration targets, not changes to existing collision. Orthographic target 45° azimuth, 30° elevation. Do not independently trim, fit, rescale or recenter variants. Minor generated contour differences remain visual only.

Use Pixi normal alpha loading, linear filtering, identical world scale and pivot-based depth sorting. Materials and shadows are baked; avoid a second contact shadow. No PBR or model export settings apply. Retain originals; any runtime atlas must preserve pivot and padding. Single sprites do not provide interior occlusion masks: integration must retain existing blockers and routes and validate hero depth ordering; roof splitting is separate work if required.

Mine produces base Gold under the published specification. This package grants no resource rate, collection, upgrade, passive income or other gameplay. Tools, pulley and ore bins are cosmetic. Core level 3 remains a design prerequisite. Human art approval is separate from technical validation.

Run node assets-src/buildings/mine/painted/package.mjs, then node assets-src/buildings/mine/painted/verify.mjs. Installed Playwright Chromium/SwiftShader is the alternate validation path when managed browser tools are unavailable. All viewer controls and English labels render in Pixi.
