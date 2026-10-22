The terminal foreground wall wings now keep the same 356 px sprite width as the other wall segments. Previously, scaling them to 270 px reduced their height and masonry size, exposing their end caps beside the gate. Their existing inward placement now lets the full-size end caps overlap behind the gate towers while keeping the doorway clear.

Verified with the TypeScript/Vite production build, bidirectional gate traversal and tower collision checks, all 16 stable animation poses, and a browser capture of the assembled wall joins. No gateway sprite or animation changes are needed.

Reference: reference.png. Local captures: before.png and after.png. Reproduce with `node scripts/verify-gate-seams.mjs`; set DEMO_URL for a deployed capture.
