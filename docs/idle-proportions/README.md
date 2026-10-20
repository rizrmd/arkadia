## Consistent standing and walking proportions

The idle hero previously used hero-v2.png while diagonal walking used locomotion-v2.png. Those independently generated designs had different head-to-body ratios. Matching their overall height could not correct the design mismatch.

The new idle-v3.png contains four rows of six planted standing poses: front/rear knight and front/rear revenant. It was made with the built-in imagegen tool using the walking design as the identity reference. The original attack, hit and death artwork remains available. Straight up/down already shares artwork between idle and walking.

The extractor now takes diagonal idle from this new source, scales each facing as one group, keeps one ground baseline through the idle cycle, and aligns the average crown position between standing and walking. It never resizes heads per runtime frame. The common runtime scale, shared cell pivot, movement timing, direction selection and cache revisions are preserved.

### Visual evidence

![All eight character/facing comparisons at the same scale](https://arkadia-stronghold-whachat.fural.space/idle-proportions/comparison.png)

![Rendered arena](https://arkadia-stronghold-whachat.fural.space/idle-proportions/runtime.png)

![Final idle source sheet](https://arkadia-stronghold-whachat.fural.space/idle-proportions/source.png)

### Verification

Run npm run build, node scripts/verify-idle-proportions.mjs, node scripts/verify-vertical.mjs and node scripts/verify-collisions.mjs. Set DEMO_URL=https://arkadia-stronghold-whachat.fural.space/ to repeat the browser checks against the public game.

The proportion verifier reads GPU texture pixels for both characters, all four views and every idle/walking frame. It checks visible content, constant runtime scale/anchor/world position, clip coverage, crown-width agreement within 10%, total-height agreement within 5%, a stable idle crown within two atlas pixels, and average crown alignment within two atlas pixels across idle/walk. The top 10% isolates the crown before shoulders and cape; it measures silhouette agreement, not an anatomical reconstruction. The comparison image is captured from those actual GPU textures for visual review.

Local verification: production build, 200 proportion/texture checks, 65 direction/keyboard/cache checks and seven collision checks passed. Measured average crown-width ratios are 0.930–1.031 for all views; total-height ratios are 0.995–1.011. Every idle cycle has zero vertical crown drift at atlas resolution. Largest average horizontal crown shift is under one atlas pixel.

Publication overlays only the two character atlases, their manifest and this evidence onto the current canonical release. It stages small uniquely named archive parts before switching the loader, retaining unrelated Stronghold work.

### Reference and generation review

All images inspected during the task are retained here. The first generated sheet still stepped rather than standing, and was rejected. A planted standing reference then supplied the idle cycle. Targeted head-width edits were reviewed against GPU measurements before choosing the final sheet.

![Original idle identity](https://arkadia-stronghold-whachat.fural.space/idle-proportions/review/old-idle-reference.png)

![Walking identity reference](https://arkadia-stronghold-whachat.fural.space/idle-proportions/review/walking-reference.png)

![Rejected stepping variant](https://arkadia-stronghold-whachat.fural.space/idle-proportions/review/rejected-walk.png)

![Standing pose reference](https://arkadia-stronghold-whachat.fural.space/idle-proportions/review/standing-reference.png)

![First idle cycle](https://arkadia-stronghold-whachat.fural.space/idle-proportions/review/idle-first.png)

![Intermediate head correction](https://arkadia-stronghold-whachat.fural.space/idle-proportions/review/idle-wide.png)

### Original report screenshots

![Reported idle appearance](/api/organizations/ORd5dd6f99b4308d6187031557/task-attachments/TAd80a77237dcbd9abd0762211)

![Reported movement appearance](/api/organizations/ORd5dd6f99b4308d6187031557/task-attachments/TAaa10b398bc469dac1daac394)

### Generation prompts

Built-in imagegen was used throughout, with transparent_background=true. Reference sequence: locomotion-v2.png → four planted standing figures → four rows of six idle figures → localized head-width corrections. The final unmodified output is assets-src/characters/idle-v3.png.

Standing reference prompt: Create four stationary standing game sprites in a 2×2 grid on transparent background. Preserve the walking design, small helmet/skull-to-body ratio, armor and colors. Knight front/rear in the top row, revenant front/rear in the bottom row, all facing screen right in three-quarter view. Legs straight, feet planted, weapons relaxed down; no stepping, text or background.

Idle cycle prompt: Use the four standing figures exactly, preserving details and proportions. Four rows, six columns: front knight, rear knight, front skeleton, rear skeleton. All poses stand still with planted feet and straight legs. Slight chest breathing and cloth motion only; no steps, head-size changes, background, shadows or labels. Consistent scale, crown and foot baseline; isolated figures on transparent background.

Final correction prompt: Precise sprite sheet edit. Keep the entire provided four rows six columns sprite sheet exactly unchanged EXCEPT two localized corrections: row 2 rear knight helmets are too wide: reduce only helmet width about 12%, keep helmet height/position, body/cape/feet unchanged. Row 4 rear skeleton skulls are too wide: reduce only skull width about 18%, keep skull height/position, body/cape/feet unchanged. Rows 1 and 3 must remain exactly unchanged. Preserve same dimensions 1536x1024, 24 figures, transparent background, all feet planted, no new content, no shadows, no text.
