import {Container,Matrix,Rectangle,Sprite,Texture} from 'pixi.js';
import {FRONTIER_PROPS,FRONTIER_COLUMNS,FRONTIER_ATLAS,FRONTIER_KIT_SIZE,type FrontierProp} from '../world/frontier';
import type {Column} from './hero';
// The Frozen Frontier on screen (world/frontier.ts). Its props stand outside the court, beyond the baked world
// surface, so they are GPU sprites from one atlas: flat decals in one layer just above the surface, uprights and snow
// caps in a depth-sorted layer above the raised terrain, both culled to the camera, each layer one batch. Ground
// decals sort in three bands (trampled snow under floors, floors and flagstones, drifts and loose stones over them)
// and may be turned in the ground plane. Actors are drawn above everything and cut out where a prop stands in front
// (hero.ts occluders), so the props join the hero's scene: from the first frame for collision, and for occlusion once
// the art has arrived, as one image per sprite (and mirror) cropped from the atlas (hero.ts keys its alpha masks by
// image src). The atlas (1.1 MB WebP) is fetched once play starts (load()), after the loading screen, so it never
// competes with the game's own start-up.
export type FrontierPlaced={layer:'world';id:string;x:number;y:number;width:number;height:number;foot:number;shear:number;vertical:number;depth:number;opacity:number;file:string;selected:boolean;occluder:undefined;image:HTMLImageElement;frontier:FrontierProp};
// A ground decal turned by deg in the ground plane, drawn in the 2:1 projection: P·R·P⁻¹ with P = diag(1, 1/2).
function groundMatrix(deg:number,sx:number,sy:number,x:number,y:number){const r=deg*Math.PI/180,c=Math.cos(r),s=Math.sin(r);return new Matrix(c*sx,.5*s*sx,-2*s*sy,c*sy,x,y);}
export function createFrontier(worldStage:Container){
 const ground=new Container(),upright=new Container();
 ground.zIndex=10.05;upright.zIndex=10.6;ground.sortableChildren=upright.sortableChildren=true;
 worldStage.addChild(ground,upright);
 // Until the atlas arrives these images are empty (no natural size), which hero.ts treats as nothing to cut out.
 const imageKey=(p:FrontierProp)=>p.asset+(p.flip?':flip':'');
 const images=new Map(FRONTIER_PROPS.filter(p=>p.layer!=='ground').map(p=>[imageKey(p),new Image()]));
 // Ground pivot to the hero's Placed convention: x is the sprite's horizontal centre, foot the pivot's height share.
 const share=(p:FrontierProp)=>p.flip?1-p.pivot[0]:p.pivot[0];
 const scene:FrontierPlaced[]=FRONTIER_PROPS.filter(p=>p.layer!=='ground').map(p=>({layer:'world',id:p.key,x:p.x+p.width*(.5-share(p)),y:p.y,width:p.width,height:p.height,
  foot:(p.lift+p.height*p.pivot[1])/p.height,shear:p.shear,vertical:1,depth:p.y,opacity:1,file:'frozen-frontier:'+imageKey(p),selected:false,occluder:undefined,image:images.get(imageKey(p))!,frontier:p}));
 // Hero cutouts use the image centre; GPU sprites use the ground pivot. Account for
 // that difference so the doorway opening and both piers occlude at the drawn pixels.
 for(const s of scene)s.y+=s.shear*(s.x-s.frontier.x);
 const columns=new Map<string,Column[]>(scene.map(s=>[s.id,s.frontier.depthColumns.map(c=>({...c,height:s.height*s.foot}))]));
 type View={prop:FrontierProp;sprite:Sprite|null;x0:number;y0:number;x1:number;y1:number};
 const views:View[]=FRONTIER_PROPS.map(p=>{
  // A turned decal stays inside the circle around its pivot through its farthest corner (squashed 2:1 on screen).
  if(p.rot){const r=Math.hypot(Math.max(p.pivot[0],1-p.pivot[0])*p.width,2*Math.max(p.pivot[1],1-p.pivot[1])*p.height);return {prop:p,sprite:null,x0:p.x-r,x1:p.x+r,y0:p.y-r/2,y1:p.y+r/2};}
  const a=share(p),dy=[-p.width*a*p.shear,p.width*(1-a)*p.shear];return {prop:p,sprite:null,x0:p.x-p.width*a,x1:p.x+p.width*(1-a),y0:p.y-p.lift-p.height*p.pivot[1]+Math.min(...dy),y1:p.y-p.lift+p.height*(1-p.pivot[1])+Math.max(...dy)};});
 let loaded=false,failed=false,visible=0,cull='';
 const atlas=new Image();atlas.decoding='async';
 let start=()=>{};
 const ready=new Promise<void>(done=>{
  atlas.onerror=()=>{failed=true;done();};
  atlas.onload=()=>{atlas.decode().catch(()=>{}).then(async()=>{
   const source=Texture.from(atlas).source,textures=new Map<string,Texture>();
   for(const v of views){const p=v.prop;let texture=textures.get(p.asset);
    if(!texture)textures.set(p.asset,texture=new Texture({source,frame:new Rectangle(...p.frame)}));
    const s=new Sprite(texture);s.anchor.set(p.pivot[0],p.pivot[1]);
    const sx=p.width/p.frame[2]*(p.flip?-1:1),sy=p.height/p.frame[3];
    if(p.rot)s.setFromMatrix(groundMatrix(p.rot,sx,sy,p.x,p.y-p.lift));
    else if(p.shear)s.setFromMatrix(new Matrix(sx,p.shear*sx,0,sy,p.x,p.y-p.lift));
    else{s.position.set(p.x,p.y-p.lift);s.scale.set(sx,sy);}
    // Caps draw just in front of their wall; equal depths keep placement order. Ground bands keep trampled snow
    // under the floors and drifts over them.
    s.zIndex=p.layer==='ground'?p.band*1e6+p.y:p.y+(p.layer==='cap'?.05:0);s.visible=false;v.sprite=s;(p.layer==='ground'?ground:upright).addChild(s);}
   loaded=true;cull='';done();
   // Occlusion images, cropped off the critical path (a CPU canvas, so no GPU readback). Only the solid art cuts
   // actors out: the translucent contact shadows baked around the grounded modules are dropped.
   // Resolving ready does not yield the main thread. Give each crop its own task so
   // alpha readbacks and PNG encodes cannot monopolize the first playable frames.
   const yieldTask=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
   for(const [key,img] of images){await yieldTask();const p=FRONTIER_PROPS.find(q=>imageKey(q)===key)!,f=p.frame,c=document.createElement('canvas');c.width=f[2];c.height=f[3];
    const g=c.getContext('2d',{willReadFrequently:true})!;if(p.flip){g.translate(f[2],0);g.scale(-1,1);}g.drawImage(atlas,f[0],f[1],f[2],f[3],0,0,f[2],f[3]);
    const px=g.getImageData(0,0,f[2],f[3]);for(let i=3;i<px.data.length;i+=4)if(px.data[i]<150)px.data[i]=0;g.setTransform(1,0,0,1,0,0);g.putImageData(px,0,0);
    await new Promise<void>(resolve=>c.toBlob(b=>{if(b){const url=URL.createObjectURL(b);img.onload=img.onerror=()=>URL.revokeObjectURL(url);img.src=url;}resolve();}));}
  });};
  start=()=>{if(!atlas.src)atlas.src=FRONTIER_ATLAS;};
 });
 function place(x:number,y:number,scale:number,w:number,h:number){
  for(const c of [ground,upright]){c.position.set(x,y);c.scale.set(scale);}
  // Camera rectangle in world px, with a margin so props slide in already drawn.
  const m=96,l=(-x)/scale-m,t=(-y)/scale-m,r=(w-x)/scale+m,b=(h-y)/scale+m,key=[l,t,r,b].map(n=>Math.round(n/24)).join()+':'+loaded;
  if(key===cull)return;cull=key;visible=0;
  for(const v of views){if(!v.sprite)continue;const on=v.x1>l&&v.x0<r&&v.y1>t&&v.y0<b;v.sprite.visible=on;if(on)visible++;}
 }
 function setAmbient(rgb:number){ground.tint=rgb;upright.tint=rgb;}
 const stats=()=>({props:FRONTIER_PROPS.length,uprights:scene.length,columns:FRONTIER_COLUMNS.length,atlas:FRONTIER_ATLAS,loaded,failed,kit:FRONTIER_KIT_SIZE,
  occlusionImages:[...images.values()].filter(i=>i.complete&&i.naturalWidth>0).length,sprites:images.size,visible,assets:[...new Set(FRONTIER_PROPS.map(p=>p.asset))].sort()});
 (window as any).__FROZEN_FRONTIER__={stats,load:()=>start(),columns:()=>FRONTIER_COLUMNS,props:()=>FRONTIER_PROPS.map(p=>({asset:p.asset,zone:p.zone,u:p.u,v:p.v,x:p.x,y:p.y,layer:p.layer,solid:p.blocks.length>0,flip:p.flip,rot:p.rot,shear:p.shear})),ready,
  // QA: hide the scenery to measure what it costs (scripts/frozen-frontier-map/verify.mjs).
  setVisible:(on:boolean)=>{ground.visible=upright.visible=on;}};
 return {scene,ready,place,setAmbient,stats,load:()=>start(),
  // Footprint columns for a frontier prop in the hero's scene, else undefined.
  columns:(p:{id?:unknown})=>typeof p.id==='string'?columns.get(p.id):undefined};
}
