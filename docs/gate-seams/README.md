The terminal foreground wall wings now keep the same 356 px sprite width as the other wall segments. Previously, scaling them to 270 px reduced their height and masonry size, exposing their end caps beside the gate. Their existing inward placement now lets the full-size end caps overlap behind the gate towers while keeping the doorway clear.

Verified with the TypeScript/Vite production build, bidirectional gate traversal and tower collision checks, all 16 stable animation poses, and a browser capture of the assembled wall joins. No gateway sprite or animation changes are needed.

Reference: reference.png. Local captures: before.png and after.png. Reproduce with `node scripts/verify-gate-seams.mjs`; set DEMO_URL for a deployed capture.


## Gateway ground transition

The lower tower bases now share the walls’ soil, moss and feathered snow transition. The cached foundation face is composited into every animated gate frame before ambient lighting, while the ground dressing remains on the static surface. The central approach is excluded. Snow uses soft radial falloff rather than flattened rectangular decals. No sprite asset changes are required.

Reference: gradient-reference.png. Local result: gradient-local.png. Build, two-way passage, tower collision and mobile animation/reversal checks passed; animation did not rebuild the world, lighting or shadows.
