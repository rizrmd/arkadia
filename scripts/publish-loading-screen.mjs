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

The Arkadia loading screen (${repo('src/app/loader.ts')}) has been redesigned to eliminate the enclosing bronze modal box, remove the \`STRONGHOLD\` title, introduce full-bleed dark-fantasy twilight stronghold background paintings for both desktop and mobile viewports, display a high-resolution \`ARKADIA\` compass rose logo generated from the reference wordmark, and replace the overflowing orange bar with a sleek antique-gold progress bar.

Live game: [https://ark-whachat.fural.space/](https://ark-whachat.fural.space/) ([inspect loading screen](https://ark-whachat.fural.space/?offline=1&holdLoading=1&loadingPct=96&loadingText=Raising+the+Stronghold))

## Reference Attachments from Task

### Reference 1 — Previous Loading Screen Issue

The previous loading screen rendered inside a bronze modal box (\`panel-bronze\`) with \`ARKADIA\` and \`STRONGHOLD\` text, a hard-edged circular backdrop overlay, and an oversized 24 px orange fill bar (\`xp-fill\`) that overflowed onto the ornamental finials of \`xp-frame\`:

![Task Reference 1: Previous loading screen with modal box, STRONGHOLD title, and overflowing orange progress bar](/api/organizations/${ORG}/task-attachments/TAc040108c78d79a2ef66c4732)

### Reference 2 — Target ARKADIA Compass Wordmark

The target \`ARKADIA\` wordmark replaces the second \`A\` with an ornate eight-point gold compass rose emblem set with a deep-cyan faceted crystal gem:

![Task Reference 2: Target ARKADIA compass logo reference](/api/organizations/${ORG}/task-attachments/TAe7b6b4f075968d30b1d28732)

## Before vs. After Comparison

${img('docs/loading-screen/compare-before-after.webp','Before and after comparison of the Arkadia loading screen at 96% (Raising the Stronghold)')}

## Generated High-Resolution Assets

All loading screen assets are built reproducibly via ${repo('scripts/typography/build-logo.mjs')} from the generated masters in ${repo('assets-src/loading/logo-source.jpg')}, ${repo('assets-src/loading/bg-desktop.jpg')}, and ${repo('assets-src/loading/bg-mobile.jpg')}:

### 1. High-Resolution ARKADIA Compass Logo (\`@1x\`, \`@2x\`, \`@3x\`)

Extracted at straight alpha (\`1280 × 397\` master in ${repo('assets-src/typography/arkadia-logo-master.png')}) with a soft multi-layer drop shadow and exported at \`@1x\` (\`390 × 120\`), \`@2x\` (\`780 × 240\`), and \`@3x\` (\`1170 × 360\`) in ${repo('public/typography/v2/loading/logo@3x.png')}, as well as updating ${repo('public/typography/v2/hero/logo@3x.png')}:

${img('public/typography/v2/loading/logo@3x.png','High-resolution transparent ARKADIA compass logo (@3x, 1170 × 360)')}

### 2. Full-Bleed Stronghold Background Artwork (Desktop 16:9 & Mobile 9:16)

- **Desktop (16:9 widescreen, ${repo('public/typography/v2/loading/bg-desktop.webp')})**:

${img('public/typography/v2/loading/bg-desktop.webp','Generated 16:9 twilight stronghold courtyard background artwork for desktop')}

- **Mobile Portrait (9:16 vertical, ${repo('public/typography/v2/loading/bg-mobile.webp')})**:

${img('public/typography/v2/loading/bg-mobile.webp','Generated 9:16 twilight stronghold courtyard background artwork for mobile portrait')}

### 3. Sleek Antique-Gold Progress Bar Track, Masked Molten-Gold Fill & Compass Spark

Built at \`@3x\` (\`1380 × 84\`, downscaled to \`@2x\` and \`@1x\` \`460 × 28\`) in ${repo('public/typography/v2/loading/bar-track@3x.png')} and ${repo('public/typography/v2/loading/bar-fill@3x.png')}:
- Features chamfered double antique-gold rails, 25 % / 50 % / 75 % groove tick marks, center diamond ticks, and left/right eight-point compass finials with teal crystal cores matching the \`ARKADIA\` logo.
- The \`408 × 10\` molten-gold progress fill sits strictly inside the recessed obsidian channel (\`x = 26..434, y = 9..19\`) and is clipped by a rounded \`Pixi.Graphics\` mask so it never overlaps the frame rails or finials at any percentage.
- A glowing four-point compass spark crest (${repo('public/typography/v2/loading/bar-crest@3x.png')}) rides the leading tip of the progress fill.

${img('public/typography/v2/loading/bar-track@3x.png','Sleek antique-gold progress bar track (@3x, 1380 × 84)')}

## Rendered Loading Screen Across Viewports

### Desktop (\`1440 × 900\` · 96% \`Raising the Stronghold\`)

${img('docs/loading-screen/loading-desktop-96.webp','Redesigned loading screen on desktop (1440 × 900) at 96%')}

### Desktop (\`1440 × 900\` · 64% \`Loading artwork · 18.4 of 28.7 MB\`)

${img('docs/loading-screen/loading-desktop-64.webp','Redesigned loading screen on desktop (1440 × 900) at 64%')}

### Mobile Portrait (\`390 × 844\` · 96% \`Raising the Stronghold\`)

${img('docs/loading-screen/loading-mobile-96.webp','Redesigned loading screen on mobile portrait (390 × 844) at 96%')}

### Mobile Landscape (\`844 × 390\` · 96% \`Raising the Stronghold\`)

${img('docs/loading-screen/loading-mobile-landscape-96.webp','Redesigned loading screen on mobile landscape (844 × 390) at 96%')}

## Architecture & Implementation Flow

\`\`\`d2
direction: right
source_masters: "Generated Masters (assets-src/loading/)" {
  logo_src: "logo-source.jpg"
  bg_desk: "bg-desktop.jpg (16:9)"
  bg_mob: "bg-mobile.jpg (9:16)"
}
builder: "scripts/typography/build-logo.mjs"
runtime_assets: "public/typography/v2/loading/" {
  logo_scales: "logo@{1,2,3}x.png"
  bar_scales: "bar-track, bar-fill, bar-crest, divider@{1,2,3}x.png"
  backgrounds: "bg-desktop.webp & bg-mobile.webp"
}
pixi_loader: "src/app/loader.ts (loadingScreen)" {
  stage: "Full-bleed bgSprite + feathered vignette + Logo + Masked Gold Bar + MSDF Text"
}
source_masters -> builder: "Straight-alpha extraction + Lanczos @3x/@2x/@1x"
builder -> runtime_assets: "Writes multi-DPI textures"
runtime_assets -> pixi_loader: "Loaded at DPR FrameScale"
\`\`\`

## Verification

- **Automated Visual & Console Verification** (${repo('scripts/verify-loading-screen.mjs')} → ${repo('docs/loading-screen/verification.json')}): Verified across desktop (\`1440 × 900\`), mobile portrait (\`390 × 844\`), and mobile landscape (\`844 × 390\`) with \`0\` console errors and \`0\` page errors.
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
