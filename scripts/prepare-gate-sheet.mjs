import{chromium}from'playwright';import fs from'node:fs/promises';import sharp from'sharp';
// Renders the gate door sprite sheet: two sequences (open, close) of the doorway region of the gateway, in gate
// display units (the gateway is drawn 270 wide, see scene.ts). Each frame holds the two leaves swinging inward about
// their hinges, clipped to the arch, darkening as they turn and showing their thickness at the free edge, plus the
// dust they kick up. The world raster keeps the open gateway (gateway-open.png), whose leaves are painted against
// the jambs; frames cover those until the swing reaches them, then cross-fade into them.
// Output: public/modular-stronghold/v2/gate-doors-sheet.webp + .json, docs/gate-sprite/contact.webp (review sheet).
const SRC='public/modular-stronghold/v2/',OUT='docs/gate-sprite';await fs.mkdir(OUT,{recursive:true});
const data=async f=>'data:image/png;base64,'+(await fs.readFile(SRC+f)).toString('base64');
const browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
const page=await browser.newPage();
const result=await page.evaluate(async({closed,open})=>{
 const load=src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src;});
 const grand=await load(closed),wide=await load(open);
 const W=270,REGION={x:80,y:52,w:110,h:110},S=2.5,FRAMES=20,COLS=8,MAX=75*Math.PI/180;
 const fw=REGION.w*S,fh=REGION.h*S;
 // Doorway outline of the closed leaves (display units); hinges at the jambs, leaves meet at x 135.
 const HINGE={'-1':97,'1':173},MEET=135,BOTTOM=145;
  // The arch opening a swung leaf stays inside (it passes behind the masonry).
 const arch=c=>{c.beginPath();c.moveTo(96.5,BOTTOM+.5);c.lineTo(96.5,80);c.bezierCurveTo(97,68,116,62,135,61.5);c.bezierCurveTo(154,62,173,68,173.5,80);c.lineTo(173.5,BOTTOM+.5);c.closePath();};
 // Each closed leaf, cut once at sheet resolution: its half of the whole arch, so the closed doors fill the arch
 // without a sliver of passage under the stones.
 const leaves={};for(const side of [-1,1]){const cv=document.createElement('canvas');cv.width=W*S;cv.height=Math.ceil(grand.height*W/grand.width*S);const c=cv.getContext('2d');c.scale(S,S);arch(c);c.clip();c.beginPath();c.rect(side<0?0:MEET,0,side<0?MEET:W,200);c.clip();c.drawImage(grand,0,0,W,grand.height*W/grand.width);leaves[side]=cv;}
 let seed=11;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 // Dust: every puff is gone by the last frame, which is the resting door. Soft puffs born at the sweeping bottom edges of the leaves, drifting out and up, growing and fading.
 function dustFor(kind){
  const list=[];const puff=(f,x,y,n,spread,speed,size)=>{for(let i=0;i<n;i++){const a=Math.PI*(.95+rnd()*1.1),v=speed*(.4+rnd()*.8);list.push({born:f+rnd()*.8,x:x+(rnd()-.5)*spread,y:y-rnd()*2,vx:Math.cos(a)*v*1.6,vy:Math.sin(a)*v*.55-.35*speed,r:size*(.5+rnd()*.7),life:Math.min(4+rnd()*4,FRAMES-1.05-f),grit:rnd()<.3});}};
  for(let f=1;f<11;f++){const t=angle(kind,f)/MAX;for(const side of [-1,1]){const x=HINGE[side]+(MEET-HINGE[side])*Math.cos(t*MAX);puff(f,x,BOTTOM-1,3,5,1.5,3.4);}}
  if(kind==='close')puff(10.6,MEET,BOTTOM,30,26,3,5.2);else for(const side of [-1,1])puff(10.5,HINGE[side]+side*-4,BOTTOM,12,8,1.8,4.2);
  return list;
 }
 const ease=x=>x*x*(3-2*x);
 // Leaf angle per frame: opening swings over frames 0-11, closing from frame 2 to 11 (it lands with a thud).
 function angle(kind,f){if(kind==='open')return MAX*ease(Math.min(1,f/11));return MAX*(1-(f<2?0:f>=11?1:(f-2)/9)**2);}
 // Cross-fade into the painted open leaves of the world sprite at the ends of the swing.
 const fade=(kind,f)=>kind==='open'?Math.min(1,Math.max(0,(f-10)/3)):Math.min(1,Math.max(0,1-f/2));
 const sheet=document.createElement('canvas');sheet.width=fw*COLS;sheet.height=fh*Math.ceil(FRAMES*2/COLS);const g=sheet.getContext('2d');
 const meta={image:'gate-doors-sheet.webp',scale:S,region:REGION,frame:{w:fw,h:fh},cols:COLS,fps:20,sequences:{}};
 ['open','close'].forEach((kind,row)=>{
  const dust=dustFor(kind),frames=[];
  for(let f=0;f<FRAMES;f++){
   const i=row*FRAMES+f,ox=(i%COLS)*fw,oy=Math.floor(i/COLS)*fh,th=angle(kind,f),c=1-fade(kind,f);
   g.save();g.beginPath();g.rect(ox,oy,fw,fh);g.clip();g.translate(ox,oy);g.scale(S,S);g.translate(-REGION.x,-REGION.y);
   if(c>0){
    g.save();arch(g);g.clip();g.globalAlpha=c;
    for(const side of [-1,1]){
     const h=HINGE[side],k=Math.cos(th),rise=Math.sin(th)*.12;
     // About the hinge: x' = h + (x-h) cos, and the free edge recedes up the screen, y' = y - |x-h| rise.
     const s=side<0?1:-1;g.save();g.transform(k,-s*rise,0,1,h-h*k,s*rise*h);
     const lc=document.createElement('canvas');lc.width=leaves[side].width;lc.height=leaves[side].height;const l=lc.getContext('2d');l.drawImage(leaves[side],0,0);
     // Turning away from the viewer and the light: darker, and a little warmer in the shade.
     l.globalCompositeOperation='multiply';const shade=Math.round(255*(1-.42*Math.sin(th)));l.fillStyle=`rgb(${shade},${Math.round(shade*.96)},${Math.round(shade*.9)})`;l.fillRect(0,0,lc.width,lc.height);l.globalCompositeOperation='destination-in';l.drawImage(leaves[side],0,0);
     g.drawImage(lc,0,0,W,lc.height/S);
     // Leaf thickness along the free edge.
     if(th>.05){g.fillStyle='#1d1813';g.fillRect(MEET-(s>0?0:2.2*Math.sin(th)/k),64,2.2*Math.sin(th)/k,BOTTOM-64);}
     g.restore();
    }
    g.restore();
   }
   for(const p of dust){const age=f-p.born;if(age<0||age>p.life)continue;const a=(1-age/p.life)*(age<1?age:1)*(p.grit?.45:.62),r=p.r*(1+age*.45),x=p.x+p.vx*age,y=p.y+p.vy*age;
    const rg=g.createRadialGradient(x,y,0,x,y,r);const col=p.grit?'150,132,108':'236,232,222';rg.addColorStop(0,`rgba(${col},${a})`);rg.addColorStop(1,`rgba(${col},0)`);g.fillStyle=rg;g.beginPath();g.ellipse(x,y,r,r*.62,0,0,Math.PI*2);g.fill();}
   g.restore();frames.push({angle:+(th/MAX).toFixed(3),leaves:+c.toFixed(3)});
  }
  meta.sequences[kind]={row,first:row*FRAMES,count:FRAMES,frames};
 });
 // Review: every frame over the open gateway the world draws.
 const review=document.createElement('canvas');review.width=sheet.width;review.height=sheet.height;const r=review.getContext('2d');r.fillStyle='#9aa3a8';r.fillRect(0,0,review.width,review.height);
 for(let i=0;i<FRAMES*2;i++){const ox=(i%COLS)*fw,oy=Math.floor(i/COLS)*fh;r.save();r.beginPath();r.rect(ox,oy,fw,fh);r.clip();r.translate(ox,oy);r.scale(S,S);r.translate(-REGION.x,-REGION.y);r.drawImage(wide,0,0,W,wide.height*W/wide.width);r.restore();r.drawImage(sheet,ox,oy,fw,fh,ox,oy,fw,fh);r.fillStyle='#000';r.font='20px sans-serif';r.fillText(String(i),ox+6,oy+22);}
 return {sheet:sheet.toDataURL('image/png'),review:review.toDataURL('image/png'),meta};
},{closed:await data('gateway-grand.png'),open:await data('gateway-open.png')});
await browser.close();
const png=s=>Buffer.from(s.split(',')[1],'base64');
await sharp(png(result.sheet)).webp({quality:88,alphaQuality:100,effort:6}).toFile(SRC+'gate-doors-sheet.webp');await fs.writeFile(SRC+'gate-doors-sheet.json',JSON.stringify(result.meta));await fs.writeFile(OUT+'/contact.webp',await sharp(png(result.review)).webp({quality:82}).toBuffer());
console.log('sheet',result.meta.frame,result.meta.cols,'cols',Object.keys(result.meta.sequences));
