// Runtime UI set for the Choose Your Hero screen (src/stronghold/choose-hero.ts), built from the Choosing Hero kit
// (docs/choosing-hero, commit 1a413f1). The kit is read only: generated masters in assets-src/choosing-hero/v1, art and
// English labels in public/choosing-hero/v1.
//   node scripts/choose-hero/build-ui.mjs
// Writes public/assets/choose-hero/{@1x,@2x,@3x}/<name>.png, art/*, labels.en.json and manifest.json, and the slice
// sheet docs/choose-hero/ui-slices.png.
// Every UI texture is an @3x master cut from the trimmed generated master (Lanczos), then downscaled to @2x and @1x.
// @1x is the size the screen draws it in design pixels, so FrameSet picks @1x/@2x/@3x from devicePixelRatio × scene scale.
// The kit frames carry ornaments in the middle of their edges (crests, finials, side stars), which a plain 9-slice would
// stretch. They are split into quadrants (frames) or halves (button, divider): each part is a 9-slice whose outer corner
// and inner half-ornament stay fixed, so only the plain rails between them stretch. FrameSet.frame() reassembles them.
import fs from 'node:fs';import sharp from 'sharp';
const MASTERS='assets-src/choosing-hero/v1/',KIT='public/choosing-hero/v1/',OUT='public/assets/choose-hero/',DOCS='docs/choose-hero/';
const SCALES=[1,2,3];
for(const s of SCALES)fs.mkdirSync(`${OUT}@${s}x`,{recursive:true});
fs.mkdirSync(OUT+'art',{recursive:true});fs.mkdirSync(DOCS,{recursive:true});

const trimmed=name=>sharp(MASTERS+name+'.png').trim({background:'#00000000',threshold:5}).png().toBuffer();
// @1x sizes follow the master's aspect, so nothing is squashed. Fractions are of the full frame: corner reach (cx; ct/cb
// top and bottom), half-width of the top/bottom centre ornament (mx) and half-height of the side ornament (my).
const QUAD={
 'card-frame':{size:[324,396],cx:.17,ct:.15,cb:.15,mx:.12,my:.02},
 'card-frame-selected':{master:'card-frame-selected',size:[324,396],cx:.17,ct:.16,cb:.16,mx:.1,my:.08},
 'panel-desktop':{size:[486,636],cx:.15,ct:.17,cb:.13,mx:.16,my:.045},
 'panel-mobile':{size:[816,356],cx:.11,ct:.26,cb:.26,mx:.08,my:0},
};
// The four button states share the default's box so they swap without shifting.
const HALVES={
 'button-default':{size:[644,164],cx:.13,mx:.075},'button-hover':{size:[644,164],cx:.13,mx:.075},
 'button-pressed':{size:[644,164],cx:.13,mx:.075},'button-disabled':{size:[644,164],cx:.13,mx:.075},
 'divider':{size:[456,40],cx:.12,mx:.075},
};
const FIXED={'back':[80,80],'selected-badge':[66,66],'skill-flame-fan':[150,150],'skill-rift-bolt':[150,150],'skill-empty':[150,150]};

