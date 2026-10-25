## Audio migration acceptance

Runtime commit: 7701746e. Published to https://ark-whachat.fural.space through the committed `scripts/fural-deploy.sh` from an isolated release checkout, excluding shared-clone WIP. Release layer: `1792941820197-game-7701746e-6c6338e07985`. Health endpoint succeeded.

The reported hum came from three indefinitely running sine oscillators at 110, 164.81 and 220 Hz. These are removed. @pixi/sound 6.0.1 supports the existing Pixi 8 dependency. Music preference remains independent, with no music asset or replacement drone. Skill sound is an original CC0 220 ms cached WAV, with explicit non-looping playback, three-voice maximum and 90 ms duplicate suppression. Gesture unlock retries; hidden tabs stop stale cues; disposal removes owned sounds and listeners.

Validation: TypeScript; production Vite build; shadow renderer regression checks (49,358 samples and 47,683 field checks); Go tests; co-op smoke and release asset crawl through the standard pipeline. Local Chromium desktop and mobile emulation checked unlock, preload, spam suppression (24/25 requests dropped), finite completion, independent settings, mute, visibility cleanup and disposal. Both created zero oscillators. See local-verification.json.

Live desktop (1280×800) and mobile touch emulation (390×844) loaded actual gameplay, unlocked Pixi Sound, ran an automatic combat encounter and recorded one sound cue each, returning to zero voices with no audio load errors or oscillator creation. See live-verification.json. These are automated browser checks, not physical iOS/Android listening tests.

Live verification found the release asset collector omitted `full-gateway-v7-sheet.json`, preventing game initialization. The collector now explicitly includes it. Supported corrective layer `1792942278696-audio-release-gateway-manifest-b7f0193cc530` published the tracked manifest; subsequent gameplay checks passed.
