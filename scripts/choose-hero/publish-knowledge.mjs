// Publish the "Choose Your Hero Screen" Knowledge page under Choosing Hero: every evidence image inline (uploaded as
// discussion attachments), the text-role table read from src/typography/tokens.ts, and the same markdown in
// docs/choose-hero/screen.md.
//   node scripts/choose-hero/publish-knowledge.mjs [--dry]
// Upload receipts live in docs/choose-hero/publication.json, so re-running uploads only new or changed images.
import fs from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {CHOOSE_HERO_TEXT,FONTS} from '../../src/typography/tokens.ts';
const PARENT='NKBDf6e2606741482bf94ad3d3f0',TITLE='Choose Your Hero Screen',ROOM='DRcf2ef6dd892ac62cb18a5766',ORG='ORd5dd6f99b4308d6187031557',REPO='RPe11327fbfe413dbeba246526';
const LIVE='https://ark-whachat.fural.space/';
const D='docs/choose-hero',dry=process.argv.includes('--dry');
const cli=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',maxBuffer:16e6}));
const receiptsFile=`${D}/publication.json`,receipts=fs.existsSync(receiptsFile)?JSON.parse(fs.readFileSync(receiptsFile,'utf8')):{attachments:{}};
const save=()=>{if(!dry)fs.writeFileSync(receiptsFile,JSON.stringify(receipts,null,1)+'\n');};
const E=JSON.parse(fs.readFileSync(`${D}/evidence.json`,'utf8'));
const live=fs.existsSync(`${D}/live.json`)?JSON.parse(fs.readFileSync(`${D}/live.json`,'utf8')):null;
function upload(file){
 const sha=createHash('sha256').update(fs.readFileSync(file)).digest('hex'),r=receipts.attachments[file];
 if(r?.sha256===sha)return r.url;
 if(dry)return `/dry-run/${file}`;
 const res=cli(['messages','upload','--file',file,'--kind','photo','--room',ROOM]);
 receipts.attachments[file]={id:res.id,url:res.url,sha256:sha};save();
 return res.url;
}
const img=(file,alt)=>`![${alt}](${upload(`${D}/${file}`)})`;
const repo=(path,label=path)=>`[${label}](/organizations/${ORG}/repositories/${REPO}/files?file=${encodeURIComponent(path)})`;
const C=Object.fromEntries(E.compare.map(c=>[c.name,c])),S=Object.fromEntries(E.shots.map(s=>[s.name,s]));
const compare=(name,title)=>`### ${title}\n\n${C[name].label} · ${C[name].pixels.join(' × ')} device px · ${C[name].layout} layout, frames @${C[name].frameScale}x. The reference is scaled to the same size.\n\n${img(`${name}-side-by-side.webp`,`${title}: reference and result side by side`)}\n\n${img(`${name}-overlay.webp`,`${title}: result with the reference overlaid at 50 %`)}`;
const shot=name=>`${img(`${name}.webp`,S[name].label)}\n\n${S[name].label} · ${S[name].layout} layout · stage scale ${S[name].stageScale} · frames @${S[name].frameScale}x`;
const SLOTS={'title':'CHOOSE YOUR HERO','subtitle':'Choose a hero to begin your journey. (desktop only)','back':'Back (desktop label)','card-name':'Card names','card-state':'Selected','hero-name':'Panel hero name','loadout-title':'Legacy compact panel title (unused; both heroes use hero-name)','hero-desc':'Hero description','loadout':'LOADOUT label','skill':'Skill names, Empty','level':'Lv. 1','help':'Wrapped help paragraph','action':'Begin Journey'};
const hex=c=>'#'+c.toString(16).padStart(6,'0'),fill=f=>Array.isArray(f)?`gold gradient ${f.map(hex).join(' → ')}`:hex(f);
const roleRows=Object.entries(SLOTS).map(([slot,use])=>{const d=CHOOSE_HERO_TEXT.desktop[slot];
 return `| \`${slot}\` | ${use} | ${FONTS[d.font].family} | ${CHOOSE_HERO_TEXT.desktop[slot].size} | ${CHOOSE_HERO_TEXT.portrait[slot].size} | ${CHOOSE_HERO_TEXT.landscape[slot].size} | ${d.letterSpacing}${d.uppercase?' · caps':''} | ${fill(d.fill)} |`;}).join('\n');
