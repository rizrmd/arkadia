import {Application,Container,Sprite,Graphics,Assets,Texture} from 'pixi.js';
import {FrameSet,pickFrameScale} from './typography/frames';
import {installMsdfFx,loadFonts} from './typography/msdf';
import {MsdfText} from './typography/text';
import {makeWall,wallSources,type WallId} from './walls';
import {loadCharacters} from './characters/sprites';
import {Arena} from './characters/arena';
import {project as iso,ISO} from './isometric';
import {mountEquipment,hud} from './characters/ui';

type Asset={id:string;kind:string;pivot:[number,number];rect:{left:number;top:number;width:number;height:number}};
const app=new Application();
const textures:Record<string,Texture>={};
const world=new Container(),floors=new Container(),props=new Container(),gridLayer=new Container(),overlay=new Container(),uiStage=new Container();
let arena:Arena|undefined,manifest:{assets:Asset[]},hash='',probe:Graphics,probePos={x:0,y:0};
let statsText:MsdfText|undefined,selectionText:MsdfText|undefined;
const seed='perbatasan-1';

function rng(s:string){let a=2166136261;for(const c of s)a=Math.imul(a^c.charCodeAt(0),16777619);return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function reset(){const b=world.getLocalBounds(),w=innerWidth,h=innerHeight,padding=w<700?32:80,scale=Math.max(.01,Math.min((w-padding)/b.width,(h-padding)/b.height));world.scale.set(scale);world.position.set(w/2-(b.x+b.width/2)*scale,h/2-(b.y+b.height/2)*scale);}
function inspect(a:Asset,x:number,y:number,s:Sprite){
 s.eventMode='static';s.cursor='crosshair';
 s.on('pointerover',()=>{if(selectionText){selectionText.text=`${a.id} · ${a.kind} (${x},${y})`;selectionText.place(innerWidth-20,38,1);}});
}
function draw(){
 arena?.detach();
 for(const c of [floors,props,gridLayer,overlay]){for(const child of c.removeChildren())child.destroy();}
 props.sortableChildren=true;
 const random=rng(seed),layout:string[]=[];let n=0;
 for(let x=0;x<10;x++)for(let y=0;y<10;y++){
  const id=(x>6&&y<5)?'corruption':random()<.12?'limestone':'ash';
  const a=manifest.assets.find(a=>a.id===id)!;
  const s=new Sprite(textures[id]);s.anchor.set(.5);s.width=ISO.halfWidth*2;s.height=ISO.halfHeight*2;
  const p=iso(x-4.5,y-4.5);s.position.copyFrom(p);floors.addChild(s);inspect(a,x,y,s);layout.push(id);
 }
 function prop(id:string,x:number,y:number,width:number){
  const a=manifest.assets.find(a=>a.id===id)!;
  const s=new Sprite(textures[id]);s.anchor.set(...a.pivot);s.scale.set(width/s.texture.width);
  const p=iso(x-4.5,y-4.5);s.position.copyFrom(p);s.zIndex=p.y;props.addChild(s);inspect(a,x,y,s);layout.push(`${id}:${x}:${y}`);n++;
 }
 function wall(id:WallId,x:number,y:number,slope:number){
  const s=makeWall(id,textures[id],slope),a=manifest.assets.find(a=>a.id===id)!;
  const p=iso(x-4.5,y-4.5);s.position.copyFrom(p);s.zIndex=p.y;props.addChild(s);
  inspect({...a,pivot:[s.anchor.x,s.anchor.y]},x,y,s);layout.push(`${id}:${x}:${y}`);n++;
 }
 prop('arch',0,0,150);
 for(let i=2.5;i<10;i+=2){wall('wall-a',i,-.5,.5);wall(i===4.5?'wall-left-broken':'wall-left',-.5,i,-.5);}
 prop('tree',8,1,170);prop('tree',1,8,145);prop('relic',6,7,68);prop('roots',8,2,115);
 for(let i=0;i<20;i++){const x=1+Math.floor(random()*8),y=1+Math.floor(random()*8);if(x>3&&x<7&&y>3&&y<7)continue;const id=['rubble','grass','roots'][Math.floor(random()*3)];prop(id,x,y,id==='grass'?55:90);}
 probe=new Graphics().ellipse(0,0,10,5).fill({color:0xd9a74f,alpha:.25}).moveTo(0,-30).lineTo(9,-14).lineTo(0,0).lineTo(-9,-14).closePath().fill(0xf1c67f).stroke({color:0xffe4b2,width:1});
 probe.label='depth-probe';probe.position.copyFrom(probePos);probe.zIndex=probe.y;props.addChild(probe);
 arena?.attach(props);
 let h=0;for(const c of layout.join('|'))h=Math.imul(h,31)+c.charCodeAt(0)|0;hash=(h>>>0).toString(16);
 if(statsText){statsText.text=`100 TILES · ${n} PROPS · SEED ${hash}`;statsText.place(innerWidth-20,62,1);}
 (window as any).__ARKADIA__={pixi:app.renderer.type,seed,hash,tiles:100,props:n,sorted:true,layout,previewUsed:false,assets:manifest.assets.length,wallAlignment:'ground-contacts-v1',probeY:probe.y};
}

async function start(){
 await app.init({resizeTo:window,backgroundColor:0x11191e,antialias:true,resolution:window.devicePixelRatio||1,autoDensity:true});
 (document.getElementById('app')??document.body).appendChild(app.canvas);
 installMsdfFx(app.renderer);
 const [,frames]=await Promise.all([loadFonts('/typography/v2/fonts/'),FrameSet.load('/typography/v2/hud/',pickFrameScale(window.devicePixelRatio||1))]);
 manifest=await(await fetch('/assets/manifest.json')).json();
 for(const id of ['wall-left','wall-left-broken','wall-corner'])manifest.assets.push({id,kind:'generated wall',pivot:[.5,.5],rect:{left:0,top:0,width:1536,height:1024}});
 const worldIds=new Set(['ash','limestone','corruption','arch','wall-a','wall-left','wall-left-broken','tree','relic','roots','rubble','grass']);
 await Promise.all(manifest.assets.filter(a=>worldIds.has(a.id)).map(async a=>{
  const url=a.kind==='generated wall'?`/assets/walls/${a.id}.png`:`/assets/${a.id}.png`;
  textures[a.id]=await Assets.load(url);
 }));
 const chars=await loadCharacters();
 arena=new Arena(chars.sets,iso,rng('arena-crowd'));
 arena.spawn(4);
 app.stage.addChild(world,uiStage);
 world.addChild(floors,gridLayer,props,overlay);

 selectionText=uiStage.addChild(new MsdfText('panel-body','Hover a tile or prop'));
 selectionText.place(innerWidth-20,38,1);
 statsText=uiStage.addChild(new MsdfText('panel-muted',''));
 statsText.place(innerWidth-20,62,1);

 draw();reset();
 window.addEventListener('resize',reset);
 const refreshEquipment=await mountEquipment(uiStage,frames,chars.manifest.equipment,arena);
 const refreshHud=hud(uiStage,frames,arena);
 app.ticker.add(t=>{arena!.update(t.deltaMS);refreshHud();refreshEquipment();});
 (window as any).__ARKADIA_ARENA__=arena;
 (window as any).__ARKADIA_CHARACTERS__=()=>arena!.snapshot();
 (window as any).__ARKADIA_APP__=app;
 (window as any).__ARKADIA_WALLS__=wallSources;
}
void start();
