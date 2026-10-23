import {project,unproject} from '../isometric';
import {STRONGHOLD,type PrefabProp} from './prefabs/stronghold';
export {biomeAt,biomeDisplayName,type BiomeId} from './parallax';
// Court size and origin come from the Stronghold prefab (prefabs/stronghold.json).
export const COURT={...STRONGHOLD.court.origin,size:STRONGHOLD.court.size};
// ?buildings=all shows every building and court prop in its original slot, whatever the save has built (layout QA).
export const LEGACY_LAYOUT=typeof location!=='undefined'&&new URLSearchParams(location.search).get('buildings')==='all';
export function tilePoint(u:number,v:number){const p=project(u,v);return {x:p.x+COURT.x,y:p.y+COURT.y};}
const assetRoot='/modular-stronghold/',v2=assetRoot+'v2/';
export type EnvironmentSprite={layer:'ground'|'backdrop'|'world'|'foreground';id:string;x:number;y:number;width:number;foot:number;shear:number;vertical:number;depth:number;opacity:number;file:string};
const GROUND=['snowdrift-edge','weeds-edge','paving-worn'];
// Layer follows the prop's tile: rear rows sit behind the court, front rows (outside the gate wall) in front of it.
function prop(e:PrefabProp):EnvironmentSprite{const {id,u,v}=e,p=tilePoint(u,v),n=COURT.size;return {layer:GROUND.includes(id)?'ground':u<0||v<0||u===0||v===0?'backdrop':u>=n||v>=n?'foreground':'world',id,...p,width:e.width,foot:e.foot??.97,shear:e.shear??0,vertical:e.vertical??1,depth:e.depth??Math.round(p.y),opacity:e.opacity??1,file:(e.assetSet==='v1'?assetRoot:v2)+id+'.png'};}
// Walls, bastions, perimeter scenery and court dressing, in prefab order; the camp starts with the tent alone in
// the court, so the supply cart, crate, barrel and brazier come only with the old layout.
export function environmentSprites(){return STRONGHOLD.props.filter(e=>e.layout!=='legacy'||LEGACY_LAYOUT).map(prop);}
export function modularEnclosure(){return environmentSprites().map(p=>`<img class="terrain-prop ${p.id}" src="${p.file}" alt="" style="left:${p.x}px;top:${p.y}px;width:${p.width}px;z-index:${p.depth};--foot:${p.foot*100}%;--wall-shear:${p.shear};opacity:${p.opacity}">`).join('');}
export function installTerrain(scene:HTMLElement,world:{width:number;height:number}){
 const canvas=document.createElement('canvas');canvas.className='terrain-canvas';canvas.setAttribute('aria-hidden','true');scene.prepend(canvas);
 const ctx=canvas.getContext('2d')!;let ready=false;
 const paving=new Image(),snow=new Image();paving.src=v2+'paving-warm-texture.png';snow.src=v2+'snow-soft-texture.png';
 function draw(){
  const w=scene.clientWidth,h=scene.clientHeight;if(!w||!h)return;
  const scale=Math.min(w/world.width,h/world.height),ox=(w-world.width*scale)/2,oy=(h-world.height*scale)/2,dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#a9a99c';ctx.fillRect(0,0,w,h);if(!ready)return;
  ctx.translate(ox,oy);ctx.scale(scale,scale);
  const surface=(image:HTMLImageElement,s:number)=>{const p=ctx.createPattern(image,'repeat')!;p.setTransform(new DOMMatrix([s,s*.5,-s,s*.5,COURT.x,COURT.y]));return p;};
  ctx.fillStyle=surface(snow,.7);ctx.fillRect(-ox/scale,-oy/scale,w/scale,h/scale);
  const n=COURT.size,corners=[[0,0],[n,0],[n,n],[0,n]].map(([u,v])=>tilePoint(u,v));ctx.beginPath();corners.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=surface(paving,.22);ctx.fill();
  // A restrained wall-foot contact shadow grounds the assembled structures.
  ctx.save();ctx.strokeStyle='#31352c30';ctx.lineWidth=30;ctx.filter='blur(12px)';ctx.stroke();ctx.restore();
  const light=ctx.createRadialGradient(560,200,100,560,200,1000);light.addColorStop(0,'#fff5db10');light.addColorStop(1,'#17212d20');ctx.fillStyle=light;ctx.fillRect(-ox/scale,-oy/scale,w/scale,h/scale);
  const a=unproject(w/scale,h/scale);canvas.dataset.tiles=String(Math.ceil((Math.abs(a.x)+20)*(Math.abs(a.y)+20)));canvas.dataset.ready='true';canvas.dataset.revision='2';
 }
 Promise.all([paving.decode(),snow.decode()]).then(()=>{ready=true;draw();}).catch(()=>{canvas.dataset.error='Terrain assets failed to load';});new ResizeObserver(draw).observe(scene);draw();return draw;
}
