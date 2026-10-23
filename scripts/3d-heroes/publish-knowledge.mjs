import { execFileSync } from 'node:child_process';

const PROJECT = 'PJ8758f22f61165f3d3215e454';
const ORG = 'ORd5dd6f99b4308d6187031557';
const REPO = 'RPe11327fbfe413dbeba246526';
const DOC_3D_ID = 'NKBD436f6ea332eacd3db9387f42';
const HOST = 'https://ark-whachat.fural.space';

const repoLink = (label, relPath) =>
  `[${label}](/organizations/${ORG}/repositories/${REPO}/files?file=${encodeURIComponent(relPath)})`;

const markdown = [
  '## Real-Time 60 FPS WebGL 3D Hero & Animation Player (Rift Runner & Ember Warden)',
  '',
  '<iframe src="https://ark-whachat.fural.space/3d-hero-lab/index.html?embed=1&hero=rift-runner&clip=run_cast&dir=SE" title="Arkodia Real-Time 60 FPS 3D Hero & Animation Lab — Rift Runner (Meshy t2.5)" height="680"></iframe>',
  '',
  '<iframe src="https://ark-whachat.fural.space/3d-hero-lab/index.html?embed=1&hero=ember-warden&clip=run_cast&dir=SE" title="Arkodia Real-Time 60 FPS 3D Hero & Animation Lab — Ember Warden (Meshy t2.5)" height="680"></iframe>',
  '',
  '- **Live 60 FPS WebGL Studio**: [https://ark-whachat.fural.space/3d-hero-lab/](https://ark-whachat.fural.space/3d-hero-lab/)',
  '- **Live Stronghold Gameplay (Default 3D 60 FPS)**: [Play Rift Runner (3D)](https://ark-whachat.fural.space/?hero=rift-runner) · [Play Ember Warden (3D)](https://ark-whachat.fural.space/?hero=ember-warden)',
  '- **Direct 60 FPS WebGL Presets**:',
  '  - **Rift Runner**: [Run While Casting (`run_cast`)](https://ark-whachat.fural.space/3d-hero-lab/?hero=rift-runner&clip=run_cast&dir=SE) · [Idle Cast (`idle_cast`)](https://ark-whachat.fural.space/3d-hero-lab/?hero=rift-runner&clip=idle_cast&dir=N) · [Run (`run`)](https://ark-whachat.fural.space/3d-hero-lab/?hero=rift-runner&clip=run&dir=SE) · [Wireframe 360°](https://ark-whachat.fural.space/3d-hero-lab/?hero=rift-runner&clip=run_cast&style=wireframe&turntable=1)',
  '  - **Ember Warden**: [Run While Casting (`run_cast`)](https://ark-whachat.fural.space/3d-hero-lab/?hero=ember-warden&clip=run_cast&dir=SE) · [Idle Cast (`idle_cast`)](https://ark-whachat.fural.space/3d-hero-lab/?hero=ember-warden&clip=idle_cast&dir=N) · [Run (`run`)](https://ark-whachat.fural.space/3d-hero-lab/?hero=ember-warden&clip=run&dir=SE) · [Wireframe 360°](https://ark-whachat.fural.space/3d-hero-lab/?hero=ember-warden&clip=run_cast&style=wireframe&turntable=1)',
  `- **Unified Runtime Assets**: ${repoLink('rift-runner.glb', 'public/assets/characters/3d/rift-runner.glb')} (\`2,367.7 KB\`) · ${repoLink('ember-warden.glb', 'public/assets/characters/3d/ember-warden.glb')} (\`1,714.5 KB\`) · ${repoLink('manifest.json', 'public/assets/characters/3d/manifest.json')}`,
  `- **Runtime Code & Scripts**: ${repoLink('hero-3d.ts', 'src/stronghold/hero-3d.ts')} · ${repoLink('hero.ts', 'src/stronghold/hero.ts')} · ${repoLink('3d-hero-lab/index.html', 'public/3d-hero-lab/index.html')} · ${repoLink('verify-glitch-fix.mjs', 'scripts/3d-heroes/verify-glitch-fix.mjs')} · ${repoLink('glitch-fix-verification.json', 'docs/3d-heroes/glitch-fix-verification.json')}`,
  '',
  '## Mobile WebGL TBDR Tile Glitch Fix (Ember Warden & Rift Runner)',
  '',
  `![3D Hero Mobile WebGL Tile Glitch — Before vs. After Fix](${HOST}/docs/3d-heroes/before-after-3d-hero-glitch.webp)`,
  '',
  '```d2',
  'direction: right',
  '',
  'bug: "Mobile TBDR GPU Bug (Before)\\n• antialias: true + preserveDrawingBuffer: false\\n• Empty 16x16 outer tiles skipped on MSAA resolve\\n• Recycled HUD VRAM left around resolved hero tile moat"',
  'quad: "Layer 1 & 2: WebGL Hardware Fix\\n• preserveDrawingBuffer: true + antialias: false\\n• Full-Viewport NDC Clear Quad (renderOrder -1000, NoBlending)\\n• Forces 100% of GPU tiles to rasterize vec4(0,0,0,0)"',
  'read: "Layer 3: Direct gl.readPixels\\n• Reads 228x206 RGBA directly from WebGL context\\n• Bypasses cross-context 2D drawImage mailbox copy"',
  'san: "Layer 4: sanitizeHeroWorkPixels()\\n• Flood-erases border-connected VRAM artifacts\\n• Retains 8-connected hero silhouette from central spine"',
  '',
  'bug -> quad -> read -> san',
  '```',
  '',
  '### Root Cause & 4-Layer Defense (`src/stronghold/hero-3d.ts`)',
  `- **Root Cause (${repoLink('mobile-glitch-before.jpg', 'docs/3d-heroes/mobile-glitch-before.jpg')})**: On mobile Tile-Based Deferred Renderers (Adreno/Mali), rendering an offscreen WebGL canvas (\`228×206\`) with \`antialias: true\` (\`EXT_multisampled_render_to_texture\`) and \`preserveDrawingBuffer: false\`, then copying via \`outCtx.drawImage(glCanvas, 0, 0)\`, caused the GPU tile resolver to only resolve the 16×16 tiles overlapping the 3D hero's triangles (creating a stepped transparent moat around the hero) while leaving untouched outer 16×16 tiles filled with recycled VRAM from the PixiJS HUD texture (which \`applyHandPaintedSpritePass\` then outlined in \`#140d0a\` and projected as a rectangular ground shadow).`,
  '- **Layer 1 (`preserveDrawingBuffer: true`, `antialias: false`, `premultipliedAlpha: false`)**: Disables implicit mobile MSAA tile resolve and stops the browser from swapping/discarding the WebGL drawing buffer with uninitialized shared GPU pool textures (`228×206` is already 2× supersampled for the `114×103` cell).',
  '- **Layer 2 (Full-Viewport NDC `clearQuad`)**: Renders a clip-space `[-1, 1] × [-1, 1]` plane mesh (`renderOrder = -1000`, `THREE.NoBlending`, `gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0)`) before the hero mesh so the hardware tile binner bins 2 triangles into 100% of tiles, guaranteeing zero empty tiles on any TBDR GPU.',
  '- **Layer 3 (Direct `gl.readPixels` Readback)**: Reads the rendered `228×206` RGBA buffer directly from the WebGL context into a pre-allocated `Uint8Array`, bypassing cross-context `drawImage(glCanvas)` mailbox transfers.',
  `- **Layer 4 (\`sanitizeHeroWorkPixels\` in ${repoLink('src/stronghold/hero-3d.ts', 'src/stronghold/hero-3d.ts')})**: Flood-erases any opaque pixels connected to the left/right/top 1px canvas borders and retains only the contiguous 8-connected hero silhouette seeded from the central hero spine (verified with synthetic TBDR tile corruption in ${repoLink('glitch-fix-verification.json', 'docs/3d-heroes/glitch-fix-verification.json')}: \`7,260/7,260\` hero pixels preserved, \`0\` garbage pixels remaining).`,
  '',
  '### Reported Glitch Screenshot vs. Verified Fixed Gameplay',
  '',
  `![Reported mobile 3D hero tile glitch screenshot (66940.jpg)](${HOST}/docs/3d-heroes/mobile-glitch-before.jpg)`,
  '',
  `![Verified fixed mobile 3D Ember Warden at 12:00 daylight](${HOST}/docs/3d-heroes/mobile-ember-warden-fixed.webp)`,
  '',
  `![Verified fixed mobile 3D Rift Runner at 12:00 daylight](${HOST}/docs/3d-heroes/mobile-rift-runner-fixed.webp)`,
  '',
  `![Verified fixed desktop 3D Ember Warden at 12:00 daylight](${HOST}/docs/3d-heroes/desktop-ember-warden-fixed.webp)`,
  '',
  `- **Verification Artifacts**: ${repoLink('before-after-3d-hero-glitch.webp', 'docs/3d-heroes/before-after-3d-hero-glitch.webp')} · ${repoLink('mobile-glitch-before.jpg', 'docs/3d-heroes/mobile-glitch-before.jpg')} · ${repoLink('mobile-ember-warden-fixed.webp', 'docs/3d-heroes/mobile-ember-warden-fixed.webp')} · ${repoLink('mobile-rift-runner-fixed.webp', 'docs/3d-heroes/mobile-rift-runner-fixed.webp')} · ${repoLink('desktop-ember-warden-fixed.webp', 'docs/3d-heroes/desktop-ember-warden-fixed.webp')} · ${repoLink('glitch-fix-verification.json', 'docs/3d-heroes/glitch-fix-verification.json')}`,
  '',
  '## Real-Time 60 FPS Rendering & Upper/Lower Skeletal Blending Architecture',
  '',
  '```d2',
  'direction: right',
  '',
  'glb: "Unified 3D Assets\\n• rift-runner.glb (2.37 MB)\\n• ember-warden.glb (1.71 MB)\\n(15k Tris · 26 Bones · 7 Clips)"',
  'blend: "Upper/Lower Body Skeletal Track Blending\\n• Lower Body (9 Bones: Hips + Legs): 3× Run Cycle (60f)\\n• Upper Body (13 Bones: Spine + Arms + Head): Idle Cast (60f)"',
  'mixer: "THREE.AnimationMixer (60 FPS)\\nQuaternion Bone Interpolation (dt = 16.67ms)\\n+ 140ms Smooth Action Crossfade"',
  'lab: "3D Hero Lab (/3d-hero-lab/)\\n• Isometric 2:1 / 360° Orbit Stage\\n• Single-WebGL 8-Viewport Strip (setViewport/setScissor)"',
  'game: "Stronghold Engine (Default 3D in hero.ts)\\n• Orthographic 2:1 WebGL Canvas (60 FPS)\\n• Auto idle_cast (standing) & run_cast (moving)"',
  '',
  'glb -> blend -> mixer',
  'mixer -> lab',
  'mixer -> game',
  '```',
  '',
  '### 1. Default 3D Gameplay Rendering (`src/stronghold/hero.ts` & `src/stronghold/hero-3d.ts`)',
  `- **Replaced 2D Spritesheets by Default**: Both **Rift Runner** and **Ember Warden** now render in real-time **60 FPS 3D** by default in Stronghold gameplay via ${repoLink('src/stronghold/hero-3d.ts', 'src/stronghold/hero-3d.ts')}.`,
  '- **Automatic `idle_cast` & `run_cast` Selection**: When casting/attacking while standing still (`moving === false`), the 3D character plays `idle_cast`; when casting/attacking while moving (`moving === true`), it plays `run_cast` (lower-body full run stride + upper-body spell casting).',
  '- **Full 2.5D Stronghold Integration**: Preserves dynamic ground sun shadows (projected at 60 FPS from the 3D silhouette), wall occlusion cutouts (`cutOut`), night lightmap tinting, and NixieFX skill particles.',
  '',
  '### 2. Meshy MCP (`meshy-t2.5`) Provenance (Rift Runner & Ember Warden)',
  '',
  '| Hero | Stage / Clip | Meshy Tool / Method | Task ID / Spec |',
  '| :--- | :--- | :--- | :--- |',
  '| **Rift Runner** | T-Pose 3D Mesh | `meshy_image_to_3d` (`meshy-t2.5`, `smart-topology`, 15k tris) | `01a1699d-cc20-744a-8765-180778c4f182` |',
  '| **Rift Runner** | 26-Bone Rig + `walk` / `run` | `meshy_rig` (`height_meters: 1.75`) | `01a1699f-be96-704d-81b7-3e731c1142ff` |',
  '| **Rift Runner** | `idle`, `idle_cast`, `hit`, `death` | `meshy_animate` (`0`, `129`, `178`, `8`) + `run_cast` blend | `01a169a0-6623..` / `01a169a0-73c1..` |',
  '| **Ember Warden** | T-Pose 3D Mesh | `meshy_image_to_3d` (`meshy-t2.5`, `smart-topology`, 15k tris) | `01a169dc-44ce-74ad-af0a-0da8d5ea697d` |',
  '| **Ember Warden** | 26-Bone Rig + `walk` / `run` | `meshy_rig` (`height_meters: 1.75`) | `01a169e2-0788-70cc-b431-893db42ae5ad` |',
  '| **Ember Warden** | `idle`, `idle_cast`, `hit`, `death` | `meshy_animate` (`0`, `129`, `178`, `8`) + `run_cast` blend | `01a169e2-9633..` / `01a169e2-9ae5..` |'
].join('\n');

execFileSync(
  'fural-agent',
  [
    'knowledge',
    'update',
    DOC_3D_ID,
    '--project',
    PROJECT,
    '--title',
    '3D Models & Real-Time 60 FPS Animation (Rift Runner & Ember Warden · Meshy t2.5)',
    '--markdown',
    markdown
  ],
  { stdio: 'inherit' }
);
console.log('Updated Knowledge page', DOC_3D_ID);