const manifest={version:1,source:'Choosing Hero kit, commit 1a413f1 (read only)',frames:{},ornate:{},art:{}};
async function writeScales(name,master3){
 // master3 is the @3x texture; @2x/@1x are Lanczos downscales of it.
 const {width,height}=await sharp(master3).metadata();
 for(const s of SCALES){const w=Math.round(width*s/3),h=Math.round(height*s/3);
  await (s===3?sharp(master3):sharp(master3).resize(w,h,{fit:'fill',kernel:'lanczos3'})).png({compressionLevel:9}).toFile(`${OUT}@${s}x/${name}.png`);}
}
const px=(f,total)=>Math.round(f*total);
const sheet=[];
for(const [name,spec] of Object.entries(QUAD)){
 const [W,H]=spec.size,full=await sharp(await trimmed(spec.master??name)).resize(W*3,H*3,{fit:'fill',kernel:'lanczos3'}).png().toBuffer();
 const hw=W/2,hh=H/2,cx=px(spec.cx,W),ct=px(spec.ct,H),cb=px(spec.cb,H),mx=px(spec.mx,W),my=px(spec.my,H);
 const parts={tl:[0,0,[cx,ct,mx,my]],tr:[hw,0,[mx,ct,cx,my]],bl:[0,hh,[cx,my,mx,cb]],br:[hw,hh,[mx,my,cx,cb]]};
 for(const [p,[x,y,slice]] of Object.entries(parts)){
  await writeScales(`${name}.${p}`,await sharp(full).extract({left:x*3,top:y*3,width:hw*3,height:hh*3}).png().toBuffer());
  manifest.frames[`${name}.${p}`]={width:hw,height:hh,slice};
 }
 manifest.ornate[name]={width:W,height:H,split:'quad'};
 sheet.push({name,full,W,H,lines:{x:[cx,hw-mx,hw,hw+mx,W-cx],y:[ct,hh-my,hh,hh+my,H-cb]}});
}
for(const [name,spec] of Object.entries(HALVES)){
 const [W,H]=spec.size,full=await sharp(await trimmed(name)).resize(W*3,H*3,{fit:'fill',kernel:'lanczos3'}).png().toBuffer();
 const hw=W/2,cx=px(spec.cx,W),mx=px(spec.mx,W);
 for(const [p,x,slice] of [['l',0,[cx,0,mx,0]],['r',hw,[mx,0,cx,0]]]){
  await writeScales(`${name}.${p}`,await sharp(full).extract({left:x*3,top:0,width:hw*3,height:H*3}).png().toBuffer());
  manifest.frames[`${name}.${p}`]={width:hw,height:H,slice};
 }
 manifest.ornate[name]={width:W,height:H,split:'halves'};
 sheet.push({name,full,W,H,lines:{x:[cx,hw-mx,hw,hw+mx,W-cx],y:[]}});
}
for(const [name,[W,H]] of Object.entries(FIXED)){
 await writeScales(name,await sharp(await trimmed(name)).resize(W*3,H*3,{fit:'contain',background:'#00000000',kernel:'lanczos3'}).png().toBuffer());
 manifest.frames[name]={width:W,height:H};
}
// Card portraits: the kit's recipe (docs/choosing-hero/assemble.mjs) at 3× its 320 × 400 card, warm or cool backing,
// hero crop (lowered, see DROP), dark lower fade, rounded window. The kit fits its 320 × 400 frame into that card (contain), so the
// strip the frame leaves above and below is cropped and the result matches the 324 × 396 frame exactly.
const svg=(w,h,body)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 320 400" preserveAspectRatio="none">${body}</svg>`);
for(const [id,color,k,drop,dx] of [['ember-warden','#962509',.88,46,8],['rift-runner','#07516d',1.12,44,0]]){
 const S=3,W=320*S,H=400*S,rw=Math.round(440*S*k),rh=Math.round(660*S*k),left=Math.round((rw-W)/2+dx*S),cropH=Math.min(rh,H-drop*S);
 const bg=svg(W,H,`<defs><radialGradient id="g"><stop stop-color="${color}"/><stop offset="1" stop-color="#050607"/></radialGradient></defs><rect width="320" height="400" fill="url(#g)"/>`);
 // The kit crops the figure flush with the card top, which cuts the hair under the frame's top rail and crest: the
 // figure starts drop card pixels lower and scales per hero (k) so both heads and shoulders match inside the card window.
 const hero=await sharp(`${KIT}heroes/${id}.png`).resize(rw,rh,{fit:'fill',kernel:'lanczos3'}).extract({left,top:0,width:W,height:cropH}).extend({top:drop*S,bottom:Math.max(0,H-drop*S-cropH),background:'#00000000'}).png().toBuffer();
 const shade=svg(W,H,'<defs><linearGradient id="s" x2="0" y2="1"><stop offset="0.62" stop-color="#000" stop-opacity="0"/><stop offset="0.9" stop-color="#000" stop-opacity="0.95"/></linearGradient></defs><rect width="320" height="400" fill="url(#s)"/>');
 const window=svg(W,H,'<rect x="19" y="25" width="282" height="348" rx="10" fill="white"/>');
 const card=await sharp(bg).composite([{input:hero},{input:shade},{input:window,blend:'dest-in'}]).png().toBuffer();
 const frameH=320/1122*1372,strip=Math.round((400-frameH)/2*S);
 await writeScales(`portrait-${id}`,await sharp(card).extract({left:0,top:strip,width:W,height:H-2*strip}).resize(324*3,396*3,{fit:'fill',kernel:'lanczos3'}).png().toBuffer());
 manifest.frames[`portrait-${id}`]={width:324,height:396};
}
// Paintings keep their single kit resolution: backgrounds cover the viewport, heroes are top-aligned figures.
for(const [name,file] of [['castle-desktop','backgrounds/castle-desktop.png'],['castle-mobile','backgrounds/castle-mobile.png'],['ember-warden','heroes/ember-warden.png'],['rift-runner','heroes/rift-runner.png']]){
 fs.copyFileSync(KIT+file,`${OUT}art/${name}.png`);const m=await sharp(KIT+file).metadata();manifest.art[name]={file:`art/${name}.png`,width:m.width,height:m.height};
}
fs.copyFileSync(KIT+'labels.en.json',OUT+'labels.en.json');
fs.writeFileSync(OUT+'manifest.json',JSON.stringify(manifest,null,1)+'\n');

