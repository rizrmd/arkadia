import {Application,Container,Sprite,Graphics,Assets,Texture} from 'pixi.js';
import './style.css';
import {loadCharacters} from './characters/sprites';
import {Arena} from './characters/arena';
import {mountEquipment,hud} from './characters/ui';
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
type Asset={id:string;kind:string;pivot:[number,number];rect:{left:number;top:number;width:number;height:number}};
const app=new Application();
const view=$('viewport');
const textures:Record<string,Texture>={};
const world=new Container(),floors=new Container(),props=new Container(),gridLayer=new Container(),overlay=new Container();
let arena:Arena|undefined,manifest:{assets:Asset[]},drag=false,last={x:0,y:0},counter=1,hash='',probe:Graphics,probePos={x:0,y:0};
const checks=(id:string)=>$<HTMLInputElement>(id).checked;
function rng(seed:string){let a=2166136261;for(const c of seed)a=Math.imul(a^c.charCodeAt(0),16777619);return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function iso(x:number,y:number){return {x:(x-y)*64,y:(x+y)*32};}
function reset(){world.scale.set(Math.min(view.clientWidth/1320,view.clientHeight/900));world.position.set(view.clientWidth/2,view.clientHeight/2-5);updateZoom();}
function updateZoom(){$('zoom').textContent=`${Math.round(world.scale.x*100)}% · drag / scroll`;}
function inspect(a:Asset,x:number,y:number,s:Sprite){s.eventMode='static';s.cursor='crosshair';s.on('pointerover',()=>{if(checks('inspect'))$('selection').textContent=`${a.id} · ${a.kind}\ngrid ${x},${y} · depth ${s.zIndex.toFixed(0)}\ncrop ${a.rect.width}×${a.rect.height} · pivot ${a.pivot.join(',')}`;});}
function draw(){arena?.detach();for(const c of [floors,props,gridLayer,overlay]){for(const child of c.removeChildren())child.destroy();}props.sortableChildren=checks('sort');props.visible=checks('props');
 const seed=$<HTMLInputElement>('seed').value,random=rng(seed),layout:string[]=[];let n=0;
 for(let x=0;x<10;x++)for(let y=0;y<10;y++){const id=(x>6&&y<5)?'corruption':random()<.12?'limestone':'ash';const a=manifest.assets.find(a=>a.id===id)!;const s=new Sprite(textures[id]);s.anchor.set(.5);s.width=128;s.height=64;const p=iso(x-4.5,y-4.5);s.position.copyFrom(p);floors.addChild(s);inspect(a,x,y,s);layout.push(id);
 if(checks('grid')){const g=new Graphics().poly([p.x,p.y-32,p.x+64,p.y,p.x,p.y+32,p.x-64,p.y]).stroke({color:0xd5b27a,width:.8,alpha:.65});gridLayer.addChild(g);}
 }
 function prop(id:string,x:number,y:number,width:number){const a=manifest.assets.find(a=>a.id===id)!;const s=new Sprite(textures[id]);s.anchor.set(...a.pivot);s.scale.set(width/s.texture.width);const p=iso(x-4.5,y-4.5);s.position.copyFrom(p);s.zIndex=p.y;props.addChild(s);inspect(a,x,y,s);layout.push(`${id}:${x}:${y}`);n++;
 if(checks('inspect')){overlay.addChild(new Graphics().circle(p.x,p.y,2.4).fill(0xd6a257));}}
 prop('arch',0,0,150);for(let i=2;i<10;i+=2){prop('wall-a',i,0,155);prop('wall-b',0,i,155);}
 prop('tree',8,1,170);prop('tree',1,8,145);prop('relic',6,7,68);prop('roots',8,2,115);
 for(let i=0;i<20;i++){const x=1+Math.floor(random()*8),y=1+Math.floor(random()*8);if(x>3&&x<7&&y>3&&y<7)continue;const id=['rubble','grass','roots'][Math.floor(random()*3)];prop(id,x,y,id==='grass'?55:90);}
 probe=new Graphics().ellipse(0,0,10,5).fill({color:0xd9a74f,alpha:.25}).moveTo(0,-30).lineTo(9,-14).lineTo(0,0).lineTo(-9,-14).closePath().fill(0xf1c67f).stroke({color:0xffe4b2,width:1});probe.label='depth-probe';probe.position.copyFrom(probePos);probe.zIndex=probe.y;props.addChild(probe);
 arena?.attach(props);
 props.sortableChildren=checks('sort');
 let h=0;for(const c of layout.join('|'))h=Math.imul(h,31)+c.charCodeAt(0)|0;hash=(h>>>0).toString(16);
 $('stats').textContent=`100 TILES / ${n} PROPS / SEED ${hash}`;
 (window as any).__ARKADIA__={pixi:app.renderer.type,seed,hash,tiles:100,props:n,sorted:checks('sort'),layout,previewUsed:false,assets:12,probeY:probe.y};
}
async function start(){await app.init({resizeTo:view,backgroundAlpha:0,antialias:true,resolution:Math.min(devicePixelRatio,2),autoDensity:true,preference:'webgl'});view.appendChild(app.canvas);manifest=await(await fetch('/assets/manifest.json')).json();await Promise.all(manifest.assets.map(async a=>textures[a.id]=await Assets.load(`/assets/${a.id}.png`)));const chars=await loadCharacters();arena=new Arena(chars.sets,iso,rng('arena-crowd'));arena.spawn(Number($<HTMLSelectElement>('crowd').value));app.stage.addChild(world);world.addChild(floors,gridLayer,props,overlay);draw();reset();
 new ResizeObserver(()=>reset()).observe(view);
 $('generate').onclick=draw;$('next').onclick=()=>{$<HTMLInputElement>('seed').value=`perbatasan-${++counter}`;draw();};
 for(const id of ['grid','inspect','sort','props'])$(id).onchange=draw;
 $('checker').onchange=()=>{view.style.background=checks('checker')?'repeating-conic-gradient(#393b42 0 25%,#24272e 0 50%) 0/32px 32px':'';};
 $('reset').onclick=reset;$('source').onclick=()=>$<HTMLDialogElement>('assets').showModal();$('close').onclick=()=>$<HTMLDialogElement>('assets').close();
 $('gallery').innerHTML=manifest.assets.map(a=>`<figure><img src="/assets/${a.id}.png" alt="Extracted ${a.id}"><figcaption>${a.id} / ${a.rect.width}×${a.rect.height}</figcaption></figure>`).join('');
 view.addEventListener('pointerdown',e=>{drag=true;last={x:e.clientX,y:e.clientY};view.setPointerCapture(e.pointerId);});view.addEventListener('pointerup',()=>drag=false);view.addEventListener('pointermove',e=>{if(drag){world.x+=e.clientX-last.x;world.y+=e.clientY-last.y;last={x:e.clientX,y:e.clientY};}});
 view.addEventListener('wheel',e=>{e.preventDefault();const rect=view.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;const old=world.scale.x,next=Math.max(.2,Math.min(2.8,old*Math.exp(-e.deltaY*.001)));world.x=x-(x-world.x)*next/old;world.y=y-(y-world.y)*next/old;world.scale.set(next);updateZoom();},{passive:false});
 window.addEventListener('keydown',e=>{if(document.activeElement?.tagName==='INPUT')return;const d:Record<string,[number,number]>={ArrowUp:[0,-8],ArrowDown:[0,8],ArrowLeft:[-8,0],ArrowRight:[8,0]};if(d[e.key]){e.preventDefault();probe.x+=d[e.key][0];probe.y+=d[e.key][1];probe.zIndex=probe.y;probePos={x:probe.x,y:probe.y};(window as any).__ARKADIA__.probeY=probe.y;}});
 const a=arena!,refreshEquipment=mountEquipment($('equipment'),$('equip-detail'),chars.manifest.equipment,a),refreshHud=hud(a);
 app.ticker.add(t=>{a.update(t.deltaMS);refreshHud();refreshEquipment();});
 $('crowd').onchange=()=>{a.detach();a.spawn(Number($<HTMLSelectElement>('crowd').value));a.attach(props);};
 $('auto').onchange=()=>a.auto=checks('auto');$('mirror').onchange=()=>a.mirror=checks('mirror');$('pivots').onchange=()=>a.pivots=checks('pivots');
 const gameKey=(e:KeyboardEvent)=>{const k=e.key.toLowerCase();return ['w','a','s','d',' '].includes(k)?k:'';};
 window.addEventListener('keydown',e=>{if(document.activeElement?.tagName==='INPUT')return;const k=gameKey(e);if(k){e.preventDefault();a.keys.add(k);}if(e.key.toLowerCase()==='r'&&!a.hero.alive)a.respawnHero();});
 window.addEventListener('keyup',e=>{const k=gameKey(e);if(k){e.preventDefault();a.keys.delete(k);}});window.addEventListener('blur',()=>a.keys.clear());
 $('character-gallery').innerHTML=['hero','revenant','equipment'].map(id=>`<figure><img src="/assets/characters/${id}.png" alt="Atlas ${id}"><figcaption>${id}.png</figcaption></figure>`).join('');
 (window as any).__ARKADIA_ARENA__=a;(window as any).__ARKADIA_CHARACTERS__=()=>a.snapshot();
 (window as any).__ARKADIA_APP__=app;
}
start().catch(e=>{$('error').hidden=false;$('error').textContent=String(e);console.error(e);});
