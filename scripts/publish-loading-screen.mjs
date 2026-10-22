// Publish the Loading Screen Redesign Knowledge page (under Typography) and update the Loading Bar page,
// embedding all task attachment images, generated assets, and before/after verification screenshots inline.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const ORG='ORd5dd6f99b4308d6187031557';
const REPO='RPe11327fbfe413dbeba246526';
const PROJECT='PJ8758f22f61165f3d3215e454';
const ROOM='DRcf2ef6dd892ac62cb18a5766';
const TYPO_PARENT='NKBDd77d5bf6fcdf5016fda73de4';
const SPA_LOADING_PAGE='NKBD6f4d422b52376b79dbe8edf9';
const OUT='docs/loading-screen';

for(const f of fs.readdirSync(OUT)){
 if(f.endsWith('.png'))fs.unlinkSync(`${OUT}/${f}`);
}

const cli=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',maxBuffer:16e6}));
const receiptsFile=`${OUT}/publication.json`;
const receipts=fs.existsSync(receiptsFile)?JSON.parse(fs.readFileSync(receiptsFile,'utf8')):{attachments:{}};

function upload(file){
 const sha=createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 const prev=receipts.attachments[file];
 if(prev?.sha256===sha)return prev.url;
 const res=cli(['messages','upload','--file',file,'--kind','photo','--room',ROOM]);
 receipts.attachments[file]={id:res.id,url:res.url,sha256:sha};
 fs.writeFileSync(receiptsFile,JSON.stringify(receipts,null,2)+'\n');
 return res.url;
}

const img=(file,alt)=>`![${alt}](${upload(file)})`;
const repo=(path,label=path)=>`[${label}](/organizations/${ORG}/repositories/${REPO}/files?file=${encodeURIComponent(path)})`;

