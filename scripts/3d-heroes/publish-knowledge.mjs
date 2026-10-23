import { execFileSync } from 'node:child_process';

const PROJECT = 'PJ8758f22f61165f3d3215e454';
const ORG = 'ORd5dd6f99b4308d6187031557';
const REPO = 'RPe11327fbfe413dbeba246526';
const DOC_3D_ID = 'NKBD436f6ea332eacd3db9387f42';

const repoLink = (label, relPath) =>
  `[${label}](/organizations/${ORG}/repositories/${REPO}/files?file=${encodeURIComponent(relPath)})`;

const markdown = `## Real-Time 60 FPS WebGL 3D Hero & Animation Player

<iframe src="https://ark-whachat.fural.space/3d-hero-lab/index.html?embed=1&clip=run&dir=SE" title="Arkadia Real-Time 60 FPS 3D Hero & Animation Lab — Rift Runner (Meshy t2.5)" height="680"></iframe>

- **Live 60 FPS WebGL Studio**: [https://ark-whachat.fural.space/3d-hero-lab/](https://ark-whachat.fural.space/3d-hero-lab/)
- **Direct 60 FPS WebGL Presets**:
  - [Run (60 FPS Isometric SE)](https://ark-whachat.fural.space/3d-hero-lab/?clip=run&dir=SE) · [Walk (60 FPS Isometric E)](https://ark-whachat.fural.space/3d-hero-lab/?clip=walk&dir=E) · [Idle (60 FPS Isometric S)](https://ark-whachat.fural.space/3d-hero-lab/?clip=idle&dir=S)
  - [Attack (60 FPS Isometric N)](https://ark-whachat.fural.space/3d-hero-lab/?clip=attack&dir=N) · [Rift Bolt Cast (60 FPS Isometric SW)](https://ark-whachat.fural.space/3d-hero-lab/?clip=cast&dir=SW)
  - [Hit Reaction (60 FPS)](https://ark-whachat.fural.space/3d-hero-lab/?clip=hit&dir=SE) · [Death (60 FPS)](https://ark-whachat.fural.space/3d-hero-lab/?clip=death&dir=SE) · [15k-Tri Smart Topology Wireframe (60 FPS 360° Turntable)](https://ark-whachat.fural.space/3d-hero-lab/?clip=run&style=wireframe&turntable=1)
- **Unified Runtime Asset**: ${repoLink('rift-runner.glb', 'public/assets/characters/3d/rift-runner.glb')} (\`2,389.3 KB\`, 15,000-triangle Smart Topology mesh + 26-bone humanoid skeleton + 3 PBR textures + 7 skeletal animation clips)
- **Runtime Code & Manifest**: ${repoLink('hero-3d.ts', 'src/stronghold/hero-3d.ts')} · ${repoLink('hero.ts', 'src/stronghold/hero.ts')} · ${repoLink('3d-hero-lab/index.html', 'public/3d-hero-lab/index.html')} · ${repoLink('manifest.json', 'public/assets/characters/3d/manifest.json')}
- **Pipeline Scripts**: ${repoLink('run-meshy-pipeline.mjs', 'scripts/3d-heroes/run-meshy-pipeline.mjs')} · ${repoLink('merge-and-optimize-glb.mjs', 'scripts/3d-heroes/merge-and-optimize-glb.mjs')} · ${repoLink('publish-layer.mjs', 'scripts/3d-heroes/publish-layer.mjs')}

## Real-Time 60 FPS Rendering Architecture

\`\`\`d2
direction: right

glb: "Unified 3D Asset\\npublic/assets/characters/3d/rift-runner.glb\\n(2.38 MB · 15k Tris · 26 Bones · 7 Clips)"
mixer: "THREE.AnimationMixer (60 FPS)\\nQuaternion Bone Interpolation (dt = 16.67ms)\\n+ 140ms Smooth Action Crossfade"
lab: "3D Hero Lab (/3d-hero-lab/)\\n• Isometric 2:1 / 360° Orbit Stage\\n• Single-WebGL 8-Viewport Strip (setViewport/setScissor)"
game: "Stronghold Engine (src/stronghold/hero-3d.ts)\\n• Orthographic 2:1 WebGL Canvas (?3d=1)\\n• Continuous 360° Yaw + Dynamic Shadows & Wall CutOut"

glb -> mixer
mixer -> lab
mixer -> game
\`\`\`

### 1. Pure-WebGL 60 FPS Interactive Studio & 8-Direction Viewport Strip (\`/3d-hero-lab/\`)
- **Zero 2D Canvas Copy Bottlenecks**: Both the main courtyard stage and the simultaneous 8-direction inspection strip (\`N, NE, E, SE, S, SW, W, NW\`) render directly in WebGL at **60 FPS** (\`requestAnimationFrame\`). The 8-direction strip uses a single WebGL context with \`setViewport\` and \`setScissor\` across 8 octant sub-viewports, eliminating CPU/GPU \`drawImage\` stalls.
- **Continuous 60 FPS Skeletal Interpolation**: \`THREE.AnimationMixer\` evaluates bone transforms every frame (\`16.67 ms\`) with \`160 ms\` crossfades between \`idle\`, \`walk\`, \`run\`, \`attack\`, \`cast\`, \`hit\`, and \`death\`.
- **Interactive Controls**: Supports live \`WASD\` / Arrow-key movement across the courtyard, \`Space\` (Attack), \`E\` (Rift Bolt Cast), speed scrubbing (\`0.25×\`–\`1.5×\`), camera switching (\`Isometric 2:1\` vs \`360° Free Orbit\`), and shader modes (\`Stylized Dark-Fantasy\`, \`Raw PBR\`, \`15k-Tri Wireframe\`).

### 2. Stronghold In-Game 60 FPS 3D Renderer (\`src/stronghold/hero-3d.ts\`)
- **Activated via \`/?hero=rift-runner&3d=1\`**: Hooks directly into ${repoLink('src/stronghold/hero.ts', 'src/stronghold/hero.ts')} and renders Rift Runner's 3D mesh and skeletal animations at **60 FPS** into the hero's offscreen character canvas.
- **Full 360° Smooth Rotation**: Calculates exact movement heading \`yaw3d = Math.atan2(sx, sy)\` and smoothly interpolates the 3D character's yaw at 60 FPS without snapping to 8 discrete angles.
- **Preserves All 2.5D Stronghold Lighting & Depth Systems**: Because \`hero-3d.ts\` feeds the rendered 60 FPS 3D frame into \`hero.ts\`'s composite pipeline, ground sun shadows (\`drawFigureShadow\`), wall occlusion cutouts (\`cutOut\`), night lightmap tinting, and NixieFX particle layers continue to work seamlessly.

## Meshy MCP (\`meshy-t2.5\`) Generation & Rigging Provenance

\`\`\`d2
direction: right

ref: "1. Reference Input\\n(Full-Body Front Standing\\n768×768 PNG)"
gen: "2. meshy_image_to_3d\\nai_model: meshy-t2.5\\nmodel_type: smart-topology\\npose_mode: t-pose (15,000 tris)"
rig: "3. meshy_rig\\n26-Bone Humanoid Armature\\n+ Walk & Run Clips"
anim: "4. meshy_animate\\nIdle (0), Attack (4),\\nRift Cast (129), Hit (178), Death (8)"
merge: "5. merge-and-optimize-glb.mjs\\nSingle 2.38 MB rift-runner.glb\\n(All 7 Clips + 1K PBR Maps)"

ref -> gen -> rig -> anim -> merge
\`\`\`

| Stage / Clip | Meshy Tool | Action / Model Spec | Meshy Task ID | Runtime Playback |
| :--- | :--- | :--- | :--- | :--- |
| **T-Pose 3D Mesh** | \`meshy_image_to_3d\` | \`meshy-t2.5\` (\`smart-topology\`, 15,000 tris, PBR) | \`01a1699d-cc20-744a-8765-180778c4f182\` | Base Rigged Mesh |
| **Humanoid Rig + Walk/Run** | \`meshy_rig\` | 26-bone biped skeleton (\`height_meters: 1.75\`) | \`01a1699f-be96-704d-81b7-3e731c1142ff\` | 60 FPS Loop (\`walk\`, \`run\`) |
| **Idle** | \`meshy_animate\` | \`action_id: 0\` (\`Idle\`) | \`01a169a0-6623-73d3-9c03-a6bc574c965f\` | 60 FPS Loop |
| **Attack** | \`meshy_animate\` | \`action_id: 4\` (\`Attack\`) | \`01a169a0-6c9e-75cc-8fa1-0607b16762a7\` | 60 FPS Skeletal Clip |
| **Rift Bolt Cast** | \`meshy_animate\` | \`action_id: 129\` (\`mage_soell_cast\`) | \`01a169a0-73c1-76ee-b435-1c8f835ccfc7\` | 60 FPS Skeletal Clip |
| **Hit Reaction** | \`meshy_animate\` | \`action_id: 178\` (\`Hit_Reaction\`) | \`01a169a0-78f3-77e5-899e-5dc94cad280d\` | 60 FPS Skeletal Clip |
| **Death** | \`meshy_animate\` | \`action_id: 8\` (\`Dead\`) | \`01a169a0-7fc5-7021-9b21-e3da63f0b786\` | 60 FPS Skeletal Clip |

## Why Real-Time 60 FPS 3D Solves Arkadia's 2D Sprite Challenges

1. **True 60 FPS Motion vs 8–10 FPS Stepped Frames**: Instead of flipping between 8 static PNG drawings per second, \`THREE.AnimationMixer\` interpolates all 26 humanoid bones at 60 FPS (\`16.67 ms\` intervals) with smooth crossfade transitions between states.
2. **Zero North/South Hopping ("Engkle")**: One 3D skeletal run cycle naturally alternates left and right legs from every camera angle (\`N, NE, E, SE, S, SW, W, NW\`) and across continuous 360° headings.
3. **True Anatomy Without Horizontal Mirroring Glitches**: Rift Runner's glowing cyan gauntlet stays on his right arm across all 360° angles instead of flipping to his left hand when moving West.
4. **95% Smaller Footprint (\`2.38 MB\` vs \`50+ MB\`)**: One \`2.38 MB\` \`.glb\` replaces dozens of \`3072×3072\` multi-angle 2D PNG sprite sheets.`;

execFileSync(
  'fural-agent',
  [
    'knowledge',
    'update',
    DOC_3D_ID,
    '--project',
    PROJECT,
    '--title',
    '3D Model & Real-Time 60 FPS Animation (Meshy t2.5)',
    '--markdown',
    markdown
  ],
  { stdio: 'inherit' }
);
console.log('Updated Knowledge page', DOC_3D_ID);
