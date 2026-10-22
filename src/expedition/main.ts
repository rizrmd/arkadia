import {Application,Container,Graphics,Rectangle} from 'pixi.js';
import '../stronghold/expedition-link';
import {FrameSet,pickFrameScale} from '../typography/frames';
import {installMsdfFx,loadFonts} from '../typography/msdf';
import {MsdfText} from '../typography/text';
import {World,type Point} from './world';

const colors:Record<string,number>={
 Sungai:0x436f86,
 Pegunungan:0x93908c,
 Rawa:0x4d6555,
 'Hutan Relik':0x364f40,
 'Perbatasan Abu':0x746c5e,
};

async function start(){
 const app=new Application();
 await app.init({resizeTo:window,backgroundColor:0x11191e,antialias:true,autoDensity:true,resolution:window.devicePixelRatio||1});
 (document.getElementById('expedition')??document.getElementById('app')??document.body).appendChild(app.canvas);
 installMsdfFx(app.renderer);
 const [,frames]=await Promise.all([loadFonts('/typography/v2/fonts/'),FrameSet.load('/typography/v2/hud/',pickFrameScale(window.devicePixelRatio||1))]);

 let world:World;
 try{world=World.load(localStorage.getItem('arkadia-expedition-v1')??'');}catch{world=new World('arkadia-01');}
 let target:Point={...world.position},route:Point[]=[];
 world.visit(world.position);
 const riskLimit=60;

 const side=app.stage.addChild(new Container());
 side.position.set(16,16);
 side.addChild(frames.frame('panel-bronze',340,560));

 side.addChild(new MsdfText('panel-label','ARKADIA · EXPEDITION')).place(24,38);
 side.addChild(new MsdfText('display-title','Ruins Map',{size:32})).place(24,78);
 const posText=side.addChild(new MsdfText('panel-body',''));
 posText.place(24,114);
 const detailText=side.addChild(new MsdfText('panel-muted','',{wrapWidth:292,lineHeight:18}));
 detailText.place(24,142);
 const statsText=side.addChild(new MsdfText('panel-muted',''));
 statsText.place(24,234);
 const msgText=side.addChild(new MsdfText('panel-body',''));
 msgText.place(24,524);

 const addBtn=(label:string,y:number,fn:()=>void)=>{
  const b=side.addChild(new Container());
  b.position.set(24,y);
  b.eventMode='static';b.cursor='pointer';b.hitArea=new Rectangle(0,0,292,38);
  b.addChild(frames.frame('button-bronze',292,38));
  b.addChild(new MsdfText('panel-title',label,{size:13.5})).place(146,24,0.5);
  b.on('pointertap',()=>act(fn));
 };

 addBtn('Check Route',264,()=>{route=world.route(target,riskLimit);});
 addBtn('Follow Active Route',310,()=>{for(const p of world.route(target,riskLimit))world.visit(p);route=[];});
 addBtn('Clear Current Location',356,()=>world.clear(world.position));
 addBtn('Dispatch Idle Expedition',402,()=>world.dispatch(target,riskLimit,4,Date.now()));
 addBtn('Claim Completed Expedition',448,()=>{const i=world.jobs.findIndex(j=>!j.claimed&&Date.now()>=j.started+j.hours*3600000);world.claim(i,Date.now());});

 const mapWrap=app.stage.addChild(new Container());
 mapWrap.position.set(376,16);
 const mapGraphics=mapWrap.addChild(new Graphics());
 mapGraphics.eventMode='static';
 mapGraphics.cursor='pointer';
 mapGraphics.hitArea=new Rectangle(0,0,700,700);
 mapGraphics.on('pointertap',e=>{
  const local=mapWrap.toLocal(e.global);
  const x=Math.floor(local.x/28),y=Math.floor(local.y/28);
  if(x<0||y<0||x>=25||y>=25)return;
  target={x:world.position.x-12+x,y:world.position.y-12+y};
  route=[];draw();
 });

 function persist(){localStorage.setItem('arkadia-expedition-v1',world.save());}
 function draw(){
  const ox=world.position.x-12,oy=world.position.y-12;
  mapGraphics.clear();
  for(let j=0;j<25;j++)for(let i=0;i<25;i++){
   const p={x:ox+i,y:oy+j},t=world.tile(p),s=world.condition(p),x=i*28,y=j*28;
   mapGraphics.rect(x,y,27,27).fill(colors[t.biome]??0x364f40);
   if(t.road){
    mapGraphics.rect(x+10,y,6,28).fill(0xb39b73);
    mapGraphics.rect(x,y+10,28,6).fill(0xb39b73);
   }
   if(t.landmark){
    mapGraphics.rect(x+6,y+6,15,15).stroke({color:t.landmark==='Sarang'?0xff897c:0xeee2b7,width:2});
   }
   if(s.cleared){
    mapGraphics.rect(x+2,y+2,4,4).fill(0xd9e8ba);
   }
  }
  if(route.length>1){
   route.forEach((p,idx)=>{
    const x=(p.x-ox)*28+14,y=(p.y-oy)*28+14;
    if(idx===0)mapGraphics.moveTo(x,y);else mapGraphics.lineTo(x,y);
   });
   mapGraphics.stroke({color:0xffd47e,width:3});
  }
  mapGraphics.circle((world.position.x-ox)*28+14,(world.position.y-oy)*28+14,7).stroke({color:0xfff8dc,width:3});
  mapGraphics.circle((target.x-ox)*28+14,(target.y-oy)*28+14,11).stroke({color:0xffb86a,width:3});

  const t=world.tile(target);
  posText.text=`You: (${world.position.x}, ${world.position.y}) · ${world.condition(world.position).cleared?'Cleared':'Uncleared'}`;
  posText.place(24,114);
  detailText.text=`${t.name} (${t.x}, ${t.y}) · ${t.biome} · risk ${world.risk(target)} · ${t.faction}`;
  detailText.place(24,142);
  statsText.text=`${Object.keys(world.chunks).length} chunks · ${world.materials} materials · ${world.xp} XP`;
  statsText.place(24,234);
 }
 function act(fn:()=>void){
  try{fn();draw();persist();msgText.text='Saved.';msgText.place(24,524);}
  catch(e){msgText.text=(e as Error).message;msgText.place(24,524);}
 }
 window.addEventListener('keydown',e=>{
  const d:Record<string,Point>={ArrowUp:{x:0,y:-1},w:{x:0,y:-1},ArrowDown:{x:0,y:1},s:{x:0,y:1},ArrowLeft:{x:-1,y:0},a:{x:-1,y:0},ArrowRight:{x:1,y:0},d:{x:1,y:0}};
  if(d[e.key]){
   e.preventDefault();
   act(()=>{
    const next={x:world.position.x+d[e.key].x,y:world.position.y+d[e.key].y};
    const t=world.tile(next);
    if(t.river&&!t.road)throw Error('Find a road bridge');
    world.visit(next);route=[];
   });
  }
 });
 draw();persist();
}
void start();
