import {Application,Assets,Container,Graphics,Sprite,Text,Texture} from 'pixi.js';
const app=new Application();await app.init({resizeTo:window,background:'#101219',antialias:true,resolution:Math.min(devicePixelRatio,2),autoDensity:true});document.body.appendChild(app.canvas);
const base=import.meta.env.BASE_URL;
const manifest=await (await fetch(base+'manifest.json')).json();
const textures:Record<string,Texture>={};await Promise.all(manifest.parts.map(async(p:{name:string})=>{textures[p.name]=await Assets.load(base+p.name+'.png');}));
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
 const plume=at(names[i%names.length],r,a,w*1.12,h*1.1,Math.min(.68,opacity*1.35),4+rnd()*13);
 if(i%3===0)plume.scale.x*=-1;
 plume.zIndex+=5;
});
for(let i=0;i<13;i++){const r=220+rnd()*800,a=(rnd()*2-1)*.74;at('cinders',r,a,70,47,.7,15+rnd()*30);if(i%3===0)at('glow',r,a,40,26,.25);}
for(let i=0;i<9;i++)at(i%2?'ember':'spark',450+rnd()*550,(rnd()*2-1)*.7,13+rnd()*8,10+rnd()*8,.9,35+rnd()*55);
let checker=false,reference=false;const bg=new Graphics();app.stage.addChildAt(bg,0);
const target=await Assets.load(base+'revision-target.png');const ref=new Sprite(target);ref.anchor.set(.5);ref.visible=false;root.addChild(ref);
function text(s:string,size:number,color=0xe9e2d5){return new Text({text:s,style:{fontFamily:'Arial',fontSize:size,fill:color,wordWrap:true,wordWrapWidth:330}});}
const title=text('FLAME FAN',24),sub=text('Static composition · connected fire and distributed smoke',13,0xaeb1ba),note=text('Ground projected · fire and smoke upright',12,0xaeb1ba);ui.addChild(title,sub,note);
function button(label:string,fn:()=>void){const c=new Container(),g=new Graphics(),t=text(label,13);g.roundRect(0,0,150,36,6).fill(0x252a35).stroke({color:0x555b68,width:1});t.position.set(12,10);c.addChild(g,t);c.eventMode='static';c.cursor='pointer';c.on('pointertap',fn);ui.addChild(c);return c;}
const b1=button('Checkerboard',()=>{checker=!checker;layout();});const b2=button('Compare target',()=>{reference=!reference;scene.visible=!reference;ref.visible=reference;layout();});
function layout(){const w=app.screen.width,h=app.screen.height;bg.clear().rect(0,0,w,h).fill(0x101219);if(checker)for(let y=110;y<h-80;y+=20)for(let x=0;x<w;x+=20)bg.rect(x,y,20,20).fill((Math.floor(x/20)+Math.floor(y/20))%2?0x343841:0x252932);title.position.set(22,20);sub.position.set(22,52);note.position.set(22,h-24);const scale=Math.min((w-26)/1280,(h-190)/930);root.scale.set(scale);root.position.set((w-1280*scale)/2,105+(h-190-930*scale)/2);scene.position.y=115;ref.position.set(640,465);ref.width=1250;ref.height=782;b1.scale.set(w<370?.9:1);b2.scale.set(w<370?.9:1);b1.position.set(w<370?12:22,h-75);b2.position.set(w<370?w-147:w-172,h-75);app.render();}
window.addEventListener('resize',layout);layout();app.ticker.stop();
Object.assign(window,{flameFanStatic:{parts:30,static:true,groundProjection:.53,spriteCount:soil.children.length+air.children.length,ready:true,state:()=>({checker,reference,tickerStarted:app.ticker.started,upright:air.children.every(s=>s.rotation===0),usedParts:new Set([...soil.children,...air.children].map(s=>s.label)).size})}});
