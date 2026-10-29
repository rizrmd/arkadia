## Generated Settings artwork revision

User request: generate proper game-style artwork before implementation, ensure desktop Escape opens Settings, and omit slot 1/2/3 customization on mobile.

Built-in imagegen produced a transparent charcoal-leather/aged-brass panel and blank beveled button, using Inventory as material reference. Sources and prompt descriptions: assets-src/ui/settings/v2/README.md, panel.png and button.png. Runtime lossless WebP textures are under public/ui/settings/v2. Pixi nine-slice sprites preserve corners, with warm gold slider accents and the game's existing MsdfText/Cinzel/EB Garamond typography. Existing gold gear/music/speaker assets remain in use.

Desktop keeps saved keybinding controls. Mobile portrait/landscape omits the entire shortcut section and reset-shortcuts button; resizing into mobile cancels active capture without changing saved desktop bindings. Mobile touch skills remain available. Escape opens/closes Settings on desktop when another modal does not own input.

## Acceptance

Full local functional suite passed at 1440×900, 390×844, 844×390 and 320×568: real quality/FPS/audio/preferences, solo pause, modal exclusion, binding input/HUD/persistence, touch skills, mobile omission, cancellation and safe progression reset. After font integration review, the focused artwork verifier passed all four sizes locally and publicly, including Escape opening/closing, gold/ivory HUD text roles, native generated sprites, desktop bindings/defaults, mobile absence, switches, reset cancellation and Resume. Zero page errors.

TypeScript, production Vite, settings/inventory/progression/gameplay tests, all Go packages and actual co-op smoke passed. Final runtime: 9b5d1fd8. Public release checks matched 43 hashes, including both new generated textures. Supported layer: 1793081149793-settings-pixi-9b5d1fd8-b996eb825fd9.

Cumulative release retains latest shared 19de65a6, gate/HUD changes, persistence, cliff and navigation fixes. Mobile checks use browser touch emulation. Earlier diagnostic dark-text screenshots are explicitly pre-correction; local/live menu screenshots show the corrected HUD text shader. Original delivery evidence remains in docs/settings-pixi.
