## Photoshop-style layer panel

FX Lab stays entirely in Pixi. Layers have an eye, texture thumbnail, blue selection, drag handle, and overflow menu. Blend mode and opacity are above the list. Click a layer to select it; use **Open sprite sheet** in its context menu to edit its bound sheet.

Right-click a row or use its **⋯** menu to create a layer, rename, duplicate, delete, move up/down, show/hide, solo, or edit properties. **New layer** starts from the selected emitter's authored template with default visual settings. **Duplicate layer** also copies that layer's visual overrides. Stable custom IDs preserve independent settings. Deleting an authored layer hides it through a durable tombstone; undo restores it.

Drag **≡** to another row to reorder, with an insertion marker and edge scrolling. Drag the rest of the list to scroll. Touch cancellation leaves the document unchanged. Move up/down provides an alternative to dragging. Local drafts, undo/redo, authenticated Save, and Apply to Game include names, sources, order, and deletion. Save adopts the server-normalized document so its dirty indicator clears correctly.

New Nixie layers compile into independent emitters from their original template. Runtime Flame Fan/Rift Dash layers produce independent sprite copies through the shared gameplay/preview adapter. Original emitter indices and combat definitions remain stable.

## Verification

- `npx tsc --noEmit`
- `go test ./internal/vfx ./internal/server` (from `server`)
- `node scripts/fx-lab/verify-layer-compiler.mjs`: custom emitter compile/order/delete, immutable source, runtime sprite copies and deletion.
- `node scripts/fx-lab/verify-layer-management.mjs`: real desktop/mobile mouse operations; create, rename, duplicate, drag, delete, undo, reload, bounded menus, visibility/solo, keyboard dismissal, isolated authenticated Save/Apply, and no browser errors or HTML controls.

The browser suite uses temporary server storage and does not write production VFX settings. Screenshots and the JSON report are in this directory. References retain their original image bytes.

## Visual references and verified output

The first attachment identifies the existing FX Lab panel; the second sets the Photoshop-style direction. The implementation preserves FX Lab's timeline and Pixi workflow while adding compact image rows and complete layer management.

![Original FX Lab reference](https://arkodia.online/fx-lab/evidence/layer-management/reference-current.png)

![Photoshop layer panel reference](https://arkodia.online/fx-lab/evidence/layer-management/reference-target.png)

![Verified desktop layer panel](https://arkodia.online/fx-lab/evidence/layer-management/desktop.png)

![Verified mobile context menu](https://arkodia.online/fx-lab/evidence/layer-management/mobile-menu.png)

## Reference layout correction

The layer stack now follows the supplied Photoshop panel structure more closely: small flat tabs, phase filter and editing icons, inset blend/opacity controls, and a continuous stack with no individual button borders or gaps. Each row is 76 pixels high with a 60-pixel thumbnail using the first spritesheet frame, an unboxed visibility eye, a full-width blue selection, and right-side drag/context controls. Names keep a readable font size and truncate with an ellipsis. Playback, timeline and Save sit below the layer stack. The sidebar is wider on desktop, and the close control stays visible in portrait.

The phase filter cycles real effect phases; Properties, sprite sheet, solo, new layer and context actions remain functional Pixi controls. Context-menu rows adapt to short landscape viewports so all actions remain on screen. Validation covers continuous row geometry, control order, desktop/portrait/landscape screenshots, and all existing layer-management flows.

![Corrected desktop layout](https://arkodia.online/fx-lab/evidence/layer-management/layout-desktop.png)

![Corrected portrait layout](https://arkodia.online/fx-lab/evidence/layer-management/layout-mobile.png)

![Corrected landscape layout](https://arkodia.online/fx-lab/evidence/layer-management/layout-landscape.png)
