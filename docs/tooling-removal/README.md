## Removed tooling

Removed the developer catalog, environment map editor, sprite/animation players, 3D hero lab UI, modular environment editor, standalone VFX players, typography sample and public asset review pages. Retired build, publish and Knowledge embed generators were removed or disconnected. Gameplay renderer libraries and production art remain available.

Environment draft/publish HTTP routes return 410. Published maps and historical revisions remain readable; existing saves, drafts and map files are retained. Cumulative layers are scrubbed of obsolete HTML and standalone JavaScript entry points on application.

## Validation

TypeScript, Vite, Go tests, Core save compatibility and progression tests pass. The built-game browser check reaches gameplay with 71 effects ready, 15 textures uploaded, no early world draws and no browser errors. Pixi modules share one chunk to avoid circular initialization after removing the developer catalog. Release lifecycle tests cover uninterrupted service, save flushing and corrupt archive handling. Knowledge audit covers 225 pages including the design canvas; cleaned page titles are in knowledge-cleanup.json.