// Slice sheet: every split frame at @1x × 1.5 on a dark ground, with its part seams (solid) and 9-slice borders (dashed).
const Z=1.5,pad=24,tiles=[];let y=60,maxW=0;
for(const t of sheet){
 const w=Math.round(t.W*Z),h=Math.round(t.H*Z),img=await sharp(t.full).resize(w,h).png().toBuffer();
 const v=t.lines.x.map((x,i)=>`<line x1="${x*Z}" y1="0" x2="${x*Z}" y2="${h}" stroke="${i===2?'#4fd1ff':'#ff4f8b'}" stroke-width="1.5" ${i===2?'':'stroke-dasharray="6 4"'}/>`).join('');
 const hz=t.lines.y.map((yy,i)=>`<line x1="0" y1="${yy*Z}" x2="${w}" y2="${yy*Z}" stroke="${i===2?'#4fd1ff':'#ff4f8b'}" stroke-width="1.5" ${i===2?'':'stroke-dasharray="6 4"'}/>`).join('');
 const label=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(w,420)}" height="28"><text x="0" y="20" font-family="DejaVu Sans, sans-serif" font-size="18" fill="#f1e2c0">${t.name} · @1x ${t.W} × ${t.H} · ${manifest.ornate[t.name].split}</text></svg>`);
 tiles.push({input:label,left:pad,top:y},{input:img,left:pad,top:y+32},{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${v}${hz}</svg>`),left:pad,top:y+32});
 y+=h+32+pad;maxW=Math.max(maxW,w,420);
}
const title=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${maxW+2*pad}" height="44"><rect width="100%" height="100%" fill="#14110d"/><text x="${pad}" y="30" font-family="DejaVu Sans, sans-serif" font-size="20" fill="#f1e2c0">Choose Your Hero UI: split seams (blue) and fixed 9-slice borders (pink dashed)</text></svg>`);
await sharp({create:{width:maxW+2*pad,height:y,channels:3,background:'#2b2622'}}).composite([{input:title,left:0,top:0},...tiles]).png().toFile(DOCS+'ui-slices.png');
console.log(`${Object.keys(manifest.frames).length} textures × 3 scales, ${Object.keys(manifest.ornate).length} split frames → ${OUT}`);
