## Native Pixi Settings and equipped shortcuts

Shipped at https://ark-whachat.fural.space. Settings, controls, focus, scrolling and progression confirmation render inside Pixi. Generated gold artwork, quality, frame-rate, independent audio, shake and FPS preferences remain intact. Escape opens/closes Settings when no other modal owns input. Solo simulation pauses; controls redraw explicitly.

Equipped-slot shortcuts default to 1/2/3. Select a slot and press one physical letter/number key. Movement, I/K/M, navigation/browser keys, modifiers and duplicates are rejected. Escape/blur/close safely cancel capture. HUD labels and actual slot input update together; preferences persist separately in arkodia.skill-bindings.v1 and survive progression reset. Numbered blessing choices and touch skills retain their behavior.

## Verification

- TypeScript, production Vite build, settings/bindings/reset, inventory, progression, gameplay persistence, all Go packages and real co-op smoke passed.
- Combined local and public behavior at 1440×900, 390×844, 844×390 and 320×568: native controls, slider drag, cadence settings, independent audio, FPS/shake, frozen solo state, modal exclusion, keyboard focus, rejected/cancelled capture, immediate HUD labels, replacement gameplay shortcuts, reload/page reopen, mobile skill taps, reset-defaults, reset cancellation and explicit reset preserving preferences/unrelated data. Zero page errors. Public functional release: f2fd319f.
- Narrow-screen visual review found wrapped reset captions. A text-sizing-only follow-up, 79e93479, passed public layout checks on all four sizes: button captions fit hitboxes and confirmation title clears content. All 41 final compiled hashes match; server build matches the release and retains hill-foot-contour-v1.
- Persistence 1211cac0, cliff ba1be25b/d775613a and latest baseline 21c29725 are retained. Existing gateway GAME_SAVE_DIR and lifetime save/reset ownership remain in use. Test corruption fixtures use a separate directory to avoid asynchronous room writers racing the assertion.
- Mobile verification uses browser touch emulation, not physical-device testing. Audio checks cover stored volume and engine gain state, not physical-speaker listening.

## Evidence

live-results.json records functional acceptance. final-layout.json and final-*.png record corrected live layouts. release-verification.json records final compiled hashes. Older local-failure/resize diagnostic images are historical diagnostics, not current UI.

The additive client/server archive uses scripts/settings-pixi/deploy.sh and the supported scripts/arkodia/publish-layer.mjs. Cross-member peer-process checks supplement the local flock; the release waits for peer acceptance and verifies deployed ancestry/gateway before publication.