const crisp=E.crisp.filter(c=>c.edges),texts=Object.keys(crisp[0].edges);
// Selected sits right under the card name and over the selected frame's gold glow: its crop catches both, so it is listed
// but left out of the range (see the note under the table).
const OVERLAPPED=['Selected'],edges=crisp.flatMap(c=>Object.entries(c.edges).filter(([t])=>!OVERLAPPED.includes(t)).map(([,e])=>e)).filter(x=>x!=null);
const picks=crisp.map(c=>`@${c.frameScale}x at DPR ${c.dpr}`).join(', ');
const crispTable=`| 1280 × 720 | ${texts.map(t=>t.replace(/\|/g,'')).join(' | ')} | Frames |\n|---|${texts.map(()=>'---:').join('|')}|---|\n`+crisp.map(c=>`| DPR ${c.dpr} | ${texts.map(t=>c.edges[t]??'—').join(' | ')} | @${c.frameScale}x |`).join('\n');
const full=E.crisp.find(c=>!c.edges);
const checks=E.input.map(c=>`| ${c.name} | ${c.pass?'Pass':'**Fail**'} | ${c.detail||''} |`).join('\n');
// The co-op smoke test runs in the clean release worktree; its report is copied here (docs/coop/smoke.json is shared).
const smoke=fs.existsSync(`${D}/coop-smoke.json`)?JSON.parse(fs.readFileSync(`${D}/coop-smoke.json`,'utf8')):null;

