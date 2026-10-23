## Player portrait and status bars

The live game console follows the supplied reference: circular gold portrait bezel, lower-left level badge, ivory hero name, and separate slanted HP (red), GATE (cyan), and XP (gold) meters. Each meter has its own icon, English label, numeric current/maximum value and faceted fill. XP includes progression ticks. Both Ember Warden and Rift Runner reuse their existing high-resolution portrait artwork.

The implementation uses Pixi vector geometry and live MSDF text rather than flattening the whole HUD into one image. Fills clamp to the track, preserve the empty background at zero, and remain correct after changing heroes or resizing. The mobile console scales down to leave space for the top-right status UI.

Validation: production TypeScript/Vite build; browser checks at 1440×900, 390×844, 844×390, then back to desktop; both heroes; level 12; empty, partial, full and over-maximum values. No browser JavaScript errors. See verification.json and screenshots in this folder.

Run `node scripts/verify-player-console.mjs` to reproduce the browser checks.
