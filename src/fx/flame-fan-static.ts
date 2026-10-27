import {Application,Assets,Container,Graphics,Rectangle,Sprite,Text,Texture} from 'pixi.js';
const app=new Application();await app.init({resizeTo:window,background:'#101219',antialias:true,resolution:Math.min(devicePixelRatio,2),autoDensity:true});document.body.appendChild(app.canvas);
const base=import.meta.env.BASE_URL;
const manifest=await (await fetch(base+'manifest.json')).json();
const textures:Record<string,Texture>={};await Promise.all(manifest.parts.map(async(p:{name:string})=>{textures[p.name]=await Assets.load(base+p.name+'.png');}));
const patch=new URLSearchParams(location.search).has('section');
await Promise.all(['smoke-veil-v1','smoke-split-curl-v1'].map(async name=>{textures[name]=await Assets.load(base+name+'.png');}));
const aerialAtlas=await Assets.load<Texture>(base+'hand-ignition-source.png');
const frozenFrames=[4,5,6,7,8,9,10,11].map(i=>{const x=Math.round(i%4*aerialAtlas.width/4),y=Math.round(Math.floor(i/4)*aerialAtlas.height/4);return new Texture({source:aerialAtlas.source,frame:new Rectangle(x,y,Math.round((i%4+1)*aerialAtlas.width/4)-x,Math.round((Math.floor(i/4)+1)*aerialAtlas.height/4)-y)});});
function splitAtlas(t:Texture){return Array.from({length:16},(_,i)=>{const x=Math.round(i%4*t.width/4),y=Math.round(Math.floor(i/4)*t.height/4);return new Texture({source:t.source,frame:new Rectangle(x,y,Math.round((i%4+1)*t.width/4)-x,Math.round((Math.floor(i/4)+1)*t.height/4)-y)});});}
const sheets=splitAtlas(await Assets.load<Texture>(base+'rolling-fan-v2.png'));
const cores=splitAtlas(await Assets.load<Texture>(base+'eroded-core-v2.png'));
textures['flipbook-smoke']=await Assets.load<Texture>(base+'smoke-v2.png');
textures['flipbook-spark']=Texture.WHITE;
const handFrames=splitAtlas(aerialAtlas);
const root=new Container(),scene=new Container(),ui=new Container();app.stage.addChild(root,ui);root.addChild(scene);
let seed=417;function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
// Ground-plane sector: narrow left origin, broad curved right rim. Project only ground.
const ground=new Container();scene.addChild(ground);ground.position.set(115,260);ground.scale.set(1,.53);ground.rotation=.0;
const radius=1060,half=.79;
function point(r:number,a:number){return{x:r*Math.cos(a+.4),y:r*Math.sin(a+.4)};}
const outline:number[]=[0,0];for(let i=1;i<=24;i++){const p=point(radius*i/24,-half);outline.push(p.x+(rnd()-.5)*20,p.y+(rnd()-.5)*24);}for(let i=0;i<=64;i++){const p=point(radius*(.985+rnd()*.03),-half+2*half*i/64);outline.push(p.x,p.y);}for(let i=24;i>0;i--){const p=point(radius*i/24,half);outline.push(p.x+(rnd()-.5)*24,p.y+(rnd()-.5)*24);}outline.push(0,0);
const maskCanvas=document.createElement('canvas');maskCanvas.width=1300;maskCanvas.height=1800;const ctx=maskCanvas.getContext('2d')!;ctx.filter='blur(5px)';ctx.fillStyle='white';ctx.beginPath();ctx.moveTo(outline[0]+20,outline[1]+900);for(let i=2;i<outline.length;i+=2)ctx.lineTo(outline[i]+20,outline[i+1]+900);ctx.closePath();ctx.fill();const mask=new Sprite(Texture.from(maskCanvas));mask.position.set(-20,-900);ground.addChild(mask);const soil=new Container();ground.addChild(soil);soil.mask=mask;
function sprite(parent:Container,name:string,x:number,y:number,w:number,h:number,rotation=0,alpha=1){const s=new Sprite(textures[name]);s.label=name;s.anchor.set(.5);s.position.set(x,y);s.width=w;s.height=h;s.rotation=rotation;s.alpha=alpha;if(parent===soil)s.tint=0xb8aaa0;parent.addChild(s);return s;}
// Overlap original crust pieces; clipping belongs to the footprint, never to upright fire.
for(let y=-850;y<=850;y+=115)for(let x=-80;x<=1150;x+=145){const n=(Math.floor(x/145)+Math.floor(y/115))%3;sprite(soil,n===0?'crust-b':'crust-a',x+rnd()*45,y+rnd()*35,245+rnd()*35,225+rnd()*30,rnd()*6.28);}
for(let i=0;i<30;i++){const p=point(150+rnd()*900,(rnd()*2-1)*half);sprite(soil,['scorch','ash','fragments','perimeter'][i%4],p.x,p.y,130+rnd()*90,140+rnd()*80,rnd()*6.28,.7);}
// A continuous spine of source straight fissures with branching source junctions.
for(let lane=-2;lane<=2;lane++){
 const a=lane*.29;for(let r=125;r<1040;r+=168){const p=point(r,a);sprite(soil,'straight',p.x,p.y,205,87,a+.4, .88);if(r>300){sprite(soil,['fork','tee','cross'][Math.abs(lane+Math.floor(r/168))%3],p.x,p.y,140,135,a+.4,.86);}}
}
for(let lane=-2;lane<=2;lane++){const p=point(1010,lane*.29);sprite(soil,'terminal',p.x,p.y,125,75,lane*.29+.4,.85);}
for(let r=350;r<1000;r+=230)for(let a=-.64;a<.7;a+=.31){const p=point(r,a);sprite(soil,'bend',p.x,p.y,173,116,a+1.4,.7);}
for(let i=0;i<26;i++){const p=point(130+rnd()*880,(rnd()*2-1)*half);sprite(soil,i%2?'coal':'char',p.x,p.y,45+rnd()*45,45+rnd()*40,rnd()*5,.85);}
// Upright screen sprites sorted by their projected feet. Keep smoke behind flame at each depth.
const air=new Container();scene.addChild(air);air.sortableChildren=true;
function at(name:string,r:number,a:number,w:number,h:number,alpha=1,lift=0){const p=point(r,a),x=115+p.x,y=260+p.y*.53;const s=sprite(air,name,x,y-lift,w,h,0,alpha);s.anchor.set(.5,1);s.zIndex=y+(name==='glow'?-2:0);return s;}
// Broken, connected burning seams. Each run overlaps at the foot, while its
// irregular tongue heights leave broad unburned plates between the seams.
const runs=[[-.58,170,920],[-.28,110,1030],[.06,250,960],[.38,180,1050],[.66,460,990]];
for(let lane=0;lane<runs.length;lane++){
 const [angle,from,to]=runs[lane];let r=from,index=0;
 while(r<to){
  const a=angle+Math.sin(r*.014+lane)*.085;
  const width=115+rnd()*100,height=28+rnd()*38;
  const name=index%3===0?'ribbon':['low-a','low-b','low-c'][Math.floor(rnd()*3)];
  const light=at('glow',r,a,width*1.25,45,.13);light.tint=0xff782d;
  const f=at(name,r,a,width,height,.82+rnd()*.17);
  if(rnd()<.4)f.scale.x*=-1;
  if(index%3===1){const tongue=at(index%2?'lick':'accent',r+25,a+.012,20+rnd()*23,30+rnd()*42,.85);if(rnd()<.5)tongue.scale.x*=-1;}
  r+=80+rnd()*48;index++;
 }
}
// Smaller cross-seams join selected lanes without filling the dark plate gaps.
for(const [r,a] of [[320,-.43],[570,-.12],[780,.23],[910,.5],[460,.22]]){
 at('ribbon',r,a,150,25,.88);
}
// Smoke starts throughout the burning footprint, not only on the outer rim.
// Mixed low veils and rising plumes partially cover local fire, depth sorted by feet.
const smokeSites=[
 [210,-.43,105,67,.32],[340,.25,130,90,.38],[450,-.5,125,116,.43],
 [540,-.13,180,95,.30],[640,.42,145,130,.46],[720,-.48,135,157,.55],
 [790,.04,190,110,.34],[860,.57,155,145,.48],[990,-.60,135,164,.59],
 [970,-.28,190,175,.52],[1030,.11,130,135,.46],[1000,.42,180,148,.48],
 [930,.70,170,119,.40],[400,.58,115,65,.29],[620,.68,145,72,.31],
 [830,-.28,115,125,.37],[560,.23,105,72,.27],[300,-.22,95,83,.32]
];
smokeSites.forEach(([r,a,w,h,opacity],i)=>{
 const names=['wisp','puff','billow','bank','wisp','ash-puff'];
 const candidate=i%4===0?'smoke-veil-v1':i===7||i===11?'smoke-split-curl-v1':names[i%names.length];
 const plume=at(candidate,r,a,w*(candidate==='smoke-veil-v1'?1.45:.95),h*(candidate==='smoke-split-curl-v1'?1.05:.82),candidate.startsWith('smoke-')?.78:Math.min(.72,opacity*1.5),candidate.startsWith('smoke-')?0:4+rnd()*7);
 plume.tint=candidate.startsWith('smoke-')?0xd3c4b8:0xe2d1c4;
 if(i%3===0)plume.scale.x*=-1;
 plume.zIndex+=5;
});
for(let i=0;i<13;i++){const r=220+rnd()*800,a=(rnd()*2-1)*.74;at('cinders',r,a,70,47,.7,15+rnd()*30);if(i%3===0)at('glow',r,a,40,26,.25);}
for(let i=0;i<9;i++)at(i%2?'ember':'spark',450+rnd()*550,(rnd()*2-1)*.7,13+rnd()*8,10+rnd()*8,.9,35+rnd()*55);
for(let i=0;i<35;i++){const p=point(1020+rnd()*65,(rnd()*2-1)*half);const d=sprite(air,'fragments',115+p.x,260+p.y*.53,7+rnd()*15,5+rnd()*10,0,.5+rnd()*.35);d.zIndex=d.y;}
// Frozen curling-tongue frames from the existing flipbook. Append after all
// revision 4 randomness so soil, low fire, smoke and embers remain identical.
// Feet share the existing depth order; upright quads never inherit ground squash.
const aerialSites=[
 [235,-.29,66,100],[355,-.52,77,120],[420,.03,78,113],
 [505,-.30,89,139],[565,.36,84,130],[630,-.54,95,152],
 [700,.04,100,156],[765,.51,90,140],[810,-.29,105,169],
 [890,-.53,93,154],[930,.12,107,174],[975,.42,95,152],
 [1015,-.14,90,148],[875,.65,76,123]
];
const aerialSprites=aerialSites.map(([r,a,w,h],i)=>{
 const name='flipbook-tongue-'+i; textures[name]=frozenFrames[(i*3)%frozenFrames.length];
 const flame=at(name,r,a,w,h,.88);flame.anchor.y=.88;
 if(i%3===1)flame.scale.x*=-1;
 flame.visible=!new URLSearchParams(location.search).has('baseline');
 return flame;
});
// Revision 6 additions use no baseline random draws. Every effect category in
// flame-fan-flipbook.ts is represented; actor/reference sprites are review context.
const combinedSprites:Sprite[]=[];
const coverage:Record<string,{source:string;frames:number[];count:number;role:string}>={};
function frozen(category:string,source:string,frame:number|null,r:number,a:number,w:number,h:number,alpha:number,lift=0){
 const key='flipbook-'+category+'-'+combinedSprites.length;
 textures[key]=source==='rolling-fan-v2.png'?sheets[frame!]:source==='eroded-core-v2.png'?cores[frame!]:source==='hand-ignition-source.png'?handFrames[frame!]:textures[source];
 const s=at(key,r,a,w,h,alpha,lift);combinedSprites.push(s);
 const c=coverage[category]??={source,frames:[],count:0,role:category};c.count++;if(frame!==null&&!c.frames.includes(frame))c.frames.push(frame);
 return s;
}
// Small rolling folds occupy selected burning seams, never one opaque full-fan
// overlay. These are upright screen quads, not flattened ground-plane sprites.
for(const [i,r,a,w,h]of [[0,310,-.30,205,77],[1,610,.05,240,91],[2,850,.40,255,98]]){
 frozen('Flame sheet','rolling-fan-v2.png',[6,8,10][i],r,a,w,h,.68);
 const core=frozen('Hot interior','eroded-core-v2.png',[6,8,10][i],r+5,a,w*.85,h*.82,.22);core.blendMode='add';core.zIndex+=.1;
}
frozen('Ignition','hand-ignition-source.png',2,125,-.28,42,55,.8);
for(const [i,r,a]of [[0,490,-.48],[1,810,.06],[2,1005,.50]])frozen('Hit contacts','hand-ignition-source.png',[3,12,13][i],r,a,38+i*5,55+i*6,.72);
for(const [i,r,a,w,h]of [[0,250,-.38,90,74],[1,450,.18,110,90],[2,620,-.39,105,110],[3,750,.36,130,97],[4,920,-.20,120,116],[5,970,.55,125,100]]){
 const smoke=frozen('Smoke','flipbook-smoke',null,r,a,w,h,.34,18+i%3*7);smoke.tint=0x665951;smoke.zIndex+=6;
}
// The source particle uses Texture.WHITE; retain its small orange additive
// quads alongside (without moving/replacing) the approved atlas embers.
for(let i=0;i<12;i++){
 const e=frozen('Embers','flipbook-spark',null,290+i*59,Math.sin(i*2.4)*.56,2+i%2,3+i%3,.65,27+i%4*13);e.tint=i%2?0xffa529:0xff5f12;e.blendMode='add';
}
coverage['Curling tongues']={source:'hand-ignition-source.png',frames:[4,5,6,7,8,9,10,11],count:aerialSprites.length,role:'Retained revision 5 upright curls'};
coverage['Ground heat']={source:'Pixi Graphics / retained glow.png',frames:[],count:0,role:'Existing warm foot glows retained; no broad heat ellipse obscures soil'};
coverage['Burn Soil']={source:'Pixi Graphics + hand-ignition-source.png',frames:[4,5,6,7,8,9,10,11],count:0,role:'Approved crust, connected cracks and low flame runs retained; frozen curls above them; no second soil footprint'};
const v5Only=new URLSearchParams(location.search).has('baselineV5');
combinedSprites.forEach(s=>s.visible=!v5Only);
let checker=false,reference=false;const bg=new Graphics();app.stage.addChildAt(bg,0);
const target=await Assets.load(base+'latest-target.png');const ref=new Sprite(target);ref.anchor.set(.5);ref.visible=false;root.addChild(ref);
function text(s:string,size:number,color=0xe9e2d5){return new Text({text:s,style:{fontFamily:'Arial',fontSize:size,fill:color,wordWrap:true,wordWrapWidth:330}});}
const title=text('FLAME FAN',24),sub=text('Static composition · connected fire and distributed smoke',13,0xaeb1ba),note=text('Ground projected · fire and smoke upright',12,0xaeb1ba);ui.addChild(title,sub,note);
function button(label:string,fn:()=>void){const c=new Container(),g=new Graphics(),t=text(label,13);g.roundRect(0,0,150,36,6).fill(0x252a35).stroke({color:0x555b68,width:1});t.position.set(12,10);c.addChild(g,t);c.eventMode='static';c.cursor='pointer';c.on('pointertap',fn);ui.addChild(c);return c;}
const b1=button('Checkerboard',()=>{checker=!checker;layout();});const b2=button('Compare target',()=>{reference=!reference;scene.visible=!reference;ref.visible=reference;layout();});
function layout(){const w=app.screen.width,h=app.screen.height;bg.clear().rect(0,0,w,h).fill(0x101219);if(checker)for(let y=110;y<h-80;y+=20)for(let x=0;x<w;x+=20)bg.rect(x,y,20,20).fill((Math.floor(x/20)+Math.floor(y/20))%2?0x343841:0x252932);title.position.set(22,20);sub.position.set(22,52);note.position.set(22,h-24);const scale=Math.min((w-26)/1280,(h-190)/930);root.scale.set(scale);root.position.set((w-1280*scale)/2,105+(h-190-930*scale)/2);scene.position.y=115;if(patch){root.scale.set(Math.min((w-30)/530,(h-190)/420));root.position.set(w/2-660*root.scale.x,h/2-390*root.scale.y);}ref.position.set(640,465);ref.width=1250;ref.height=782;b1.scale.set(w<370?.9:1);b2.scale.set(w<370?.9:1);b1.position.set(w<370?12:22,h-75);b2.position.set(w<370?w-147:w-172,h-75);app.render();}
window.addEventListener('resize',layout);layout();app.ticker.stop();
Object.assign(window,{flameFanStatic:{parts:30,revision:6,baselineRevision:5,coverage,combinedCount:combinedSprites.length,aerialFrames:[4,5,6,7,8,9,10,11],aerialCount:aerialSprites.length,section:patch,supplementalParts:2,static:true,groundProjection:.53,spriteCount:soil.children.length+air.children.length,ready:true,setCombinedVisible:(visible:boolean)=>{combinedSprites.forEach(s=>s.visible=visible);app.render();},state:()=>({checker,reference,tickerStarted:app.ticker.started,upright:air.children.every(s=>s.rotation===0),usedParts:new Set([...soil.children,...air.children].map(s=>s.label)).size})}});
