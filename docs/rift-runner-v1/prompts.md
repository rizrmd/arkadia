## Method and shared specification

Built-in image_gen.imagegen, transparent_background true. Reference: inspected original concept PNG DA66f49939f6e26121844a0957. No fallback CLI/API.

Use case stylized-concept. Rift Runner: teal hood, rust scarf, charcoal pants, leather boots, single cyan anatomical LEFT forearm emitter. Painterly compact whole-body game sprites. Orthographic camera 30 degrees overhead, equal cells, consistent scale and ground pivot, ample margins. Transparent alpha; no scene, floor, shadow, text or grid. Body sheets exclude separate VFX.

Two sheets per body action: rows N/back screen up, NE/back-right upper right, E/right profile, SE/front-right lower right; then S/front down, SW/front-left lower left, W/left profile, NW/back-left upper left. Four columns idle; six all other body actions.

## Action prompt set

- Idle: subtle breathing and scarf motion; planted feet; seamless loop.
- Run: left contact, down, passing, right contact, down, passing; opposite arm swing, airborne phases, trailing scarf.
- Pulse Shot: ready, crouch and draw emitter back, aim and shift weight, extend emitter/recoil, lower arm, ready.
- Phase Dash: ready, launch crouch, push-off, stretched airborne dash, landing/braking crouch, ready.
- Rift Trap: ready, bend knees, kneel/reach, emitter palm ground contact, rise, ready.
- Overdrive: ready, crouch/clench fists, rise/spread arms, planted activation apex, settle, ready.

## Separate effects

Transparent cyan crystal VFX only, white cores, fixed origin, equal cells, huge clear gutters.

- Projectile: two 4 × 4 atlases, eight direction rows; charge seed, pointed traveling bolt/tail, compact impact, fading shards.
- Afterimage: two 4 × 4 atlases, eight direction rows; purely cyan spectral runner, apparition, stretched ghost, streak breakup, fading fragments. No opaque rust-red body.
- Trap: 6 × 2 chronological atlas; seed, expanding ellipse, forming rift, open trap, inward wisps, vortex, charged core, rising spike, burst, fragments, wisps, particles.
- Aura: 6 × 2 chronological atlas; rune, charge wisps, rising energy, growing ring, activation burst, tall aura, three sustain orbit frames, contraction, fade wisps, particles. Empty center for separately composited hero.

## Corrections

West idle: explicitly forbid all right-facing figures; nose/toes lower left for SW, left profile W, upper left back NW. Four breathing frames. Preserve emitter anatomy without mirroring.

West Overdrive: explicitly maintain left profile through arms spreading and apex. Same directions and six phases.

North skills: 6 × 3 atlas, strict straight-up back view, horizontal back shoulders, no face or diagonal turn. Rows Pulse Shot, Dash, Trap. Pulse/Dash selected; Trap rejected for raised hand.

Generation IDs and selection provenance are in `generation.json`. Prompts request constraints; the pixel audit and playback review determine which constraints were met.
