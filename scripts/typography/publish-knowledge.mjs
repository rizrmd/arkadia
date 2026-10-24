// Publish the Typography Rendering Sample Knowledge page: every image inline (uploaded as discussion attachments),
// the text-role token table read from src/typography/tokens.ts, and the same markdown in docs/typography/sample.md.
//   node scripts/typography/publish-knowledge.mjs [--dry]
// Upload receipts are kept in docs/typography/v2/publication.json, so re-running only uploads new or changed files.
import fs from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {ROLES,FONTS} from '../../src/typography/tokens.ts';
const PAGE='NKBDdb2b11d05be02c9301d0bedc',ROOM='DRcf2ef6dd892ac62cb18a5766',ORG='ORd5dd6f99b4308d6187031557',REPO='RPe11327fbfe413dbeba246526';
const LIVE='https://ark-whachat.fural.space/typography/';
const D='docs/typography/v2',dry=process.argv.includes('--dry');
const cli=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',maxBuffer:16e6}));
const receiptsFile=`${D}/publication.json`,receipts=fs.existsSync(receiptsFile)?JSON.parse(fs.readFileSync(receiptsFile,'utf8')):{attachments:{}};
const live=fs.existsSync(`${D}/live.json`)?JSON.parse(fs.readFileSync(`${D}/live.json`,'utf8')):null;
const evidence=JSON.parse(fs.readFileSync(`${D}/evidence.json`,'utf8'));
function upload(file){
 const sha=createHash('sha256').update(fs.readFileSync(file)).digest('hex'),r=receipts.attachments[file];
 if(r?.sha256===sha)return r.url;
 if(dry)return `/dry-run/${file}`;
 const res=cli(['messages','upload','--file',file,'--kind','photo','--room',ROOM]);
 receipts.attachments[file]={id:res.id,url:res.url,sha256:sha};fs.writeFileSync(receiptsFile,JSON.stringify(receipts,null,1)+'\n');
 return res.url;
}
const img=(file,alt)=>`![${alt}](${upload(file)})`;
const repo=(path,label=path)=>`[${label}](/organizations/${ORG}/repositories/${REPO}/files?file=${encodeURIComponent(path)})`;
const hex=c=>'#'+c.toString(16).padStart(6,'0');
const fill=f=>Array.isArray(f)?`gradient ${f.map(hex).join(' → ')}`:hex(f);
const stroke=s=>s?`${hex(s.color)} ${Math.round(s.alpha*100)}% · ${s.width}px`:'—';
const shadow=s=>s?`${hex(s.color)} ${Math.round(s.alpha*100)}% · (${s.dx}, ${s.dy}) · soft ${s.softness}px`:'—';
const USE={'display-title':'CHOOSE YOUR HERO','display-name':'EMBER WARDEN, mobile Loadout','display-button':'BEGIN JOURNEY','label-wide':'LOADOUT','body-lg':'Subtitle, card names','body':'Back, description, skill names, Empty','accent':'Selected, Lv. 1','paragraph':'Skills cast automatically… (wrapped)',
 'hud-name':'Ember Warden','hud-value':'96 / 100 HP','hud-stat':'250 Gold, 06:27, Wilds','hud-level':'9','hud-skill':'Flame Fan, Rift Trap, Seismic Slam','hud-badge':'Lv. 1','hud-state':'AUTO','hud-xp':'60','hud-xp-accent':'/ 100 XP','hud-key':'W A S D, Esc','hud-hint':'· Move, · Menu',
 'tag-ally':'Overhead ally / party name tags','tag-foe':'Overhead enemy & gate name tags',
 'combat-hit':'Floating player damage numbers','combat-crit':'Floating critical hit numbers','combat-crit-label':'CRITICAL badge over crit hits','combat-incoming':'Floating incoming damage numbers','combat-heal':'Floating heal numbers','combat-banner':'Zone / victory / defeat banner title','combat-banner-sub':'Zone / victory / defeat banner subtitle',
 'panel-title':'Popover & modal headers (Clock, Co-op, Blessings, Loading)','panel-label':'Popover section & status labels','panel-body':'Popover body & button labels','panel-muted':'Secondary hints & loading status','panel-error':'Co-op error & warning text','blessing-title':'Blessing card title','blessing-desc':'Blessing card wrapped description'};
