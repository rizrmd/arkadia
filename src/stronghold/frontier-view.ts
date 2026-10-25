import {measureRenderDetail} from '../app/render-diagnostics';
import {BlurFilter,ColorMatrixFilter,Container,Graphics,Matrix,Rectangle,Sprite,Texture} from 'pixi.js';
import {FRONTIER_PROPS,FRONTIER_COLUMNS,FRONTIER_ATLAS,FRONTIER_KIT_SIZE,type FrontierProp} from '../world/frontier';
import {RELIEF,PX_PER_METER} from '../world/relief';
import {project} from '../isometric';
import {STRONGHOLD} from './prefabs/stronghold';
import type {Column} from './hero';
// The Frozen Frontier on screen (world/frontier.ts). Its props stand outside the court, beyond the baked world
// surface, so they are GPU sprites from one atlas: flat decals in one layer just above the surface, uprights and snow
// caps in a depth-sorted layer above the raised terrain, both culled to the camera, each layer one batch. Ground
// decals sort in three bands (trampled snow under floors, floors and flagstones, drifts and loose stones over them)
// and may be turned in the ground plane. Actors are drawn above everything and cut out where a prop stands in front
// (hero.ts occluders), so the props join the hero's scene: from the first frame for collision, and for occlusion once
// the art has arrived, as one image per sprite (and mirror) cropped from the atlas (hero.ts keys its alpha masks by
// image src). Every upright also casts a sun shadow (setSun, daylight.ts sunAt), like the court, the hero and the
// enemies: its sprite again, laid onto the ground in vertical strips, each pixel moved from the ground line below it
// (build-assets.mjs groundLine) by its height along the sun's offset; one filter flattens the layer to the shadow
// colour at the sun's alpha, so overlapping shadows do not darken each other. The decoded atlas is part of
// startup artwork; ready resolves after sprites exist, before the loading screen reveals the world.
export type FrontierPlaced={layer:'world';id:string;x:number;y:number;width:number;height:number;foot:number;shear:number;vertical:number;depth:number;opacity:number;file:string;selected:boolean;occluder:undefined;image:HTMLImageElement;frontier:FrontierProp;relief?:typeof RELIEF[number]};
// A ground decal turned by deg in the ground plane, drawn in the 2:1 projection: P·R·P⁻¹ with P = diag(1, 1/2).
function groundMatrix(deg:number,sx:number,sy:number,x:number,y:number){const r=deg*Math.PI/180,c=Math.cos(r),s=Math.sin(r);return new Matrix(c*sx,.5*s*sx,-2*s*sy,c*sy,x,y);}
// Strips per upright shadow: about one per 40 world px of width, so a wall's slope or a corner's V stays on its base.
// Stone plinths and stair feet have sharp contours. Wide strips bridge over their
// lowest points, so use each measured segment for these small hard-edged bases.
const stripsOf=(p:FrontierProp)=>(p.asset.startsWith('grave-')||p.asset.startsWith('pillar-')||p.asset.startsWith('stairs-'))?Math.max(1,p.ground.length-1):Math.max(1,Math.min(8,Math.round(p.width/40)));
// The ground line's height (sprite px from the top) at frame x.
function groundAt(p:FrontierProp,fx:number){const g=p.ground,n=g.length-1,t=Math.max(0,Math.min(n,fx/p.frame[2]*n)),i=Math.min(n-1,Math.floor(t));return (n?g[i]+(g[i+1]-g[i])*(t-i):g[0])*p.frame[3];}
type Sun={alpha:number;dx:number;dy:number};
// Raised floors among the ground decals, by the height of their top face (world px at scale 1; the temple podium's
// top sits 25.3 px up, ground-kit.mjs). They cast their silhouette shifted by that height along the sun.
const SLABS:Record<string,number>={foundation:25.3,'temple-podium':25.3};
const isSlab=(p:FrontierProp)=>p.layer==='ground'&&!p.rot&&p.asset in SLABS;
// A sun along the screen x axis (dy near 0) would flatten a shadow to a line; a little depth keeps it a shape.
const depthOf=(s:Sun)=>(s.dy<0?-1:1)*Math.max(Math.abs(s.dy),.12);
// Shadow strip i of n for sun s: the strip's frame px (u, v) to world px. A pixel h px above the ground line lands
// h·(dx, dy) from the ground below it.
function stripMatrix(p:FrontierProp,i:number,n:number,s:Sun,receiverLift=0){
 const fw=p.frame[2],f0=Math.round(fw*i/n),f1=Math.round(fw*(i+1)/n),b0=groundAt(p,f0),k=(groundAt(p,f1)-b0)/Math.max(1,f1-f0);
 const sx=p.width/fw*(p.flip?-1:1),sy=p.height/p.frame[3],ax=p.pivot[0]*fw,ay=p.pivot[1]*p.frame[3],dx=s.dx,dy=depthOf(s),drop=p.lift-receiverLift;
 return new Matrix(sx+dx*sy*k,p.shear*sx+sy*k*(1+dy),-dx*sy,-dy*sy,p.x+sx*(f0-ax)+dx*sy*b0+dx*drop,p.y-p.lift+p.shear*sx*(f0-ax)+sy*(b0-ay)+dy*sy*b0+(1+dy)*drop);
}
export function createFrontier(worldStage:Container,atlas:HTMLImageElement){
 const ground=new Container(),shade=new Container(),upright=new Container();
 ground.zIndex=10.05;shade.zIndex=10.08;upright.zIndex=10.6;ground.sortableChildren=upright.sortableChildren=true;
 // Shadows take the court's colour, rgb(20, 28, 44), softened like the court's (world-view.ts castShadows); both
 // passes run at half resolution.
 const shadeFilter=new ColorMatrixFilter({resolution:.5}),shadeArea=new Rectangle();
 shade.filters=[shadeFilter,new BlurFilter({strength:1.5,quality:1,resolution:.5})];shade.filterArea=shadeArea;shade.visible=false;
 worldStage.addChild(ground,shade,upright);
 // Separate receivers: pillar shadows land on the podium top, then drop to snow
 // outside its volume. A single flat projection made their shadows float at top height.
 const podium=RELIEF.find(f=>f.id==='temple-podium')!,podiumLift=podium.heightM!*PX_PER_METER;
 const groundShade=new Container(),topShade=new Container();shade.addChild(groundShade,topShade);
 const O=STRONGHOLD.court.origin,at=(u:number,v:number,h:number)=>{const p=project(u,v);return [O.x+p.x,O.y+p.y-h];};
 const ring=[[podium.u0,podium.v0],[podium.u1,podium.v0],[podium.u1,podium.v1],[podium.u0,podium.v1]];
 const topMask=new Graphics().poly(ring.flatMap(([u,v])=>at(u,v,podiumLift))).fill(0xffffff);
 const solidMask=new Graphics().poly([
  ...at(podium.u0,podium.v0,podiumLift),...at(podium.u1,podium.v0,podiumLift),
  ...at(podium.u1,podium.v0,0),...at(podium.u1,podium.v1,0),...at(podium.u0,podium.v1,0),...at(podium.u0,podium.v1,podiumLift),
 ]).fill(0xffffff);
 shade.addChild(topMask,solidMask);topShade.mask=topMask;groundShade.setMask({mask:solidMask,inverse:true});
 // Until the atlas arrives these images are empty (no natural size), which hero.ts treats as nothing to cut out.
 const imageKey=(p:FrontierProp)=>p.asset+(p.flip?':flip':'');
 const images=new Map(FRONTIER_PROPS.filter(p=>p.layer!=='ground'||isSlab(p)).map(p=>[imageKey(p),new Image()]));
 // Ground pivot to the hero's Placed convention: x is the sprite's horizontal centre, foot the pivot's height share.
 const share=(p:FrontierProp)=>p.flip?1-p.pivot[0]:p.pivot[0];
 const scene:FrontierPlaced[]=FRONTIER_PROPS.filter(p=>p.layer!=='ground'||isSlab(p)).map(p=>({layer:'world',id:p.key,x:p.x+p.width*(.5-share(p)),y:p.y,width:p.width,height:p.height,
  foot:(p.lift+p.height*p.pivot[1])/p.height,shear:p.shear,vertical:1,depth:p.y,opacity:1,file:'frozen-frontier:'+imageKey(p),selected:false,occluder:undefined,image:images.get(imageKey(p))!,frontier:p,relief:isSlab(p)?podium:p.asset==='stairs-nw'?RELIEF.find(f=>f.id==='temple-stairs'):undefined}));
 // Hero cutouts use the image centre; GPU sprites use the ground pivot. Account for
 // that difference so the doorway opening and both piers occlude at the drawn pixels.
 for(const s of scene)s.y+=s.shear*(s.x-s.frontier.x);
 const columns=new Map<string,Column[]>(scene.map(s=>[s.id,s.frontier.depthColumns.map(c=>({...c,height:s.height*s.foot}))]));
 type View={prop:FrontierProp;sprite:Sprite|null;x0:number;y0:number;x1:number;y1:number};
 const views:View[]=FRONTIER_PROPS.map(p=>{
  // A turned decal stays inside the circle around its pivot through its farthest corner (squashed 2:1 on screen).
  if(p.rot){const r=Math.hypot(Math.max(p.pivot[0],1-p.pivot[0])*p.width,2*Math.max(p.pivot[1],1-p.pivot[1])*p.height);return {prop:p,sprite:null,x0:p.x-r,x1:p.x+r,y0:p.y-r/2,y1:p.y+r/2};}
  const a=share(p),dy=[-p.width*a*p.shear,p.width*(1-a)*p.shear];return {prop:p,sprite:null,x0:p.x-p.width*a,x1:p.x+p.width*(1-a),y0:p.y-p.lift-p.height*p.pivot[1]+Math.min(...dy),y1:p.y-p.lift+p.height*(1-p.pivot[1])+Math.max(...dy)};});
 // Shadow strips of the uprights and raised floors, and the box their shadow covers under the current sun (with the
 // prop's own). A raised floor lies in the ground layer under the shadows, so a copy of it erases its own shadow off
 // its top (drawn after the floors' shadows, before the uprights', so pillars still shade the podium).
 type Shadow={view:View;strips:Sprite[];lift:number;receiverLift:number;eraser:Sprite|null;x0:number;y0:number;x1:number;y1:number};
 const shadows:Shadow[]=views.filter(v=>v.prop.layer!=='ground'||isSlab(v.prop)).sort((a,b)=>Number(isSlab(b.prop))-Number(isSlab(a.prop)))
  .flatMap(view=>{const elevated=view.prop.lift>0&&view.prop.zone==='Temple';
   const make=(receiverLift:number):Shadow=>({view,strips:[],lift:isSlab(view.prop)?SLABS[view.prop.asset]*view.prop.s:0,receiverLift,eraser:null,x0:view.x0,y0:view.y0,x1:view.x1,y1:view.y1});
   return elevated?[make(podiumLift),make(0)]:[make(0)];});
 let sun:Sun={alpha:0,dx:0,dy:0},sunKey='',shown=0;
 function castShadows(){
  const dy=depthOf(sun);
  for(const sh of shadows){const p=sh.view.prop,v=sh.view,n=sh.strips.length,h=sh.lift||p.height+p.lift;
   if(sh.lift)for(const st of sh.strips)st.position.set(p.x+h*sun.dx,p.y-p.lift+h*(1+dy));
   else sh.strips.forEach((st,i)=>st.setFromMatrix(stripMatrix(p,i,n,sun,sh.receiverLift)));
   sh.x0=v.x0+Math.min(0,h*sun.dx);sh.x1=v.x1+Math.max(0,h*sun.dx);sh.y0=Math.min(v.y0,v.y1+h*Math.min(0,dy));sh.y1=v.y1+Math.max(0,h*dy);}
 }
 let loaded=false,failed=false,visible=0,cull='';
 const ready=new Promise<void>((done,reject)=>{
  void (async()=>{
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
   const slabs=shadows.filter(sh=>sh.lift);
   for(const sh of slabs){const p=sh.view.prop,copy=()=>{const c=new Sprite(textures.get(p.asset));c.anchor.set(p.pivot[0],p.pivot[1]);c.scale.set(p.width/p.frame[2]*(p.flip?-1:1),p.height/p.frame[3]);c.visible=false;return c;};
    sh.strips.push(copy());sh.eraser=copy();sh.eraser.position.set(p.x,p.y-p.lift);sh.eraser.blendMode='erase';groundShade.addChild(sh.strips[0]);}
   for(const sh of slabs)groundShade.addChild(sh.eraser!);
   for(const sh of shadows){if(sh.lift)continue;const p=sh.view.prop,n=stripsOf(p),fw=p.frame[2];
    for(let i=0;i<n;i++){const f0=Math.round(fw*i/n),f1=Math.round(fw*(i+1)/n),key=`${p.asset}:${n}:${i}`;let texture=textures.get(key);
     if(!texture)textures.set(key,texture=new Texture({source,frame:new Rectangle(p.frame[0]+f0,p.frame[1],Math.max(1,f1-f0),p.frame[3])}));
     const st=new Sprite(texture);st.visible=false;sh.strips.push(st);(sh.receiverLift?topShade:groundShade).addChild(st);}}
   castShadows();
   loaded=true;cull='';done();
   // Occlusion images, cropped off the critical path (a CPU canvas, so no GPU readback). Only the solid art cuts
   // actors out: the translucent contact shadows baked around the grounded modules are dropped.
   // Resolving ready does not yield the main thread. Give each crop its own task so
   // alpha readbacks and PNG encodes cannot monopolize the first playable frames.
   const yieldTask=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
   for(const [key,img] of images){await yieldTask();const p=FRONTIER_PROPS.find(q=>imageKey(q)===key)!,f=p.frame,c=document.createElement('canvas');c.width=f[2];c.height=f[3];
    measureRenderDetail('sceneryMask',()=>{const g=c.getContext('2d',{willReadFrequently:true})!;if(p.flip){g.translate(f[2],0);g.scale(-1,1);}g.drawImage(atlas,f[0],f[1],f[2],f[3],0,0,f[2],f[3]);
    const px=g.getImageData(0,0,f[2],f[3]);for(let i=3;i<px.data.length;i+=4)if(px.data[i]<150)px.data[i]=0;g.setTransform(1,0,0,1,0,0);g.putImageData(px,0,0);});
    await new Promise<void>(resolve=>c.toBlob(b=>{if(b){const url=URL.createObjectURL(b);img.onload=img.onerror=()=>URL.revokeObjectURL(url);img.src=url;}resolve();}));}
  })().catch(error=>{failed=true;reject(error);});
 });
 function place(x:number,y:number,scale:number,w:number,h:number){
  for(const c of [ground,shade,upright]){c.position.set(x,y);c.scale.set(scale);}
  // The filter covers the screen (in the layer's world px), so Pixi never measures the bounds of every strip. An
  // area off the screen would make Pixi skip the filter and draw the strips as plain sprites.
  shadeArea.x=-x/scale-16;shadeArea.y=-y/scale-16;shadeArea.width=w/scale+32;shadeArea.height=h/scale+32;
  // Camera rectangle in world px, with a margin so props slide in already drawn.
  const m=96,l=(-x)/scale-m,t=(-y)/scale-m,r=(w-x)/scale+m,b=(h-y)/scale+m,key=[l,t,r,b].map(n=>Math.round(n/24)).join()+':'+loaded+':'+sunKey;
  if(key===cull)return;cull=key;visible=0;shown=0;
  for(const v of views){if(!v.sprite)continue;const on=v.x1>l&&v.x0<r&&v.y1>t&&v.y0<b;v.sprite.visible=on;if(on)visible++;}
  for(const sh of shadows){const on=sun.alpha>0&&sh.x1>l&&sh.x0<r&&sh.y1>t&&sh.y0<b;for(const st of sh.strips)st.visible=on;if(sh.eraser)sh.eraser.visible=on;if(on&&sh.strips.length)shown++;}
  shade.visible=shown>0;
 }
 // The sun (daylight.ts sunAt) moves in steps; each step re-lays every shadow strip (a few hundred props, cheap).
 function setSun(s:Sun){
  const key=s.alpha?[s.alpha,s.dx,s.dy].map(n=>n.toFixed(3)).join():'none';if(key===sunKey)return;sunKey=key;sun={alpha:s.alpha,dx:s.dx,dy:s.dy};
  shadeFilter.matrix=[0,0,0,0,20/255, 0,0,0,0,28/255, 0,0,0,0,44/255, 0,0,0,s.alpha,0];
  castShadows();cull='';
 }
 function setAmbient(rgb:number){ground.tint=rgb;upright.tint=rgb;}
 const stats=()=>({props:FRONTIER_PROPS.length,uprights:scene.length,columns:FRONTIER_COLUMNS.length,atlas:FRONTIER_ATLAS,loaded,failed,kit:FRONTIER_KIT_SIZE,
  occlusionImages:[...images.values()].filter(i=>i.complete&&i.naturalWidth>0).length,sprites:images.size,visible,
  shadows:{casters:new Set(shadows.map(sh=>sh.view)).size,strips:shadows.reduce((n,sh)=>n+sh.strips.length,0),shown,alpha:sun.alpha,dx:+sun.dx.toFixed(3),dy:+sun.dy.toFixed(3)},assets:[...new Set(FRONTIER_PROPS.map(p=>p.asset))].sort()});
 (window as any).__FROZEN_FRONTIER__={stats,load:()=>ready,columns:()=>FRONTIER_COLUMNS,props:()=>FRONTIER_PROPS.map(p=>({asset:p.asset,zone:p.zone,u:p.u,v:p.v,x:p.x,y:p.y,layer:p.layer,solid:p.blocks.length>0,flip:p.flip,rot:p.rot,shear:p.shear})),ready,
  // QA: hide the scenery to measure what it costs (scripts/frozen-frontier-map/verify.mjs).
  setVisible:(on:boolean)=>{ground.visible=upright.visible=on;shade.renderable=on;}};
 return {scene,ready,place,setAmbient,setSun,stats,load:()=>ready,
  // Footprint columns for a frontier prop in the hero's scene, else undefined.
  columns:(p:{id?:unknown})=>typeof p.id==='string'?columns.get(p.id):undefined};
}
