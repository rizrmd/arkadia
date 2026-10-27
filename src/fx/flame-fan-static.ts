import {Application,Assets,Container,Graphics,Sprite,Text,Texture} from 'pixi.js';
const app=new Application();await app.init({resizeTo:window,background:'#101219',antialias:true,resolution:Math.min(devicePixelRatio,2),autoDensity:true});document.body.appendChild(app.canvas);
const base=import.meta.env.BASE_URL;
const manifest=await (await fetch(base+'manifest.json')).json();
const textures:Record<string,Texture>={};await Promise.all(manifest.parts.map(async(p:{name:string})=>{textures[p.name]=await Assets.load(base+p.name+'.png');}));
textures['plates-v3']=await Assets.load(base+'plates-v3.png');
const patch=new URLSearchParams(location.search).has('section');
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
// Larger structural forms sit above the fine atlas substrate.
for(let row=-3;row<=4;row++)for(let col=1;col<=5;col++){
 const x=col*190+(row%2)*72+(rnd()-.5)*60,y=row*205+(rnd()-.5)*75;
 const slab=sprite(soil,'plates-v3',x,y,285+rnd()*110,280+rnd()*100,rnd()*6.28,.98);slab.tint=0xbca395;
}
// Explicit irregular branching graph; the same edges register ground light and fire.
const nodes=[[105,0],[270,-85],[310,145],[460,-250],[510,-40],[485,335],[670,-340],[710,-135],[680,130],[700,520],[880,-300],[930,-45],[860,300],[860,690],[1030,170],[1010,540]];
for(const n of nodes){n[1]=Math.max(n[1],-n[0]*.31);const r=Math.hypot(...n);if(r>970){n[0]*=970/r;n[1]*=970/r;}}
const edges=[[0,1],[0,2],[1,3],[1,4],[2,4],[2,5],[3,6],[4,7],[4,8],[5,8],[5,9],[6,10],[7,10],[7,11],[8,11],[8,12],[9,12],[9,13],[10,11],[11,14],[12,14],[12,15],[13,15]];
const seams:{x:number,y:number,angle:number}[]=[];
for(const [ia,ib] of edges){
 const a=nodes[ia],b=nodes[ib],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
 const steps=Math.ceil(len/70);for(let j=0;j<steps;j++){
  const t=(j+.5)/steps,x=a[0]+dx*t+Math.sin(t*Math.PI)*19,y=a[1]+dy*t+Math.sin(t*Math.PI*2)*24;
  const spill=sprite(soil,'glow',x,y,150,90,angle,.20);spill.tint=0xff721e;
  sprite(soil,j%3===0?'bend':'straight',x,y,len/steps+40,40,angle,.94);
  seams.push({x,y,angle});
 }
}
for(let i=0;i<26;i++){const p=point(130+rnd()*880,(rnd()*2-1)*half);sprite(soil,i%2?'coal':'char',p.x,p.y,45+rnd()*45,45+rnd()*40,rnd()*5,.85);}
// Upright screen sprites sorted by their projected feet. Keep smoke behind flame at each depth.
const air=new Container();scene.addChild(air);air.sortableChildren=true;
function at(name:string,r:number,a:number,w:number,h:number,alpha=1,lift=0){const p=point(r,a),x=115+p.x,y=260+p.y*.53;const s=sprite(air,name,x,y-lift,w,h,0,alpha);s.anchor.set(.5,1);s.zIndex=y+(name==='glow'?-2:0);return s;}
// Upright fire uses projected feet from the fracture graph, with quiet gaps.
seams.forEach(({x,y},i)=>{
 if(i%7===3)return;
 const s=sprite(air,i%4===0?'ribbon':['low-a','low-b','low-c'][i%3],115+x,260+y*.53,70+rnd()*36,22+rnd()*28,0,.94);
 s.anchor.set(.5,1);s.zIndex=260+y*.53;
 if(i%3===0)s.scale.x*=-1;
 if(i%5===0){const t=sprite(air,'lick',115+x+12,260+y*.53,24+rnd()*18,42+rnd()*28);t.anchor.set(.5,1);t.zIndex=s.zIndex+.1;}
});
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
 const warm=at('glow',r,a,w*.8,h*.32,.28,0);warm.tint=0xff6a22;
 const plume=at(names[i%names.length],r,a,w*1.12,h*1.1,Math.min(.85,opacity*1.8),4+rnd()*13);
 if(i%3===0)plume.scale.x*=-1;
 plume.tint=i%2?0x938079:0xb19a87;plume.zIndex+=5;
});
for(let i=0;i<13;i++){const r=220+rnd()*800,a=(rnd()*2-1)*.74;at('cinders',r,a,70,47,.7,15+rnd()*30);if(i%3===0)at('glow',r,a,40,26,.25);}
for(let i=0;i<9;i++)at(i%2?'ember':'spark',450+rnd()*550,(rnd()*2-1)*.7,13+rnd()*8,10+rnd()*8,.9,35+rnd()*55);
for(let i=0;i<90;i++){const a=(rnd()*2-1)*half,p=point(1020+rnd()*85,a);const d=sprite(air,i%3?'fragments':'ember',115+p.x,260+p.y*.53,8+rnd()*27,6+rnd()*16,0,.5+rnd()*.5);d.zIndex=d.y;}
let checker=false,reference=false;const bg=new Graphics();app.stage.addChildAt(bg,0);
const target=await Assets.load(base+'latest-target.png');const ref=new Sprite(target);ref.anchor.set(.5);ref.visible=false;root.addChild(ref);
function text(s:string,size:number,color=0xe9e2d5){return new Text({text:s,style:{fontFamily:'Arial',fontSize:size,fill:color,wordWrap:true,wordWrapWidth:330}});}
const title=text('FLAME FAN',24),sub=text('Static composition · fractured plates and branching fire',13,0xaeb1ba),note=text('Ground projected · fire and smoke upright',12,0xaeb1ba);ui.addChild(title,sub,note);
function button(label:string,fn:()=>void){const c=new Container(),g=new Graphics(),t=text(label,13);g.roundRect(0,0,150,36,6).fill(0x252a35).stroke({color:0x555b68,width:1});t.position.set(12,10);c.addChild(g,t);c.eventMode='static';c.cursor='pointer';c.on('pointertap',fn);ui.addChild(c);return c;}
const b1=button('Checkerboard',()=>{checker=!checker;layout();});const b2=button('Compare target',()=>{reference=!reference;scene.visible=!reference;ref.visible=reference;layout();});
function layout(){const w=app.screen.width,h=app.screen.height;bg.clear().rect(0,0,w,h).fill(0x101219);if(checker)for(let y=110;y<h-80;y+=20)for(let x=0;x<w;x+=20)bg.rect(x,y,20,20).fill((Math.floor(x/20)+Math.floor(y/20))%2?0x343841:0x252932);title.position.set(22,20);sub.position.set(22,52);note.position.set(22,h-24);const scale=Math.min((w-26)/1280,(h-190)/930);root.scale.set(scale);root.position.set((w-1280*scale)/2,105+(h-190-930*scale)/2);scene.position.y=115;if(patch){root.scale.set(Math.min((w-30)/530,(h-190)/420));root.position.set(w/2-660*root.scale.x,h/2-390*root.scale.y);}ref.position.set(640,465);ref.width=1250;ref.height=782;b1.scale.set(w<370?.9:1);b2.scale.set(w<370?.9:1);b1.position.set(w<370?12:22,h-75);b2.position.set(w<370?w-147:w-172,h-75);app.render();}
window.addEventListener('resize',layout);layout();app.ticker.stop();
Object.assign(window,{flameFanStatic:{parts:30,revision:3,section:patch,static:true,groundProjection:.53,spriteCount:soil.children.length+air.children.length,ready:true,state:()=>({checker,reference,tickerStarted:app.ticker.started,upright:air.children.every(s=>s.rotation===0),usedParts:new Set([...soil.children,...air.children].map(s=>s.label)).size})}});