const md=`## Overview

The Arkadia loading screen (${repo('index.html')} + ${repo('src/app/loader.ts')}) renders **instantly at \`t = 0 ms\` in pure HTML, CSS, and inline SVG** directly inside ${repo('index.html')} before any JavaScript bundle, WebGL context, MSDF font atlas, or Pixi texture finishes downloading:

- **Zero Blank Screen on Initial Load**: Previously, rendering the loading screen inside Pixi required downloading the JS bundle, initializing WebGL, loading \`788 KB\` of MSDF font atlases, \`30+\` HUD frame PNGs, and \`8\` loading screen textures before a single pixel appeared — leaving the viewport blank until \`96%\` (\`Raising the Stronghold\`).
- **Pure HTML/CSS/SVG First-Packet Shell (${repo('index.html')})**:
  - Embeds ultra-compact base64 WebP low-quality image placeholders (LQIPs, \`~650 B\` each) behind \`<link rel="preload" as="image" fetchpriority="high">\` full-bleed background paintings (${repo('public/typography/v2/loading/bg-mobile.webp')} on portrait and ${repo('public/typography/v2/loading/bg-desktop.webp')} on landscape).
  - Embeds the \`@1x\` transparent \`ARKADIA\` compass logo as an inline WebP data URI (\`10 KB\`) so it decodes synchronously at \`0 ms\` with zero network wait, then atomically upgrades to \`@2x\` / \`@3x\` (${repo('public/typography/v2/loading/logo@3x.png')}) once decoded in memory.
  - Embeds the antique-gold compass divider, ornate progress bar track, recessed obsidian channel, masked molten-gold fill, and glowing four-point compass spark crest as **inline vector SVGs** in ${repo('index.html')} (\`0\` HTTP requests, infinite crispness at every DPR).
  - Includes an inline bootstrap controller (\`window.__LOADING_SCREEN__\`) that advances progress smoothly from \`1%\` (\`Loading the game\`) → \`14%\` (\`Loading interface & fonts\`) → \`18%–92%\` (\`Loading artwork · X.X of Y.Y MB\`) → \`96%\` (\`Raising the Stronghold\`) → \`100%\` (\`Ready\`), then fades out over \`180 ms\` and removes \`#loading-screen\` from the DOM so only \`#world-canvas\` remains during play.

Live game: [https://ark-whachat.fural.space/](https://ark-whachat.fural.space/) ([inspect loading screen](https://ark-whachat.fural.space/?offline=1&holdLoading=1&loadingPct=96&loadingText=Raising+the+Stronghold))

## Reference Attachments from Tasks

### Reference 1 — Previous Loading Screen Issue

The previous loading screen rendered inside a bronze modal box (\`panel-bronze\`) with \`ARKADIA\` and \`STRONGHOLD\` text, a hard-edged circular backdrop overlay, and an oversized 24 px orange fill bar (\`xp-fill\`) that overflowed onto the ornamental finials of \`xp-frame\`:

![Task Reference 1: Previous loading screen with modal box, STRONGHOLD title, and overflowing orange progress bar](/api/organizations/${ORG}/task-attachments/TAc040108c78d79a2ef66c4732)

### Reference 2 — Target ARKADIA Compass Wordmark

The target \`ARKADIA\` wordmark replaces the second \`A\` with an ornate eight-point gold compass rose emblem set with a deep-cyan faceted crystal gem:

![Task Reference 2: Target ARKADIA compass logo reference](/api/organizations/${ORG}/task-attachments/TAe7b6b4f075968d30b1d28732)

### Reference 3 — Mobile Delayed Pixi Loading Screen Appearing Only at 96%

When the loading screen was rendered inside Pixi (${repo('src/app/loader.ts')}), mobile users saw nothing at first while JS bundles, MSDF font atlases, HUD frames, and textures downloaded in parallel with game artwork, and then saw the loading screen pop in only at \`96%\` (\`Raising the Stronghold\`):

![Task Reference 3: Mobile loading screen appearing only at 96% after initial blank wait](/api/organizations/${ORG}/task-attachments/TAd8e44d53c7acfa333b2187d4)

## Instant Pure HTML Render (\`t = 0 ms\`, Before Any JS/Pixi Loads)

With the module entry script blocked so zero application or Pixi JavaScript runs, ${repo('index.html')} immediately renders the complete loading screen on the first HTML parse:

${img('docs/loading-screen/loading-mobile-instant-0ms.webp','Instant pure HTML loading screen on mobile portrait (390 × 844) at 12% before any JS/Pixi loads')}

## Before vs. After Comparison

${img('docs/loading-screen/compare-before-after.webp','Before and after comparison of the Arkadia loading screen at 96% (Raising the Stronghold)')}

## Generated High-Resolution Assets

All loading screen assets and the pure HTML ${repo('index.html')} shell are built reproducibly via ${repo('scripts/typography/build-logo.mjs')} from the generated masters in ${repo('assets-src/loading/logo-source.jpg')}, ${repo('assets-src/loading/bg-desktop.jpg')}, and ${repo('assets-src/loading/bg-mobile.jpg')}:

### 1. High-Resolution ARKADIA Compass Logo (\`@1x\`, \`@2x\`, \`@3x\`)

Extracted at straight alpha (\`1280 × 397\` master in ${repo('assets-src/typography/arkadia-logo-master.png')}) with a soft multi-layer drop shadow and exported at \`@1x\` (\`390 × 120\`, inlined as WebP in ${repo('index.html')} for \`0 ms\` render), \`@2x\` (\`780 × 240\`), and \`@3x\` (\`1170 × 360\`) in ${repo('public/typography/v2/loading/logo@3x.png')}, as well as updating ${repo('public/typography/v2/hero/logo@3x.png')}:

${img('public/typography/v2/loading/logo@3x.png','High-resolution transparent ARKADIA compass logo (@3x, 1170 × 360)')}

### 2. Full-Bleed Stronghold Background Artwork (Desktop 16:9 & Mobile 9:16)

- **Desktop (16:9 widescreen, ${repo('public/typography/v2/loading/bg-desktop.webp')})**:

${img('public/typography/v2/loading/bg-desktop.webp','Generated 16:9 twilight stronghold courtyard background artwork for desktop')}

- **Mobile Portrait (9:16 vertical, ${repo('public/typography/v2/loading/bg-mobile.webp')})**:

${img('public/typography/v2/loading/bg-mobile.webp','Generated 9:16 twilight stronghold courtyard background artwork for mobile portrait')}

### 3. Sleek Antique-Gold Progress Bar Track, Masked Molten-Gold Fill & Compass Spark

Embedded directly as inline vector SVGs in ${repo('index.html')} (and exported at \`@1x..@3x\` in ${repo('public/typography/v2/loading/bar-track@3x.png')} and ${repo('public/typography/v2/loading/bar-fill@3x.png')}):
- Features chamfered double antique-gold rails, 25 % / 50 % / 75 % groove tick marks, center diamond ticks, and left/right eight-point compass finials with teal crystal cores matching the \`ARKADIA\` logo.
- The \`408 × 10\` molten-gold progress fill sits strictly inside the recessed obsidian channel (\`x = 26..434, y = 9..19\`) and is clipped by \`#loading-fill-clip\` (\`overflow: hidden; border-radius: 1.5px\`) so it never overlaps the frame rails or finials at any percentage.
- A glowing four-point compass spark crest (\`#loading-crest\`) rides the leading tip of the progress fill.

${img('public/typography/v2/loading/bar-track@3x.png','Sleek antique-gold progress bar track (@3x, 1380 × 84)')}

## Rendered Pure HTML Loading Screen Across Viewports

### Desktop (\`1440 × 900\` · 96% \`Raising the Stronghold\`)

${img('docs/loading-screen/loading-desktop-96.webp','Pure HTML loading screen on desktop (1440 × 900) at 96%')}

### Desktop (\`1440 × 900\` · 64% \`Loading artwork · 18.4 of 28.7 MB\`)

${img('docs/loading-screen/loading-desktop-64.webp','Pure HTML loading screen on desktop (1440 × 900) at 64%')}

### Mobile Portrait (\`390 × 844\` · 96% \`Raising the Stronghold\`)

${img('docs/loading-screen/loading-mobile-96.webp','Pure HTML loading screen on mobile portrait (390 × 844) at 96%')}

### Mobile Landscape (\`844 × 390\` · 96% \`Raising the Stronghold\`)

${img('docs/loading-screen/loading-mobile-landscape-96.webp','Pure HTML loading screen on mobile landscape (844 × 390) at 96%')}

## Architecture & Implementation Flow

\`\`\`d2
direction: right
source_masters: "Generated Masters (assets-src/loading/)" {
  logo_src: "logo-source.jpg"
  bg_desk: "bg-desktop.jpg (16:9)"
  bg_mob: "bg-mobile.jpg (9:16)"
}
builder: "scripts/typography/build-logo.mjs"
html_shell: "index.html (Instant t=0ms Pure HTML)" {
  inline_lqip: "Inline 650B WebP LQIP + fetchpriority=high preload"
  inline_logo: "Inline @1x WebP Logo -> Atomic @2x/@3x upgrade"
  inline_svg: "Inline Vector SVGs (Divider, Track, Masked Fill, Crest)"
  boot_ctrl: "window.__LOADING_SCREEN__ (1% -> 100% + DOM removal)"
}
app_loader: "src/app/loader.ts" {
  pixi_boot: "ensurePixiRuntime (8% -> 18%)"
  byte_stream: "loadImage byte progress (18% -> 92% -> 96% -> 100%)"
}
source_masters -> builder: "Straight-alpha extraction + SVG & LQIP generation"
builder -> html_shell: "Generates zero-latency pure HTML loading screen"
app_loader -> html_shell: "Drives progress synchronously & removes DOM node on done()"
\`\`\`

## Verification

- **Automated 0 ms Pure HTML, Visual & DOM Cleanup Verification** (${repo('scripts/verify-loading-screen.mjs')} → ${repo('docs/loading-screen/verification.json')}):
  - Verified that with \`/src/app/main.ts\` blocked (zero module/Pixi JS loaded), \`#loading-screen\`, the inline \`@1x\` \`ARKADIA\` logo, and the inline SVG progress bar render immediately at \`domcontentloaded\`.
  - Verified across desktop (\`1440 × 900\`), mobile portrait (\`390 × 844\`), and mobile landscape (\`844 × 390\`) with \`0\` console errors and \`0\` page errors.
  - Verified that \`#loading-screen\` fades out and is completely removed from \`document.body\` once \`done()\` fires.
`;

const pages=cli(['knowledge','list','--project',PROJECT]);
let existing=pages.find(p=>p.parent_id===TYPO_PARENT&&p.title.startsWith('Loading Screen'));
if(existing){
 cli(['knowledge','update',existing.id,'--title','Loading Screen — High-Res ARKADIA Logo, Background Artwork & Ornate Progress Bar','--markdown',md]);
 console.log('Updated Knowledge page',existing.id);
}else{
 existing=cli(['knowledge','create','--project',PROJECT,'--parent',TYPO_PARENT,'--sort-order','20','--title','Loading Screen — High-Res ARKADIA Logo, Background Artwork & Ornate Progress Bar','--markdown',md]);
 console.log('Created Knowledge page',existing.id);
}

receipts.pageId=existing.id;
receipts.updatedAt=new Date().toISOString();
fs.writeFileSync(receiptsFile,JSON.stringify(receipts,null,2)+'\n');
