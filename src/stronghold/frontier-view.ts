import {Container,Rectangle,Sprite,Texture} from 'pixi.js';
import {FRONTIER_PROPS,FRONTIER_COLUMNS,FRONTIER_ATLAS,type FrontierProp} from '../world/frontier';
import type {Column} from './hero';
// The Frozen Frontier on screen (world/frontier.ts). Its props stand outside the court, beyond the baked world
// surface, so they are GPU sprites from one atlas: flat decals in one layer just above the surface, uprights and snow
// caps in a depth-sorted layer above the raised terrain, both culled to the camera, each layer one batch. Actors are
// drawn above everything and cut out where a prop stands in front (hero.ts occluders), so the props join the hero's
// scene: from the first frame for collision, and for occlusion once the art has arrived, as one image per sprite
// cropped from the atlas (hero.ts keys its alpha masks by image src). The atlas (1.2 MB WebP) is fetched once play
// starts (load()), after the loading screen, so it never competes with the game's own start-up.
export type FrontierPlaced={layer:'world';id:string;x:number;y:number;width:number;height:number;foot:number;shear:number;vertical:number;depth:number;opacity:number;file:string;selected:boolean;occluder:undefined;image:HTMLImageElement;frontier:FrontierProp};
export function createFrontier(worldStage:Container){
 const ground=new Container(),upright=new Container();
 ground.zIndex=10.05;upright.zIndex=10.6;ground.sortableChildren=upright.sortableChildren=true;
 worldStage.addChild(ground,upright);
 // Until the atlas arrives these images are empty (no natural size), which hero.ts treats as nothing to cut out.
 const images=new Map(FRONTIER_PROPS.map(p=>[p.asset,new Image()]));
 // Ground pivot to the hero's Placed convention: x is the sprite's horizontal centre, foot the pivot's height share.
 const scene:FrontierPlaced[]=FRONTIER_PROPS.filter(p=>p.layer!=='ground').map(p=>({layer:'world',id:p.key,x:p.x+p.width*(.5-p.pivot[0]),y:p.y,width:p.width,height:p.height,
  foot:(p.lift+p.height*p.pivot[1])/p.height,shear:0,vertical:1,depth:p.y,opacity:1,file:'frozen-frontier:'+p.asset,selected:false,occluder:undefined,image:images.get(p.asset)!,frontier:p}));
 const columns=new Map<string,Column[]>(scene.map(s=>[s.id,s.frontier.depthColumns.map(c=>({...c,height:s.height*s.foot}))]));
 type View={prop:FrontierProp;sprite:Sprite|null;x0:number;y0:number;x1:number;y1:number};
 const views:View[]=FRONTIER_PROPS.map(p=>({prop:p,sprite:null,x0:p.x-p.width*p.pivot[0],x1:p.x+p.width*(1-p.pivot[0]),y0:p.y-p.lift-p.height*p.pivot[1],y1:p.y-p.lift+p.height*(1-p.pivot[1])}));
 let loaded=false,failed=false,visible=0,cull='';
 const atlas=new Image();atlas.decoding='async';
 let start=()=>{};
 const ready=new Promise<void>(done=>{
  atlas.onerror=()=>{failed=true;done();};
  atlas.onload=()=>{atlas.decode().catch(()=>{}).then(()=>{
   const source=Texture.from(atlas).source,textures=new Map<string,Texture>();
   for(const v of views){const p=v.prop;let texture=textures.get(p.asset);
    if(!texture)textures.set(p.asset,texture=new Texture({source,frame:new Rectangle(...p.frame)}));
    const s=new Sprite(texture);s.anchor.set(p.pivot[0],p.pivot[1]);s.position.set(p.x,p.y-p.lift);s.width=p.width;s.height=p.height;
    // Caps draw just in front of their wall; equal depths keep placement order.
    s.zIndex=p.y+(p.layer==='cap'?.05:0);s.visible=false;v.sprite=s;(p.layer==='ground'?ground:upright).addChild(s);}
   loaded=true;cull='';done();
   // Occlusion images, cropped off the critical path.
   for(const [asset,img] of images){const f=FRONTIER_PROPS.find(p=>p.asset===asset)!.frame,c=document.createElement('canvas');c.width=f[2];c.height=f[3];
    c.getContext('2d')!.drawImage(atlas,f[0],f[1],f[2],f[3],0,0,f[2],f[3]);c.toBlob(b=>{if(b)img.src=URL.createObjectURL(b);});}
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
 const stats=()=>({props:FRONTIER_PROPS.length,uprights:scene.length,columns:FRONTIER_COLUMNS.length,atlas:FRONTIER_ATLAS,loaded,failed,
  occlusionImages:[...images.values()].filter(i=>i.complete&&i.naturalWidth>0).length,sprites:images.size,visible,assets:[...images.keys()].sort()});
 (window as any).__FROZEN_FRONTIER__={stats,load:()=>start(),columns:()=>FRONTIER_COLUMNS,props:()=>FRONTIER_PROPS.map(p=>({asset:p.asset,zone:p.zone,u:p.u,v:p.v,x:p.x,y:p.y,layer:p.layer,solid:p.blocks.length>0})),ready,
  // QA: hide the scenery to measure what it costs (scripts/frozen-frontier-map/verify.mjs).
  setVisible:(on:boolean)=>{ground.visible=upright.visible=on;}};
 return {scene,ready,place,setAmbient,stats,load:()=>start(),
  // Footprint columns for a frontier prop in the hero's scene, else undefined.
  columns:(p:{id?:unknown})=>typeof p.id==='string'?columns.get(p.id):undefined};
}