const tokenRows=Object.entries(ROLES).map(([name,r])=>`| \`${name}\` | ${USE[name]??''} | ${FONTS[r.font].family} ${FONTS[r.font].weight} | ${r.size} | ${r.letterSpacing}${r.uppercase?' · caps':''} | ${fill(r.fill)} | ${stroke(r.outline)} | ${shadow(r.shadow)} | ${stroke(r.glow)} |`).join('\n');
const C=Object.fromEntries(evidence.compare.map(c=>[c.name,c]));
const pair=(name,title)=>`### ${title}\n\n${C[name].label} · ${C[name].pixels.join(' × ')} device px, the reference scaled to the same size.\n\n${img(`${D}/${name}-side-by-side.webp`,`${title}: reference and result side by side`)}\n\n${img(`${D}/${name}-overlay.webp`,`${title}: result with the reference overlaid at 50 %`)}`;
const crisp=evidence.crisp;
// Crops overlapped by ornaments are listed but not summarised (see the note under the table).
const ORNAMENTED=['Ember Warden'];
const range=(fix,dpr)=>{const v=crisp.filter(c=>c.fix===fix&&(dpr===undefined||c.dpr===dpr)).flatMap(c=>Object.entries(c.edges).filter(([t])=>!(c.screen==='hero'&&ORNAMENTED.includes(t))).map(([,e])=>e)).filter(x=>x!=null);return `${Math.min(...v).toFixed(1)}–${Math.max(...v).toFixed(1)}`;};
const edgeTable=['hud','hero'].map(screen=>{
 const rows=crisp.filter(c=>c.screen===screen),texts=Object.keys(rows[0].edges);
 return `| ${screen==='hud'?'HUD':'Choose Your Hero'} | ${texts.map(t=>t.replace(/\|/g,'')).join(' | ')} |${screen==='hud'?' Frames |':''}\n|---|${texts.map(()=>'---:').join('|')}|${screen==='hud'?'---|':''}\n`+
  rows.map(r=>`| DPR ${r.dpr} · ${r.fix?'this module':'Pixi stock'} | ${texts.map(t=>r.edges[t]??'—').join(' | ')} |${screen==='hud'?` @${r.frameScale}x |`:''}`).join('\n');
}).join('\n\n');
const crispImages=crisp.map(c=>img(`${D}/${c.file}`,`${c.screen==='hud'?'HUD':'Choose Your Hero'} at DPR ${c.dpr}, ${c.fix?'resolution-aware edge':'Pixi stock edge'}`)).join('\n\n');

const md=`## Result

The HUD sample and a new Choose Your Hero sample now share one Pixi v8 typography module: MSDF BitmapText in two self-hosted OFL fonts, named text-role tokens, and an effect shader for gradients, outlines, glow and soft shadows. HUD frames are bronze bitmaps generated as @3x masters with @2x/@1x downscales and drawn as 9-slices. Every word on both screens is live MSDF text. The ARKODIA logo stays an image. Extras that are not in the reference, such as CRITICAL 248, are removed.

Live sample: [${LIVE}](${LIVE}) ([Choose Your Hero](${LIVE}?screen=hero)). Toolbar: screen, hero, glow, and a reference-overlay slider.

## Live deployment

${live?`Checked ${live.checked.slice(0,16).replace('T',' ')} UTC by ${repo('scripts/typography/verify-live.mjs','verify-live.mjs')}: ${live.results.map(r=>`${r.name.replace('live-','')} at ${r.viewport.join(' × ')} DPR ${r.dpr} (${r.texts} live texts, ${r.errors.length?r.errors.length+' errors':'no errors'})`).join('; ')}.

