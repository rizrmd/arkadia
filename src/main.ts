import {Application,Container,Sprite,Graphics,Assets,Texture} from 'pixi.js';
import './style.css';
import {makeWall,wallSources,type WallId} from './walls';
import {loadCharacters} from './characters/sprites';
import {Arena} from './characters/arena';
import {mountEquipment,hud} from './characters/ui';
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
type Asset={id:string;kind:string;pivot:[number,number];rect:{left:number;top:number;width:number;height:number}};
let app=new Application();
const view=$('viewport');
const settingsButton=$('settings-toggle');
const compatibilityUrl=new URL(location.href);compatibilityUrl.searchParams.set('renderer','canvas');$<HTMLAnchorElement>('compatibility').href=compatibilityUrl.href;
function closeSettings(){ $('app').classList.remove('settings-open');settingsButton.setAttribute('aria-expanded','false');settingsButton.textContent='Settings'; }
settingsButton.onclick=()=>{const open=$('app').classList.toggle('settings-open');settingsButton.setAttribute('aria-expanded',String(open));settingsButton.textContent=open?'Close settings':'Settings';};
window.addEventListener('keydown',e=>{if(e.key==='Escape')closeSettings();});
view.addEventListener('pointerdown',closeSettings);

const textures:Record<string,Texture>={};
const world=new Container(),floors=new Container(),props=new Container(),gridLayer=new Container(),overlay=new Container();
let arena:Arena|undefined,manifest:{assets:Asset[]},counter=1,hash='',probe:Graphics,probePos={x:0,y:0};
const checks=(id:string)=>$<HTMLInputElement>(id).checked;
function rng(seed:string){let a=2166136261;for(const c of seed)a=Math.imul(a^c.charCodeAt(0),16777619);return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function iso(x:number,y:number){return {x:(x-y)*64,y:(x+y)*32};}
function reset(){const b=world.getLocalBounds(),padding=matchMedia('(max-width:700px)').matches?32:80,scale=Math.max(.01,Math.min((view.clientWidth-padding)/b.width,(view.clientHeight-padding)/b.height));world.scale.set(scale);world.position.set(view.clientWidth/2-(b.x+b.width/2)*scale,view.clientHeight/2-(b.y+b.height/2)*scale);updateZoom();}
function updateZoom(){$('zoom').textContent=`${Math.round(world.scale.x*100)}% · pinch to zoom`;}
function zoomAt(factor:number,x=view.clientWidth/2,y=view.clientHeight/2){const old=world.scale.x,next=Math.max(.05,Math.min(2.8,old*factor));world.x=x-(x-world.x)*next/old;world.y=y-(y-world.y)*next/old;world.scale.set(next);updateZoom();}
function inspect(a:Asset,x:number,y:number,s:Sprite){s.eventMode='static';s.cursor='crosshair';s.on('pointerover',()=>{if(checks('inspect'))$('selection').textContent=`${a.id} · ${a.kind}\ngrid ${x},${y} · depth ${s.zIndex.toFixed(0)}\ncrop ${a.rect.width}×${a.rect.height} · pivot ${a.pivot.join(',')}`;});}
function draw(){arena?.detach();for(const c of [floors,props,gridLayer,overlay]){for(const child of c.removeChildren())child.destroy();}props.sortableChildren=checks('sort');props.visible=checks('props');
 const seed=$<HTMLInputElement>('seed').value,random=rng(seed),layout:string[]=[];let n=0;
 for(let x=0;x<10;x++)for(let y=0;y<10;y++){const id=(x>6&&y<5)?'corruption':random()<.12?'limestone':'ash';const a=manifest.assets.find(a=>a.id===id)!;const s=new Sprite(textures[id]);s.anchor.set(.5);s.width=128;s.height=64;const p=iso(x-4.5,y-4.5);s.position.copyFrom(p);floors.addChild(s);inspect(a,x,y,s);layout.push(id);
 if(checks('grid')){const g=new Graphics().poly([p.x,p.y-32,p.x+64,p.y,p.x,p.y+32,p.x-64,p.y]).stroke({color:0xd5b27a,width:.8,alpha:.65});gridLayer.addChild(g);}
 }
 function prop(id:string,x:number,y:number,width:number){const a=manifest.assets.find(a=>a.id===id)!;const s=new Sprite(textures[id]);s.anchor.set(...a.pivot);s.scale.set(width/s.texture.width);const p=iso(x-4.5,y-4.5);s.position.copyFrom(p);s.zIndex=p.y;props.addChild(s);inspect(a,x,y,s);layout.push(`${id}:${x}:${y}`);n++;
 if(checks('inspect')){overlay.addChild(new Graphics().circle(p.x,p.y,2.4).fill(0xd6a257));}}
 function wall(id:WallId,x:number,y:number,slope:number){
  const s=makeWall(id,textures[id],slope),a=manifest.assets.find(a=>a.id===id)!;
  const p=iso(x-4.5,y-4.5);s.position.copyFrom(p);s.zIndex=p.y;props.addChild(s);
  inspect({...a,pivot:[s.anchor.x,s.anchor.y]},x,y,s);layout.push(`${id}:${x}:${y}`);n++;
  if(checks('inspect'))overlay.addChild(new Graphics().circle(p.x,p.y,2.4).fill(0xd6a257));
 }
 prop('arch',0,0,150);
 // Ground contacts sit on the outer tile edges, one two-cell segment per step.
 for(let i=2.5;i<10;i+=2){wall('wall-a',i,-.5,.5);wall(i===4.5?'wall-left-broken':'wall-left',-.5,i,-.5);}
 prop('tree',8,1,170);prop('tree',1,8,145);prop('relic',6,7,68);prop('roots',8,2,115);
 for(let i=0;i<20;i++){const x=1+Math.floor(random()*8),y=1+Math.floor(random()*8);if(x>3&&x<7&&y>3&&y<7)continue;const id=['rubble','grass','roots'][Math.floor(random()*3)];prop(id,x,y,id==='grass'?55:90);}
 probe=new Graphics().ellipse(0,0,10,5).fill({color:0xd9a74f,alpha:.25}).moveTo(0,-30).lineTo(9,-14).lineTo(0,0).lineTo(-9,-14).closePath().fill(0xf1c67f).stroke({color:0xffe4b2,width:1});probe.label='depth-probe';probe.position.copyFrom(probePos);probe.zIndex=probe.y;props.addChild(probe);
 arena?.attach(props);
 props.sortableChildren=checks('sort');
 let h=0;for(const c of layout.join('|'))h=Math.imul(h,31)+c.charCodeAt(0)|0;hash=(h>>>0).toString(16);
 $('stats').textContent=`100 TILES / ${n} PROPS / SEED ${hash}`;
 (window as any).__ARKADIA__={pixi:app.renderer.type,seed,hash,tiles:100,props:n,sorted:checks('sort'),layout,previewUsed:false,assets:manifest.assets.length,wallAlignment:'ground-contacts-v1',probeY:probe.y};
}
async function start(){
 // Keep a Canvas2D fallback available when WebGL cannot initialize.
 const requested=new URLSearchParams(location.search).get('renderer');
 const useCanvas=requested==='canvas';
 const options={resizeTo:view,backgroundAlpha:0,antialias:true,resolution:Math.min(devicePixelRatio, useCanvas?1.5:2),autoDensity:true};
 $('loading').textContent='Starting renderer…';
 try{await app.init({...options,preference:useCanvas?'canvas':['webgl','canvas']});}
 catch(error){if(useCanvas)throw error;app=new Application();await app.init({...options,preference:'canvas'});}
 view.appendChild(app.canvas);
 app.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('error').hidden=false;$('error-message').textContent='Graphics context lost. Use compatibility mode to continue.';});
 $('loading').textContent='Loading world textures…';
 manifest=await(await fetch('/assets/manifest.json',{signal:AbortSignal.timeout(20000)})).json();
 for(const id of ['wall-left','wall-left-broken','wall-corner'])manifest.assets.push({id,kind:'generated wall',pivot:[.5,.5],rect:{left:0,top:0,width:1536,height:1024}});
 // Gallery-only assets must not block the playable world (e.g. legacy wall-b).
 const worldIds=new Set(['ash','limestone','corruption','arch','wall-a','wall-left','wall-left-broken','tree','relic','roots','rubble','grass']);
 await Promise.all(manifest.assets.filter(a=>worldIds.has(a.id)).map(async a=>{
  const url=a.kind==='generated wall'?`/assets/walls/${a.id}.png`:`/assets/${a.id}.png`;
  for(let attempt=0;attempt<3;attempt++){
   try{textures[a.id]=await Assets.load(attempt?`${url}?retry=${attempt}`:url);return;}
   catch(error){if(attempt===2)throw error;}
  }
 }));$('loading').textContent='Loading character sprites…';const chars=await loadCharacters();arena=new Arena(chars.sets,iso,rng('arena-crowd'));arena.spawn(Number($<HTMLSelectElement>('crowd').value));app.stage.addChild(world);world.addChild(floors,gridLayer,props,overlay);draw();reset();
 $('loading').hidden=true;$('error').hidden=true;
 new ResizeObserver(()=>{app.renderer.resize(view.clientWidth,view.clientHeight);reset();}).observe(view);
 $('fit').onclick=reset;$('zoom-in').onclick=()=>zoomAt(1.3);$('zoom-out').onclick=()=>zoomAt(1/1.3);
 $('generate').onclick=draw;$('next').onclick=()=>{$<HTMLInputElement>('seed').value=`perbatasan-${++counter}`;draw();};
 for(const id of ['grid','inspect','sort','props'])$(id).onchange=draw;
 $('checker').onchange=()=>{view.style.background=checks('checker')?'repeating-conic-gradient(#393b42 0 25%,#24272e 0 50%) 0/32px 32px':'';};
 $('reset').onclick=reset;$('source').onclick=()=>$<HTMLDialogElement>('assets').showModal();$('close').onclick=()=>$<HTMLDialogElement>('assets').close();
 $('gallery').innerHTML=manifest.assets.map(a=>`<figure><img src="${a.kind==='generated wall'?'/assets/walls/':'/assets/'}${a.id}.png" alt="Extracted ${a.id}"><figcaption>${a.id} / ${a.rect.width}×${a.rect.height}</figcaption></figure>`).join('');
 const pointers=new Map<number,{x:number;y:number}>();
 const gesture=()=>{const points=[...pointers.values()].slice(0,2),a=points[0],b=points[1];return {x:b?(a.x+b.x)/2:a.x,y:b?(a.y+b.y)/2:a.y,distance:b?Math.hypot(b.x-a.x,b.y-a.y):0};};
 view.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});view.setPointerCapture(e.pointerId);});
 const release=(e:PointerEvent)=>{pointers.delete(e.pointerId);};
 view.addEventListener('pointerup',release);view.addEventListener('pointercancel',release);view.addEventListener('lostpointercapture',release);
 window.addEventListener('blur',()=>pointers.clear());
 view.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;
  const before=gesture();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const after=gesture();
  const rect=view.getBoundingClientRect();
  if(before.distance>0&&after.distance>0)zoomAt(after.distance/before.distance,before.x-rect.left,before.y-rect.top);
  world.x+=after.x-before.x;world.y+=after.y-before.y;
 });
 view.addEventListener('wheel',e=>{e.preventDefault();const rect=view.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;zoomAt(Math.exp(-e.deltaY*.001),x,y);},{passive:false});
 window.addEventListener('keydown',e=>{if(document.activeElement?.tagName==='INPUT')return;const d:Record<string,[number,number]>={ArrowUp:[0,-8],ArrowDown:[0,8],ArrowLeft:[-8,0],ArrowRight:[8,0]};if(d[e.key]){e.preventDefault();probe.x+=d[e.key][0];probe.y+=d[e.key][1];probe.zIndex=probe.y;probePos={x:probe.x,y:probe.y};(window as any).__ARKADIA__.probeY=probe.y;}});
 const a=arena!,refreshEquipment=mountEquipment($('equipment'),$('equip-detail'),chars.manifest.equipment,a),refreshHud=hud(a);
 app.ticker.add(t=>{a.update(t.deltaMS);refreshHud();refreshEquipment();});
 $('crowd').onchange=()=>{a.detach();a.spawn(Number($<HTMLSelectElement>('crowd').value));a.attach(props);};
 $('auto').onchange=()=>a.auto=checks('auto');$('mirror').onchange=()=>a.mirror=checks('mirror');$('pivots').onchange=()=>a.pivots=checks('pivots');
 const pad=document.createElement('div');pad.className='mobile-gamepad';pad.setAttribute('aria-label','Touch game controls');
 pad.innerHTML='<div class="direction-pad"><button data-key="w" aria-label="Move up">▲</button><button data-key="a" aria-label="Move left">◀</button><button data-key="s" aria-label="Move down">▼</button><button data-key="d" aria-label="Move right">▶</button></div><div class="action-pad"><button data-key=" " aria-label="Attack">Attack</button><button id="touch-revive">Revive</button></div>';
 document.querySelector('main')!.appendChild(pad);
 const held=new Map<number,string>();
 const releaseControl=(e:PointerEvent)=>{const key=held.get(e.pointerId);held.delete(e.pointerId);if(key!==undefined&&![...held.values()].includes(key))a.keys.delete(key);};
 for(const button of pad.querySelectorAll<HTMLButtonElement>('[data-key]')){
  button.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();const key=button.dataset.key!;held.set(e.pointerId,key);a.keys.add(key);button.setPointerCapture(e.pointerId);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>releaseControl(e as PointerEvent));
 }
 const clearControls=()=>{for(const key of held.values())a.keys.delete(key);held.clear();};
 window.addEventListener('blur',clearControls);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearControls();});
 matchMedia('(max-width:700px)').addEventListener('change',clearControls);
 $('touch-revive').onclick=()=>{if(!a.hero.alive)a.respawnHero();};
 const gameKey=(e:KeyboardEvent)=>{const k=e.key.toLowerCase();return ['w','a','s','d',' '].includes(k)?k:'';};
 window.addEventListener('keydown',e=>{if(document.activeElement?.tagName==='INPUT')return;const k=gameKey(e);if(k){e.preventDefault();a.keys.add(k);}if(e.key.toLowerCase()==='r'&&!a.hero.alive)a.respawnHero();});
 window.addEventListener('keyup',e=>{const k=gameKey(e);if(k){e.preventDefault();a.keys.delete(k);}});window.addEventListener('blur',()=>a.keys.clear());
 $('character-gallery').innerHTML=['hero','revenant','equipment'].map(id=>`<figure><img src="/assets/characters/${id}.png" alt="Atlas ${id}"><figcaption>${id}.png</figcaption></figure>`).join('');
 (window as any).__ARKADIA_ARENA__=a;(window as any).__ARKADIA_CHARACTERS__=()=>a.snapshot();
 (window as any).__ARKADIA_APP__=app;
 (window as any).__ARKADIA_WALLS__=wallSources;
}
const startupTimeout=setTimeout(()=>{$('error').hidden=false;$('error-message').textContent='The arena is taking too long to load. Reload or try compatibility mode.';},30000);
start().catch(e=>{$('loading').hidden=true;$('error').hidden=false;$('error-message').textContent=`Unable to load the arena. Reload to retry. ${String(e)}`;console.error(e);}).finally(()=>clearTimeout(startupTimeout));