const md=`## Result

Choose Your Hero is now the game's own Pixi v8 screen (${repo('src/stronghold/choose-hero.ts')}), opened by ${repo('src/stronghold/hero-picker.ts')} exactly as before: a new tab asks once, the HUD hero name reopens it, Begin Journey swaps the hero in place and Back keeps the current one. Nothing on it is HTML. Every word is live MSDF text in named roles from ${repo('src/typography/tokens.ts','tokens.ts')}, the ARKODIA logo is an image, and every frame and button is a kit master cut into split 9-slices at @1x/@2x/@3x. Selection and the action button are highlighted with NixieFX particles.

Live: [${LIVE}](${LIVE}) (open a new tab, or add \`?hero=reset\` to choose again).${live?` Checked ${live.checked.slice(0,16).replace('T',' ')} UTC: ${live.results.map(r=>`${r.name} ${r.viewport.join(' × ')} DPR ${r.dpr} (${r.layout}, ${r.errors} console errors)`).join('; ')}.`:''}

${live?live.results.map(r=>img(`${r.file}`,`Live ${r.name}`)).join('\n\n'):''}

## Reference vs result

The references are the four Choosing Hero originals. Desktop is compared at 1672 × 941 DPR 1, mobile at 432 × 912 CSS px DPR 2 (864 × 1824 device px), each with a side-by-side and a 50 % overlay.

${compare('compare-desktop-ember','Desktop, Ember Warden')}

${compare('compare-desktop-rift','Desktop, Rift Runner')}

${compare('compare-mobile-ember','Mobile, Ember Warden')}

${compare('compare-mobile-rift','Mobile, Rift Runner')}

## Layouts and live resize

Three compositions, chosen from the viewport and rebuilt on resize without reloading: **desktop** (1672 × 941 design canvas), **portrait** (864 × 1824, below a 0.85 width/height ratio: phones and upright tablets) and **landscape** (1240 × 600, landscape phones under 560 CSS px tall). The stage scales uniformly and centres; the castle background covers the viewport. Landscape keeps text near 14 CSS px on an 844 × 390 phone, where the desktop composition would shrink body text to 9 px. Hit targets stay at least 44 CSS px (portrait Back: 110 design px × 0.45).

${shot('desktop-1440-ember')}

${shot('desktop-1280-rift')}

${shot('portrait-390-ember')}

${shot('portrait-412-rift')}

${shot('landscape-844-ember')}

${shot('landscape-915-rift')}

${shot('tablet-820-rift')}

One page resized from phone portrait to landscape to desktop:

${img('resize-sequence.webp','Live resize: 390 × 844 portrait, 844 × 390 landscape, 1280 × 720 desktop')}

## Frames: split 9-slices at @1x/@2x/@3x

${repo('scripts/choose-hero/build-ui.mjs','build-ui.mjs')} reads the kit's generated masters (${repo('assets-src/choosing-hero/v1')}) and art (${repo('public/choosing-hero/v1')}) without changing them, and writes the game's runtime set to ${repo('public/assets/choose-hero/manifest.json','public/assets/choose-hero')}. Each texture is an @3x master cut from the trimmed generated master and downscaled to @2x and @1x, where @1x is the size the screen draws it. The screen picks the set from devicePixelRatio × stage scale (rounded up) and reloads it when that changes, and it loads only the panel its layout uses.

The kit frames carry ornaments in the middle of their edges (the panel crest, card finials, side stars, button centre finials), which a plain 9-slice would stretch. Each frame is therefore split into quadrants (cards, panels) or halves (button, divider). Every part is its own 9-slice whose outer corner and inner half-ornament stay fixed, so only the plain rails between them stretch, and ${repo('src/typography/frames.ts','FrameSet.frame()')} reassembles the parts. Ornaments scale uniformly, never past their @1x size along the tighter axis.

${img('ui-slices.png','Split seams (blue) and fixed 9-slice borders (pink) of every frame')}

The generated masters are 1.8–2.3× the runtime size for the panels, button and divider. Their @3x textures, used only above 2 device px per design pixel (for example the full desktop composition at DPR 2.625), are therefore Lanczos upscales: as sharp as the generated art allows. Card frames, badges, icons and Back have native @3x detail. The castle backgrounds and hero figures keep the kit's single resolution.

## Text roles

All screen text uses \`CHOOSE_HERO_TEXT\` in ${repo('src/typography/tokens.ts','tokens.ts')}: one role per slot and layout, derived from the shared roles (Cinzel SemiBold display caps with the gold gradient, outline and soft shadow; EB Garamond Medium body; wide-tracked gold LOADOUT; gold accents; a wrapped, centred paragraph). Sizes are design pixels of each layout's canvas.

| Slot | Used for | Font | Desktop | Portrait | Landscape | Tracking | Fill |
|---|---|---|---:|---:|---:|---|---|
${roleRows}

## Highlights (NixieFX)

The highlights are NixieFX effects authored in ${repo('vfx/recipes/ui.mjs')} and compiled into the game's one effect bundle (\`npm run vfx\` → /vfx/skills.bin). ${repo('src/stronghold/choose-hero-fx.ts','choose-hero-fx.ts')} gives each card and the Begin Journey button its own renderer inside the screen, between frame and text. A 2D projection stretches each effect's authored frame (card 3 × 4 units, button 4.8 × 1.2) onto the control's box, so the same effect fits every layout.

- **Select:** a flash, gold glints along all four rails, flares on the top and bottom finials, and sparks and motes in the hero's element (Ember fire, Rift crystal shards and arcs).
- **Selected:** a slow looping aura of element motes with occasional rail glints.
- **Hover** on an unselected card: a glint trace along its rails, with the glowing frame shown at 45 %.
- **Begin Journey:** embers and soft light on the red face plus rail glints while it is hovered, keyboard-focused or held. Confirming adds a flash, finial flares and sparks along the rails, and the screen closes 260 ms later.

If NixieFX fails to load, the screen runs unchanged without highlights. Frames below are stepped on a frozen effect clock, so each shows the stated time after the event.

${img('fx-card.webp','Card highlights: hover, select burst at 0.06, 0.18 and 0.42 s, selected aura')}

${img('fx-button.webp','Begin Journey highlights: default, hover or focus glow, pressed, press flash')}

## Input

Mouse and pen get hover; touch goes default → pressed → default with no hover. A tap fires on release over the control, and releasing outside cancels. Keys while the screen is open: ← → ↑ ↓, Tab and Shift+Tab (or 1 and 2) switch hero; Enter or Space shows Begin Journey pressed while held and begins on release; Esc goes back and keeps the current hero. Keys never reach the world behind it. Selection always combines the glowing frame, the check badge and the Selected label.

${img('input-card-hover.webp','Unselected card on hover')} ${img('input-card-pressed.webp','Card pressed')}

${img('input-button-states.webp','Begin Journey default, hover or keyboard focus, and pressed textures')}

| Check (game build in Chromium) | Result | Detail |
|---|---|---|
${checks}

## Crispness at DPR 1, 2, 3 and 2.625

Edge width is measured on each text crop: the mean run of pixels between 10 % and 90 % of the crop's contrast, in device pixels (1 px is an ideal anti-aliased edge). Viewport 1280 × 720. Text edges stay between ${Math.min(...edges).toFixed(2)} and ${Math.max(...edges).toFixed(2)} device px at every DPR. Selected reads ${Math.min(...crisp.map(c=>c.edges.Selected)).toFixed(1)}–${Math.max(...crisp.map(c=>c.edges.Selected)).toFixed(1)} px because its crop also catches the card name just above it and the glowing gold frame behind it (visible in the sheets), so the scan measures those gradients rather than the label's own edge. The stage scale at 1280 × 720 is ${crisp[0].stageScale}, so frames load ${picks}.${full?` The full 1672 × 941 composition at DPR 2.625 loads @${full.frameScale}x.`:''} The sheets also show Begin Journey, a card and an icon at device resolution (frame crops are not measured).

${crispTable}

${crisp.map(c=>img(c.file,`Choose Your Hero at DPR ${c.dpr}, frames @${c.frameScale}x`)).join('\n\n')}

## Console errors and co-op

${E.consoleErrors.length?`Console errors: ${E.consoleErrors.join('; ')}`:'No console or page errors on any capture page (all shots, comparisons, highlights, crispness and input checks).'} ${smoke?`Co-op smoke test (${repo('scripts/coop-smoke.mjs')}): ${smoke.ok?'passed':'**failed**'}${smoke.commonTicks?`, ${smoke.commonTicks} common ticks`:''}.`:''}

## Known differences from the references

- The art is the kit's own (castle, hero figures, portraits, frames), so figures, portraits and ornaments differ from the reference paintings. The kit frames' ornaments are heavier, so frame boxes are set so the rails, not the ornament tips, land on the reference rails.
- The kit's Ember Warden master has a ~1.27× larger head/face scale than Rift Runner's wider master. Both the main standing figures (\`ART_SCALE\`: \`0.95\` for Ember Warden, \`1.21\` for Rift Runner) and the card portraits (\`0.88×\` for Ember Warden, \`1.12×\` for Rift Runner in \`build-ui.mjs\`) are scaled so both heroes have matching head, face, and shoulder proportions.
- Both Ember Warden and Rift Runner now use the full portrait detail panel (hero name, description, \`LOADOUT\` subheader, skill slots, and automatic-cast help line), replacing the earlier compact \`LOADOUT\`-only header on Ember Warden:

  ${img('task-attachment-ember-before.jpg','Reported issue: Ember Warden mobile previously showed LOADOUT instead of hero name and description')} ${img('task-attachment-rift-reference.jpg','Target mobile layout reference: Rift Runner displaying hero name, description, LOADOUT and help line')}
- Text is the reference's size on mobile (about 11–13 CSS px on a 390 px phone), as the overlay requires; landscape phones get their own larger composition instead.

## Files and rebuild

- Screen: ${repo('src/stronghold/choose-hero.ts','choose-hero.ts')} · highlights: ${repo('src/stronghold/choose-hero-fx.ts','choose-hero-fx.ts')} · picker flow: ${repo('src/stronghold/hero-picker.ts','hero-picker.ts')} · roles: ${repo('src/typography/tokens.ts','tokens.ts')} · split frames: ${repo('src/typography/frames.ts','frames.ts')}
- UI set: \`node scripts/choose-hero/build-ui.mjs\` · highlights: \`npm run vfx\` · evidence: \`node scripts/choose-hero/capture.mjs [shots|compare|fx|crisp|input|all]\` (production build served by vite preview) · this page: \`node scripts/choose-hero/publish-knowledge.mjs\`
- Evidence data: ${repo('docs/choose-hero/evidence.json')}
`;
fs.writeFileSync(`${D}/screen.md`,md);
if(dry){console.log(md.length,'chars (dry run)');process.exit(0);}
const pages=cli(['knowledge','list','--project','PJ8758f22f61165f3d3215e454']),list=Array.isArray(pages)?pages:pages.documents??pages.items??[];
const existing=list.find(p=>p.title===TITLE&&p.parent_id===PARENT);
const siblings=list.filter(p=>p.parent_id===PARENT).map(p=>p.sort_order??0);
const page=existing?cli(['knowledge','update',existing.id,'--markdown',md]):cli(['knowledge','create','--project','PJ8758f22f61165f3d3215e454','--title',TITLE,'--parent',PARENT,'--sort-order',String(Math.max(0,...siblings)+10),'--markdown',md]);
receipts.page=page.id??page.document?.id??existing?.id;save();
console.log('Knowledge page',receipts.page,Object.keys(receipts.attachments).length,'images');