${live.results.map(r=>img(`${D}/${r.name}.webp`,`Live ${r.name.replace('live-','')} capture`)).join('\n\n')}`:'Not checked yet.'}

## Reference 1 — HUD

${`![Reference 1: HUD typography target](/api/organizations/${ORG}/task-attachments/TA114f71174983c55c7fe5186b)`}

## Reference 2 — Choose Your Hero

${img('public/typography/v2/references/choose-your-hero-desktop.png','Reference 2: Choose Your Hero, desktop')}

Mobile comparisons use the Choosing Hero mobile references: ${img('public/typography/v2/references/ember-warden-mobile.png','Choosing Hero mobile reference, Ember Warden')} ${img('public/typography/v2/references/rift-runner-mobile.png','Choosing Hero mobile reference, Rift Runner')}

## HUD: reference vs result

${pair('hud-desktop','HUD desktop')}

${pair('hud-mobile','HUD phone landscape')}

## Choose Your Hero: reference vs result

${pair('hero-desktop-ember','Desktop, Ember Warden (Reference 2)')}

${pair('hero-desktop-rift','Desktop, Rift Runner')}

${pair('hero-mobile-ember','Mobile, Ember Warden')}

${pair('hero-mobile-rift','Mobile, Rift Runner')}

## Text roles

One module (${repo('src/typography/tokens.ts')}) defines the roles, and both screens use it. Sizes and widths are design pixels on the screen's reference canvas (1672 × 941 desktop, 864 × 1824 mobile). The scene scale converts them to CSS pixels. A screen may override a role's size, for example when the mobile title runs larger. Gradients run from the cap top to the baseline and are evaluated in the shader. Glow is optional and switched on per scene.

| Token | Used for | Font | Size | Letter spacing | Fill | Outline | Shadow | Glow (optional) |
|---|---|---|---:|---|---|---|---|---|
${tokenRows}

Paragraph wrapping: the role sets wrap and centre, and the screen passes the wrap width from its panel. Desktop uses the panel width minus 40 px per side (405 px), which breaks the help text into the reference's two sentences. Mobile uses the panel width minus 70 px per side (676 px).

## Fonts

- Body: **EB Garamond Medium** (500). Display caps: **Cinzel SemiBold** (600). Cinzel's lower case is small caps, so "Ember Warden" and "Begin Journey" set with tall initials, as in the reference. Both are SIL Open Font License 1.1: ${repo('assets-src/typography/fonts/EBGaramond-OFL.txt','EB Garamond licence')}, ${repo('assets-src/typography/fonts/Cinzel-OFL.txt','Cinzel licence')}. The licences also ship next to the atlases.
- MSDF atlases: msdf-bmfont-xml at 64 px with a 16 px distance range. Overlapping contours are removed first. Kerning pairs (752 for Garamond, 1711 for Cinzel) are measured with Chromium's shaper, because the tool cannot read EB Garamond's GPOS kerning. Files: ${repo('public/typography/v2/fonts/garamond-medium.fnt')}, ${repo('public/typography/v2/fonts/cinzel-semibold.fnt')}.
- Two Pixi v8 issues are handled:
  - Pixi 8.22's text-format BMFont parser drops the \`distanceField\` line, so the font renders as a plain bitmap. The atlases are written as BMFont XML instead.
  - Pixi computes the MSDF edge width without the renderer resolution, so text gets softer as devicePixelRatio rises. ${repo('src/typography/msdf.ts')} corrects this and adds the effect shader.

## Frames

${img(`${D}/hud-frames-sheet.png`,'HUD frames, icons and art at @3x with 9-slice borders')}

Drawn in the Choosing Hero kit's bronze language: dark gold rails with a pale top highlight, near-black fills and four-point compass stars as finials. Every stretchable frame is a NineSliceSprite with the borders in ${repo('public/typography/v2/hud/manifest.json','manifest.json')}: pills, key plate, keycaps, hero plate, HP and XP frames and fills, and the Lv/AUTO badges. Rings, medallion, icons and art keep a fixed size. The set is chosen from **devicePixelRatio × scene scale**, rounded up to @1x, @2x or @3x. At 1280 × 720 (scene scale ${crisp[0].sceneScale}) the captures loaded ${crisp.filter(c=>c.screen==='hud'&&c.fix).map(c=>`@${c.frameScale}x at DPR ${c.dpr}`).join(', ')}; the full 1672 × 941 layout at DPR 2.625 loads @3x. Choose Your Hero reuses the kit's frames, art and English labels read-only; the kit files are not modified.

## Crispness at DPR 1, 2, 3 and 2.625

Edge width is measured on each text crop: the average run of pixels between 10 % and 90 % of the crop's contrast, in device pixels. One pixel is an ideal anti-aliased edge. Viewport 1280 × 720. "Pixi stock" uses Pixi's own edge width (\`?fix=0\`).

${edgeTable}

With the correction, text edges stay at ${range(true)} device px at every DPR. Pixi's stock edge widens with DPR, to ${range(false,3)} px at DPR 3. Begin Journey is shown in the sheets but not measured: it is a dark-bottomed gold gradient on a red button with gold rails, and with that little luminance contrast the scan measures the gradient rather than the edge. The panel title Ember Warden reads about 3–3.8 px at DPR 2 and above in both modes for the same reason: the panel's compass crest and gradient rails overlap its crop, as the sheets show. It is listed in the table but left out of the ranges. Display caps are measured on CHOOSE YOUR HERO.

${crispImages}

## Optional glow

${img(`${D}/fx-glow.png`,'Glow off and on for display caps and HUD skill names')}

## Known differences from the references

- Character art, card frames, panels and buttons on Choose Your Hero are the kit's own art, so the hero figure, card portraits and ornaments differ from the reference paintings. The kit frame's heavier bottom rail moves the desktop card labels about 15 px higher.
- The HUD skill art for Rift Trap and Seismic Slam is painted procedurally. Flame Fan and the portrait reuse kit masters. The HUD backdrop is the reference with its painted HUD patched out, so the rebuilt HUD sits on the same scene.
- XP: the bar shows the real 60 %, and the value sits just past the fill's end. The reference paints the fill at about 43 % with the label at its end.
- The phone-landscape HUD keeps the reference arrangement at one scale. In portrait the skill row moves above the key hints.

## Run and rebuild

\`npx vite -c vite.typography.config.ts\` serves the sample at http://127.0.0.1:3047/typography/. The build output is \`dist/typography-sample\`. ${repo('scripts/typography/README.md','Pipeline README')} lists every rebuild step: fonts, frames, logo, backdrop, evidence and this page.

- Code: ${repo('src/typography/tokens.ts','tokens')} · ${repo('src/typography/msdf.ts','MSDF shader')} · ${repo('src/typography/text.ts','text')} · ${repo('src/typography/frames.ts','frames')} · ${repo('src/typography/hud.ts','HUD')} · ${repo('src/typography/hero-select.ts','Choose Your Hero')}
- Evidence data: ${repo(`${D}/evidence.json`)}

## Full Game UI Migration to Pixi v8 + MSDF Typography

Every screen, HUD element, popover, modal, and world label in the playable game now renders in Pixi v8 using the shared MSDF typography module (${repo('src/typography/tokens.ts')}, \`MsdfText\`, \`installMsdfFx\` with DPR-aware edge correction, and \`FrameSet\` \`@1x/@2x/@3x\` 9-slice bronze frames). All legacy HTML/CSS overlays and stylesheets (\`src/style.css\`, \`src/stronghold/style.css\`, \`src/stronghold/progression.css\`, \`src/expedition/style.css\`, \`src/expedition/snow.css\`, \`src/characters/ui.ts\`) have been removed.

### Unavoidable DOM Exception

During play, \`div#app\` holds only:
1. \`canvas#world-canvas\` — the single WebGL2 Pixi canvas rendering the 3D/2.5D world and all UI layers.
2. \`input#coop-keyboard-proxy\` — a 1×1 px off-screen transparent \`<input type="text" aria-hidden="true">\` managed by ${repo('src/stronghold/net/lobby.ts')}. Mobile browsers (iOS Safari / Android Chrome) only summon the native soft keyboard when a real DOM \`<input>\` receives focus inside a user pointer gesture; this hidden input proxies keystrokes into the Pixi Co-op Lobby room-code and player-name fields. Zero stylesheets (\`document.styleSheets.length === 0\`) are loaded.

### Before vs. After (HTML/CSS DOM → Pixi v8 + MSDF)

#### 1. Loading Screen (\`src/app/loader.ts\`)

Replaced \`#loading-screen\` in \`index.html\` with a Pixi v8 stage displaying the \`ARKODIA\` logo (\`@1x/@2x/@3x\`), \`MsdfText\` status and progress readouts (\`panel-title\`, \`panel-muted\`), and a 9-slice bronze progress bar (\`xp-frame\` + \`xp-fill\`).

${img('docs/pixi-ui/compare-loading-desktop.webp','Loading screen before (HTML/CSS) and after (Pixi v8 + MSDF) on desktop (1440×900 DPR 1)')}

${img('docs/pixi-ui/compare-loading-mobile.webp','Loading screen before (HTML/CSS) and after (Pixi v8 + MSDF) on mobile (390×844 DPR 2)')}

#### 2. Choose Your Hero (\`src/stronghold/hero-picker.ts\` & \`src/typography/hero-select.ts\`)

Replaced the DOM hero cards and CSS layout with the interactive Pixi \`HeroSelect\` scene (\`MsdfText\`, \`FrameSet\`, interactive card selection, keyboard shortcuts \`1\`/\`2\`/\`ArrowLeft\`/\`ArrowRight\`/\`Enter\`/\`Space\`, and responsive desktop + mobile portrait layout).

${img('docs/pixi-ui/compare-hero-picker-desktop.webp','Choose Your Hero before (HTML/CSS) and after (Pixi v8 + MSDF) on desktop (1440×900 DPR 1)')}

${img('docs/pixi-ui/compare-hero-picker-mobile.webp','Choose Your Hero before (HTML/CSS) and after (Pixi v8 + MSDF) on mobile (390×844 DPR 2)')}

#### 3. In-Game HUD, Overhead Tags, Combat VFX & Virtual Thumbstick (\`src/typography/hud.ts\`, \`src/stronghold/encounters.ts\`, \`src/stronghold/combat-vfx.ts\`)

Replaced the DOM HUD, party list, and skill strip with the interactive Pixi \`HudScene\` (\`@1x/@2x/@3x\` 9-slice bronze frames, live HP/XP bars, clickable skill slots with cooldown sweeps and star pips, interactive Clock/Zone/Co-op/Reset/Hero pills, and a Pixi virtual thumbstick for touch movement). Overhead ally/enemy/gate labels and floating combat numbers now use pooled \`MsdfText\` roles (\`tag-ally\`, \`tag-foe\`, \`combat-hit\`, \`combat-crit\`, \`combat-crit-label\`, \`combat-incoming\`, \`combat-heal\`, \`combat-banner\`).

${img('docs/pixi-ui/compare-hud-desktop.webp','In-game HUD before (HTML/CSS) and after (Pixi v8 + MSDF) on desktop (1440×900 DPR 1)')}

${img('docs/pixi-ui/compare-hud-mobile.webp','In-game HUD before (HTML/CSS) and after (Pixi v8 + MSDF) on mobile (390×844 DPR 2)')}

#### 4. World Clock & Lighting Popover (\`src/stronghold/clock.ts\`)

Replaced the DOM time-of-day popover with a Pixi 9-slice bronze panel featuring a draggable time scrubber, live/hold toggle, preset buttons (\`Dawn\`, \`Noon\`, \`Dusk\`, \`Midnight\`), and \`Esc\` / outside-tap dismissal.

${img('docs/pixi-ui/compare-clock-desktop.webp','Clock popover before (HTML/CSS) and after (Pixi v8 + MSDF) on desktop (1440×900 DPR 1)')}

${img('docs/pixi-ui/compare-clock-mobile.webp','Clock popover before (HTML/CSS) and after (Pixi v8 + MSDF) on mobile (390×844 DPR 2)')}

#### 5. Level-Up Blessing Modal (\`src/stronghold/encounters.ts\`)

Replaced the DOM blessing modal with a Pixi 9-slice bronze modal and three interactive blessing cards (\`blessing-title\`, \`blessing-desc\`, \`panel-label\`, \`panel-title\`), supporting both pointer clicks and keyboard keys \`1\`/\`2\`/\`3\`.

${img('docs/pixi-ui/compare-blessing-desktop.webp','Level-up blessing modal before (HTML/CSS) and after (Pixi v8 + MSDF) on desktop (1440×900 DPR 1)')}

${img('docs/pixi-ui/compare-blessing-mobile.webp','Level-up blessing modal before (HTML/CSS) and after (Pixi v8 + MSDF) on mobile (390×844 DPR 2)')}

#### 6. Co-op Lobby Popover (\`src/stronghold/net/lobby.ts\`)

Replaced the DOM co-op drawer with a Pixi 9-slice bronze popover supporting room creation, room code entry, player name editing, invite link copying, and party member status readouts.

${img('docs/pixi-ui/after-lobby-desktop.webp','Co-op lobby popover in Pixi v8 + MSDF on desktop (1440×900 DPR 1)')}

${img('docs/pixi-ui/after-lobby-mobile.webp','Co-op lobby popover in Pixi v8 + MSDF on mobile (390×844 DPR 2)')}

### Verification & Smoke Tests

- **UI & DOM Audit** (${repo('scripts/verify-pixi-ui.mjs')} → ${repo('docs/pixi-ui/verification.json')}): Verified on desktop (\`1440×900\` DPR 1) and mobile (\`390×844\` DPR 2) with \`0\` console errors, \`0\` page errors, \`0\` stylesheets, only \`canvas#world-canvas\` + \`input#coop-keyboard-proxy\` in the DOM, and full pointer/keyboard interaction across Hero Picker, HUD, Clock Popover, Blessing Modal, and Co-op Lobby.
- **Co-op Smoke Test** (${repo('scripts/coop-smoke.mjs')} → ${repo('docs/coop/smoke.json')}): Passed (\`ok: true\`, 806 common ticks, 14 enemies, level-up blessing offers verified across synced clients).
`;
fs.writeFileSync('docs/typography/sample.md',md);
if(dry){console.log(md.slice(0,3000));process.exit(0);}
cli(['knowledge','update',PAGE,'--markdown',md]);
receipts.page={id:PAGE,updated:new Date().toISOString(),images:(md.match(/!\[/g)||[]).length};
fs.writeFileSync(receiptsFile,JSON.stringify(receipts,null,1)+'\n');
console.log('Updated',PAGE,'with',receipts.page.images,'inline images');
