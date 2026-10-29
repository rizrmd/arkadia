import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const root='public/ember-warden/v2',docs='docs/ember-warden-v2',base='https://ark-whachat.fural.space/ember-warden-review/v2/';
const run=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',timeout:120000,maxBuffer:8e6}));
const pages=run(['knowledge','list','--project','PJ8758f22f61165f3d3215e454']);
const conceptId='NKBDc8ca8c735a55009062b64a64',sourceId='NKBDa71ebbfe31f5a794f33f045a',reviewId='NKBD5ffd3b14510c319ca962d83f';
for(const id of [conceptId,sourceId,reviewId])if(!pages.some(p=>p.id===id))throw Error('Missing existing character page '+id);
const section='## Painted redesign — v03';
const previousConcept=run(['knowledge','get',conceptId]).markdown;
const marker='<!-- ember-painted-archive -->';
const archive=previousConcept.includes(marker)?previousConcept.split(marker)[1]:previousConcept.replace('## Current character sheet — v02','## Earlier character sheet — v02');
const concept=`${section}\n\nEmber Warden has been redesigned as a female firekeeper with long flowing dark hair to match Rift Runner's painted fantasy RPG style: textured canvas and leather, confident dark edges, compact adult proportions, and warm bronze highlights. The ochre jacket, long dark hair and right-arm furnace gauntlet preserve Ember's identity.\n\n[Open the interactive painted art viewer](${base}) · [Legacy animation timing viewer](https://ark-whachat.fural.space/ember-warden-review/).\n\n### Eight-direction turnaround\n\n![Ember Warden painted turnaround, all eight directions](${base}source/turnaround.png)\n\n### Skill and standard-state key poses\n\nReading order: idle, run, Flame Fan, Cinder Step; Ember Snare, Furnace Heart, hurt, death. These are painted key poses, not an animated production atlas.\n\n![Ember Warden painted action key poses](${base}source/action-poses.png)\n\n### Scope and verification\n\nThe art redesign is implemented and published. The viewer includes a four-frame alternating run study per heading, a before/after comparison with Rift, a snow contrast check and pose details. Local and deployed-page checks pass at desktop and phone viewport widths; the source and exported sprite hashes match over public HTTPS.\n\nAll sources and exported images, including layout studies, are inline in the existing Animation Sources page.\n\n${marker}${archive}`;
await fs.writeFile(docs+'/knowledge-character.md',concept);
run(['knowledge','update',conceptId,'--markdown-file',docs+'/knowledge-character.md']);
const priorSource=run(['knowledge','get',sourceId]).markdown.split('\n'+section)[0];
let source=`${priorSource}\n\n${section}\n\n[Open painted art review](${base}). The built-in imagegen tool used the approved painted Rift idle sheet as the style reference, the old Ember render as the identity reference, and the new turnaround for later poses. The v1 3D model is retained for motion reference but is superseded as the art direction.\n\n${await fs.readFile(docs+'/README.md','utf8')}\n\n### Generated originals\n`;
const sourceDescriptions={
 'turnaround.png':'Selected painted character turnaround — eight directions',
 'action-poses.png':'Selected action key poses — revised layout with isolated effects',
 'action-poses-layout-study.png':'Earlier layout study — superseded because Flame Fan overlaps the neighboring cell',
 'run.png':'Run motion study — four phases per direction; gait and heading cleanup required',
 'flame-fan.png':'Rejected attack animation experiment — heading drift; excluded from playback'
};
const inline=[];
for(const [file,label]of Object.entries(sourceDescriptions)){const p='source/'+file;source+=`\n#### ${label}\n\n![${label}](${base+p})\n`;inline.push(p)}
source+='\n### Exported presentation sprites\n\nEach image below is an extracted presentation sprite. The fixed 384px cell and pivot are for this art viewer, not measured production foot contacts or VFX sockets.\n';
for(const file of (await fs.readdir(root+'/sprites')).sort()){const p='sprites/'+file;source+=`\n![${file.replace('.png','').replaceAll('-',' ')}](${base+p})\n`;inline.push(p)}
source+='\n### Browser evidence\n\nDesktop and phone viewport checks cover direction switching, the four-frame run study, snow contrast, all eight key-pose dialogs and manifest-load recovery. Public HTTPS is fetched through Node into Chromium because direct browser navigation times out in this sandbox. This is not a physical-device test.\n';
for(const file of (await fs.readdir(root+'/evidence')).filter(f=>f.endsWith('.png')).sort()){const p='evidence/'+file;source+=`\n![Painted art viewer ${file.replace('.png','').replaceAll('-',' ')}](${base+p})\n`;inline.push(p)}
source+='\n### Comparison references shown during the redesign\n\n![Approved painted Rift Runner idle reference](https://ark-whachat.fural.space/rift-runner/v1/source/idle-s-sw-w-nw.png)\n\n![Previous Ember 3D idle sheet, superseded style](https://ark-whachat.fural.space/ember-warden-review/sheets/idle-2.png)\n';
await fs.writeFile(docs+'/knowledge-sources.md',source);run(['knowledge','update',sourceId,'--markdown-file',docs+'/knowledge-sources.md']);
const priorReview=run(['knowledge','get',reviewId]).markdown;
const reviewMarker='<!-- ember-painted-legacy-review -->';
const legacy=priorReview.includes(reviewMarker)?priorReview.split(reviewMarker)[1]:priorReview;
const review=`${section}\n\n[Open the new painted character art review](${base}). This is the current visual direction, aligned to Rift Runner. Eight turnaround views and all four skill key poses are available with a run motion study, snow contrast check and style comparison.\n\nThe complete animation viewer below retains the earlier 3D exports for timing reference. Its style is superseded. The painted redesign does not yet replace its full body/VFX animation pack or the gameplay hero.\n\n${reviewMarker}${legacy}`;
await fs.writeFile(docs+'/knowledge-review.md',review);run(['knowledge','update',reviewId,'--markdown-file',docs+'/knowledge-review.md']);
const coverage={status:'published-inline',pages:[conceptId,sourceId,reviewId],inlineImages:inline.length,paths:inline};
await fs.writeFile(docs+'/knowledge-coverage.json',JSON.stringify(coverage,null,2)+'\n');console.log(JSON.stringify({status:coverage.status,pages:coverage.pages,inlineImages:coverage.inlineImages}));
