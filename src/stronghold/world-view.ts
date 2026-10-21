import {FOUNDATION_SOIL,FOUNDATION_MOSS,FOUNDATION_DRIFT,drawFoundation} from './foundations';
import {environmentSprites,COURT,tilePoint,LEGACY_LAYOUT} from './terrain';
import {slots,calibration,WORLD} from './scene';
import {buildings,isBuilt,heroBonus,START_BUILT,type Building,type State} from './economy';
import {createLighting} from './lighting';
import {sunAt} from './daylight';
import {createHero} from './hero';
import {createEncounters} from './encounters';
import {setGateOpen,gateTowerFront} from './navigation';
import {createGateDoors,GATE_SHEET,type GateSheet} from './gate-doors';
import type {Walk} from './controls';
import type {Progress} from '../app/loader';
export async function createWorldView(canvas:HTMLCanvasElement,onSelect:(id:Building)=>void,direction:()=>Walk,progress:Progress=()=>{}){
 const ctx=canvas.getContext('2d')!,environment=environmentSprites(),images=new Map<string,HTMLImageElement>();
 let gateOpen=false,gatePassable=false;
 const spriteFile=(id:Building,level:number)=>id==='forge'?`/fortress-ui/forge-${level}.webp`:id==='gate'?'/modular-stronghold/v2/full-gateway-v3-open.webp':`/assets/${slots[id].asset}.png`;
 const paving='/modular-stronghold/v2/paving-warm-texture.png',snow='/modular-stronghold/v2/snow-soft-texture.png';
 // Loading-screen steps: every artwork file, then the hero, then the first world raster.
 const files=[...new Set([FOUNDATION_SOIL,FOUNDATION_MOSS,paving,snow,'/modular-stronghold/v2/full-gateway-v3-closed.webp','/modular-stronghold/v2/full-gateway-v3-sheet.webp',...environment.map(p=>p.file),...buildings.flatMap(b=>[1,2,3].map(l=>spriteFile(b,l)))])],steps=files.length+2;let loaded=0;
 progress(0,steps,'Loading artwork');
 await Promise.all(files.map(async file=>{const image=new Image();image.src=file;await image.decode();images.set(file,image);progress(++loaded,steps,'Loading artwork');}));
 let w=0,h=0,dpr=1,scale=1,cx=WORLD.width/2,cy=385,selected:Building|null=null,levels:State['levels']|undefined;
 // Standing buildings: a new game has only the tent and the gateway (economy.ts); ?buildings=all shows every one.
 let built=new Set<Building>(LEGACY_LAYOUT?buildings:START_BUILT);
 const material=(file:string,size:number)=>{const p=ctx.createPattern(images.get(file)!,'repeat')!;p.setTransform(new DOMMatrix([size,size/2,-size,size/2,COURT.x,COURT.y]));return p;};
 const snowPattern=material(snow,.7),pavingPattern=material(paving,.22);
 const polygon=(corners:number[][])=>{const path=new Path2D();corners.forEach(([u,v],i)=>{const p=tilePoint(u,v);i?path.lineTo(p.x,p.y):path.moveTo(p.x,p.y);});path.closePath();return path;};
 // Paving runs half a tile under the rear walls so snow cannot show between the
 // court and their inner foot. Front walls stand outside the court edge already.
 const court=polygon([[0,0],[15,0],[15,15],[0,15]]),paved=polygon([[-.5,-.5],[15,-.5],[15,15],[-.5,15]]);
 // Bake the soft ground shadow once. It must never run a blur filter while panning.
 const shadow=document.createElement('canvas'),shadowLeft=COURT.x-15*64-64,shadowTop=COURT.y-64;
 shadow.width=2048;shadow.height=1088;const shadowCtx=shadow.getContext('2d')!;shadowCtx.translate(-shadowLeft,-shadowTop);shadowCtx.strokeStyle='#29392d26';shadowCtx.lineWidth=30;shadowCtx.filter='blur(10px)';shadowCtx.stroke(court);
 function makeObjects(all=false){return [...environment.map(p=>({...p,selected:false})),...buildings.filter(id=>all||built.has(id)).map(id=>{const s=slots[id],c=calibration(id);return {layer:id==='gate'?'foreground' as const:'world' as const,id,...s,foot:s.pivot,shear:c.shear,vertical:c.vertical,depth:s.y,opacity:1,file:spriteFile(id,levels?.[id]||1),selected:id===selected};})].sort((a,b)=>({ground:0,backdrop:1,world:2,foreground:3})[a.layer]-({ground:0,backdrop:1,world:2,foreground:3})[b.layer]||a.depth-b.depth).map(p=>({...p,image:images.get(p.file)!,height:images.get(p.file)!.height*p.width/images.get(p.file)!.width}));}
 let objects=makeObjects(),signature='';canvas.dataset.buildings=[...built].join(',');
 // Rasterize the finite settlement once; camera movement only changes compositor
 // transforms. No tile creation, blur, canvas upload or eviction in a pan frame.
 const viewport=document.createElement('div');viewport.id='world-layers';viewport.setAttribute('aria-hidden','true');viewport.style.cssText='position:fixed;inset:0;overflow:hidden;pointer-events:none;contain:strict';
 const snowLayer=document.createElement('div'),surface=document.createElement('canvas');surface.id='world-surface';
 for(const layer of [snowLayer,surface])layer.style.cssText='position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform;pointer-events:none';
 viewport.append(snowLayer,surface);canvas.before(viewport);
 // Two source diagonals form a rectangular repeat of the isometric snow.
 const snowImage=images.get(snow)!,periodX=snowImage.width*1.4,periodY=snowImage.height*.7;
 const repeat=document.createElement('canvas');repeat.width=Math.ceil(periodX);repeat.height=Math.ceil(periodY);const rc=repeat.getContext('2d')!;
 rc.scale(repeat.width/periodX,repeat.height/periodY);rc.fillStyle=snowPattern;rc.fillRect(0,0,periodX,periodY);
 snowLayer.style.backgroundImage=`url(${repeat.toDataURL()})`;snowLayer.style.backgroundSize=`${periodX}px ${periodY}px`;
 // Conservative transformed bounds include every sprite (built or not, so the world never needs a new size), its shadow and court.
 const boundsObjects=makeObjects(true).map(p=>({...p,height:p.id==='forge'?Math.max(...[1,2,3].map(l=>{const image=images.get(spriteFile('forge',l))!;return image.height*p.width/image.width;})):p.height}));
 const points=boundsObjects.flatMap(p=>[-p.width/2,p.width/2].flatMap(x=>[-p.height*p.foot,p.height*(1-p.foot)].map(y=>({x:p.x+x,y:p.y+p.shear*x+p.vertical*y}))));
 const corners=[[0,0],[15,0],[15,15],[0,15]].map(([u,v])=>tilePoint(u,v));points.push(...corners);
 // Long low-sun shadows reach far past their sprite: each column's top, cast by the day's extreme sun
 // offsets. Without them the surface (and the shadow composed into it) ended at the sprite box, cutting
 // edge trees' shadows off in a straight line against the plain snow layer.
 const profiles=new Map<string,{top:Float32Array;bottom:Float32Array}>(),suns=[...Array(96).keys()].map(k=>sunAt(k/96)).filter(s=>s.alpha);
 const reach={left:Math.min(...suns.map(s=>s.dx)),right:Math.max(...suns.map(s=>s.dx)),up:Math.min(...suns.map(s=>s.dy)),down:Math.max(...suns.map(s=>s.dy))};
 for(const p of boundsObjects){if(p.layer==='ground')continue;const {top}=profile(p.image),n=top.length;
  for(let i=0;i<n;i++){if(top[i]<0)continue;const lx=-p.width/2+(i+.5)/n*p.width,x=p.x+lx,ground=p.y+p.shear*lx,height=-p.vertical*(top[i]-p.foot)*p.height;if(height<=0)continue;
   points.push({x:x+height*reach.left,y:ground},{x:x+height*reach.right,y:ground},{x,y:ground+height*reach.up},{x,y:ground+height*reach.down});}}
 const left=Math.floor(Math.min(...points.map(p=>p.x))-32),top=Math.floor(Math.min(...points.map(p=>p.y))-32);
 const worldWidth=Math.ceil(Math.max(...points.map(p=>p.x))-left+32),worldHeight=Math.ceil(Math.max(...points.map(p=>p.y))-top+32);
 // Fixed quality across pan/zoom, bounded backing store and texture dimensions.
 const raster=Math.min(1.75,Math.sqrt(32*1024*1024/(4*worldWidth*worldHeight)),4096/Math.max(worldWidth,worldHeight));
 surface.width=Math.floor(worldWidth*raster);surface.height=Math.floor(worldHeight*raster);surface.style.width=worldWidth+'px';surface.style.height=worldHeight+'px';
 const sc=surface.getContext('2d')!;let dirty=true,frame=0;
 // Day/night lighting is composited into this surface after each raster; see lighting.ts.
 const lighting=createLighting({surface,snowLayer,left,top,width:worldWidth,height:worldHeight,onSun:()=>castShadows()});lighting.setScene(objects);
 // Cast shadows: every upright sprite stands as a solid on its ground footprint. Per sprite column the
 // footprint spans back..front on screen and the roof line rises `height` above the back edge; the sun
 // sweeps that span along its ground offset, so a long morning shadow keeps the footprint's depth
 // instead of collapsing into a sheared sliver. Columns are built once per placed sprite; a sun step
 // fills them opaque into one 0.35x mask (so overlaps never double-darken) and blurs it once.
 // Each column is filled on its own: one Path2D of ~7k subpaths took ~1 s to build in Chrome.
 // Shadows stay out of the world raster: the world is rasterized once as a ground layer and an
 // uprights layer, and lighting.ts composes ground + shadow + uprights. A sun step used to re-raster
 // the whole 3738 x 2243 world (~0.5 s desktop, ~2.4 s on a 4x-throttled phone); now it rebuilds only
 // this 0.35x mask. (Cutting uprights out of the mask at 0.35x left a light halo around sprites.)
 type Column={x:number;w:number;back:number;front:number;height:number};
 const footprints=new Map<string,Column[]>();
 // Topmost and lowest opaque pixel of each source column, as fractions of the sprite height (-1 when empty).
 function profile(image:HTMLImageElement){
  let r=profiles.get(image.src);if(r)return r;const n=Math.min(256,image.width),m=Math.ceil(image.height*n/image.width),c=document.createElement('canvas');c.width=n;c.height=m;
  const x=c.getContext('2d',{willReadFrequently:true})!;x.drawImage(image,0,0,n,m);const d=x.getImageData(0,0,n,m).data,top=new Float32Array(n).fill(-1),bottom=new Float32Array(n).fill(-1);
  for(let i=0;i<n;i++)for(let y=0;y<m;y++)if(d[(y*n+i)*4+3]>128){if(top[i]<0)top[i]=y/m;bottom[i]=(y+1)/m;}
  r={top,bottom};profiles.set(image.src,r);return r;
 }
 // Trees and braziers (a tripod under an overhanging bowl) stand on a round footprint; everything else on
 // its bottom contour reflected through the midpoint of its left and right ground corners (a footprint
 // parallelogram is centrally symmetric), which recovers the hidden back edge of buildings, walls and
 // rocks under any calibrated shear.
 const round=/^(spruce-mature|fir-young|brazier)$/;
 // The expedition tent's open doorway shows its dark interior, whose lowest pixel sits far behind the canvas
 // walls: the hero walked into that notch and stood in front of the whole tent. Open-fronted sprites take the
 // lower convex hull of their ground contour (wall feet, poles, rope pegs) as the front edge instead.
 const hollow=/^expedition$/;
 function hollowFront(p:{id:string},bottom:Float32Array,first:number,last:number){
  if(!hollow.test(p.id))return bottom;const h:number[]=[],edge=Float32Array.from(bottom);
  for(let i=first;i<=last;i++){if(bottom[i]<0)continue;while(h.length>1){const o=h[h.length-2],a=h[h.length-1];if((a-o)*(bottom[i]-bottom[o])-(bottom[a]-bottom[o])*(i-o)<0)break;h.pop();}h.push(i);}
  for(let k=1;k<h.length;k++)for(let j=h[k-1];j<=h[k];j++)edge[j]=bottom[h[k-1]]+(bottom[h[k]]-bottom[h[k-1]])*(j-h[k-1])/(h[k]-h[k-1]);
  return edge;
 }
 // Ground contact of the two stone towers, measured separately from the hollow arch.
 // Reflecting the entire gateway silhouette treats its overhead arch as solid ground.
 function gateFootprint(){
  const cols:Column[]=[];
  for(const side of [-1,1])for(let d=36;d<=135;d+=3){
   const front=gateTowerFront(d);
   cols.push({x:577+side*d,w:3,back:front-34,front,height:110});
  }
  if(!gatePassable)for(let d=-35;d<=35;d+=3)cols.push({x:577+d,w:3,back:763,front:775,height:105});
  return cols;
 }
 function footprint(p:(typeof objects)[number]){
  const key=p.file+'|'+p.x+'|'+p.y+'|'+p.width;let cols=footprints.get(key);if(cols)return cols;cols=[];
  const {top,bottom}=profile(p.image),n=top.length,filled=[...top.keys()].filter(i=>top[i]>=0);
  const at=(u:number,t:number)=>{const lx=-p.width/2+(u+.5)/n*p.width;return {x:p.x+lx,y:p.y+p.shear*lx+p.vertical*(t-p.foot)*p.height};};
  // Ground corners are the outermost columns that reach the 2:1 ground lines rising from the lowest point.
  // Higher ends are overhangs (the mage tower's banner, a roof tip); reflecting through one pushed the
  // back edge hundreds of px behind the sprite, an invisible wall the hero could not walk behind.
  const base=filled.map(i=>at(i,bottom[i])),low=base.reduce((a,q)=>q.y>a.y?q:a);
  const grounded=filled.filter((_,k)=>base[k].y>=low.y-.5*Math.abs(base[k].x-low.x)-12),first=grounded[0],last=grounded[grounded.length-1];
  const edge=hollowFront(p,bottom,first,last);
  const front=(j:number)=>{if(j<first||j>last)return -1;const a=edge[Math.floor(j)],b=edge[Math.ceil(j)];return a<0?b:b<0?a:a+(b-a)*(j-Math.floor(j));};
  const ci=(first+last)/2,cy=(edge[first]+edge[last])/2;
  // Columns about 3.5 world px apart; the low-resolution blurred mask hides anything finer.
  const stride=Math.max(1,Math.round(3.5*n/p.width)),w=p.width/n*stride*1.2;
  for(let i=filled[0];i<=filled[filled.length-1];i+=stride){if(top[i]<0)continue;const t=at(i,top[i]);let back:number,front0:number;
   if(round.test(p.id)){const rx=p.width*.3,d=(t.x-p.x)/rx,s=Math.abs(d)<1?rx*.5*Math.sqrt(1-d*d):0;back=p.y-s;front0=p.y+s;}
   else{const f=at(i,edge[i]).y,r=front(2*ci-i);front0=f;back=r<0?f:Math.min(f,at(i,2*cy-r).y);}
   cols.push({x:t.x,w,back,front:front0,height:Math.max(0,back-t.y)});}
  footprints.set(key,cols);return cols;
 }
 const hull=(points:[number,number][])=>{points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cross=(o:number[],a:number[],b:number[])=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),chain=(list:[number,number][])=>{const h:[number,number][]=[];for(const q of list){while(h.length>1&&cross(h[h.length-2],h[h.length-1],q)<=0)h.pop();h.push(q);}h.pop();return h;};return [...chain(points),...chain([...points].reverse())];};
 const SHADE=.35,mask=document.createElement('canvas'),soft=document.createElement('canvas');mask.width=soft.width=Math.ceil(worldWidth*SHADE);mask.height=soft.height=Math.ceil(worldHeight*SHADE);
 // Sprite plus foundation in world space.
 function drawSprite(c:CanvasRenderingContext2D,p:(typeof objects)[number]){c.save();c.globalAlpha=p.opacity;c.translate(p.x,p.y);c.transform(1,p.shear,0,p.vertical,0,0);drawFoundation(c,p,images.get(FOUNDATION_SOIL)!,'under',images.get(FOUNDATION_DRIFT),images.get(FOUNDATION_MOSS));if(p.selected){c.shadowColor='#ffca64';c.shadowBlur=9;}c.drawImage(p.image,-p.width/2,-p.height*p.foot,p.width,p.height);c.shadowBlur=0;drawFoundation(c,p,images.get(FOUNDATION_SOIL)!,'face',images.get(FOUNDATION_DRIFT),images.get(FOUNDATION_MOSS));c.restore();}
 function castShadows(paint=true){
  const s=lighting.sun();if(!s.alpha){lighting.setShadow(null,0,paint);return;}const m=mask.getContext('2d')!,g=soft.getContext('2d')!;
  m.setTransform(1,0,0,1,0,0);m.clearRect(0,0,mask.width,mask.height);m.setTransform(SHADE,0,0,SHADE,-left*SHADE,-top*SHADE);m.fillStyle='rgb(20,28,44)';
  for(const p of objects){if(p.layer==='ground'||p.opacity<1)continue;
   for(const c of footprint(p)){const vx=c.height*s.dx,vy=c.height*s.dy,a=c.x-c.w/2,b=c.x+c.w/2;
    const h=hull([[a,c.back],[b,c.back],[a,c.front],[b,c.front],[a+vx,c.back+vy],[b+vx,c.back+vy],[a+vx,c.front+vy],[b+vx,c.front+vy]]);
    m.beginPath();h.forEach(([x,y],i)=>i?m.lineTo(x,y):m.moveTo(x,y));m.fill();}}
  // Penumbra widens with shadow length: crisp at noon, softer for the long low-sun shadows.
  g.clearRect(0,0,soft.width,soft.height);g.filter=`blur(${(.7+Math.hypot(s.dx,s.dy*2)).toFixed(2)}px)`;g.drawImage(mask,0,0);g.filter='none';
  lighting.setShadow(soft,s.alpha,paint);
 }
 // The player's hero walks the court in its own layer over the world; the camera eases after it.
 progress(loaded,steps,'Waking the hero');
 const sheet:GateSheet=await (await fetch(GATE_SHEET)).json();
 const doors=createGateDoors(viewport,images.get('/modular-stronghold/v2/full-gateway-v3-closed.webp')!,images.get('/modular-stronghold/v2/full-gateway-v3-sheet.webp')!,sheet,open=>{gatePassable=open;setGateOpen(open);hero.setScene(objects);},{revision:lighting.spriteRevision,shade:(source,target)=>lighting.shadeSprite(source,target,{left:442,top:790-sheet.region.h*.97,width:270,height:sheet.region.h})});
 lighting.subscribe(()=>doors.refreshLighting());
 // Combat (encounters.ts) steers the idle hero toward a revenant in reach and plays its swing, hit and death clips.
 let encounters:Awaited<ReturnType<typeof createEncounters>>|undefined;
 const hero=await createHero<(typeof objects)[number]>({layer:viewport,lightmap:viewport.querySelector<HTMLCanvasElement>('#world-lightmap')!,surface,footprint:p=>p.id==='gate'?gateFootprint():footprint(p),sun:lighting.sun,direction:()=>encounters?encounters.steer(direction()):direction(),follow,pose:()=>encounters?.pose()??null});hero.setScene(objects);
 encounters=await createEncounters({layer:viewport,hud:canvas.parentElement!,hero,direction});lighting.subscribe(s=>encounters!.setAmbient(s.ambient));
 progress(++loaded,steps,'Raising the Stronghold');
 // Everything standing above the ground shadows, at surface resolution with transparency.
 const uprights=document.createElement('canvas');uprights.id='world-uprights';uprights.width=surface.width;uprights.height=surface.height;
 function paintWorld(){
  const u=uprights.getContext('2d')!;u.setTransform(1,0,0,1,0,0);u.clearRect(0,0,uprights.width,uprights.height);
  for(const c of [sc,u])c.setTransform(surface.width/worldWidth,0,0,surface.height/worldHeight,-left*surface.width/worldWidth,-top*surface.height/worldHeight);
  sc.fillStyle=snowPattern;sc.fillRect(left,top,worldWidth,worldHeight);sc.fillStyle=pavingPattern;sc.fill(paved);sc.drawImage(shadow,shadowLeft,shadowTop);
  for(const p of objects){if(p.id==='gate'){sc.save();sc.translate(p.x,p.y);drawFoundation(sc,p,images.get(FOUNDATION_SOIL)!,'under',images.get(FOUNDATION_DRIFT),images.get(FOUNDATION_MOSS));sc.restore();}else drawSprite(p.layer==='ground'?sc:u,p);}
  castShadows(false);
  surface.dataset.foundations='soil-moss-v1';dirty=false;surface.dataset.paints=String(Number(surface.dataset.paints||0)+1);lighting.capture(uprights);doors.refreshLighting();
 }
 function draw(){
  if(!w||!h)return;if(dirty)paintWorld();const x=w/2-cx*scale,y=h/2-cy*scale;
  const placement=`translate3d(${x+left*scale}px,${y+top*scale}px,0) scale(${scale})`;surface.style.transform=placement;lighting.place(placement);doors.place(x,y,scale);hero.place(x,y,scale);encounters?.place(x,y,scale);
  // Wrap a repeated GPU layer rather than repainting an infinite background.
  const sx=((x%(periodX*scale))+periodX*scale)%(periodX*scale)-periodX*scale;
  const sy=((y%(periodY*scale))+periodY*scale)%(periodY*scale)-periodY*scale;
  // Sized for the furthest pinch zoom-out, so a pinch never resizes it: every resize re-rastered the whole
  // layer and its newly exposed bottom and right strips flickered empty on phones.
  const cover=Math.min(scale,.35),sw=Math.ceil(w/cover+periodX),sh=Math.ceil(h/cover+periodY);
  if(snowLayer.style.width!==sw+'px')snowLayer.style.width=sw+'px';if(snowLayer.style.height!==sh+'px')snowLayer.style.height=sh+'px';
  snowLayer.style.transform=`translate3d(${sx}px,${sy}px,0) scale(${scale})`;
  canvas.dataset.ready='true';canvas.dataset.mode='full-screen';canvas.dataset.renderer='composited-world';
 }
 function requestDraw(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;draw();});}
 function resize(){const nw=canvas.clientWidth,nh=canvas.clientHeight,nd=Math.min(devicePixelRatio||1,1.75);if(nw===w&&nh===h&&nd===dpr)return;w=nw;h=nh;dpr=nd;
  // This canvas is the transparent input/accessibility surface, not a frame buffer.
  if(canvas.width!==1)canvas.width=1;if(canvas.height!==1)canvas.height=1;
  scale=Math.max(.65,Math.min(1.35,h/900));requestDraw();}new ResizeObserver(resize).observe(canvas);resize();
 // Focus glides the camera with an eased tween; any drag, pinch or wheel takes control back.
 let glide=0;
 function stopGlide(){if(glide){cancelAnimationFrame(glide);glide=0;canvas.dataset.camera='idle';}}
 function glideTo(tx:number,ty:number){stopGlide();const fx=cx,fy=cy,distance=Math.hypot(tx-fx,ty-fy)*scale;
  if(distance<1||matchMedia('(prefers-reduced-motion: reduce)').matches){cx=tx;cy=ty;requestDraw();return;}
  // Advance by capped frame deltas: the selection repaint stalls the first frame,
  // and wall-clock timing would spend the whole glide inside that stall.
  const duration=Math.min(900,Math.max(380,240+distance*.6));let elapsed=0,last=0;canvas.dataset.camera='gliding';
  const step=(now:number)=>{elapsed+=last?Math.min(now-last,34):0;last=now;const t=Math.min(1,elapsed/duration),k=t<.5?4*t*t*t:1-(2-2*t)**3/2;cx=fx+(tx-fx)*k;cy=fy+(ty-fy)*k;draw();if(t<1)glide=requestAnimationFrame(step);else{glide=0;canvas.dataset.camera='idle';}};
  glide=requestAnimationFrame(step);}
 // Walking keeps the hero inside a central box and the camera eases after them past it; a drag still pans freely.
 function follow(hx:number,hy:number,dt:number){updateGate(hx,hy);if(held.size||!w)return;const zx=w/scale*.16,zy=h/scale*.14,fy=hy-40,tx=hx-Math.max(-zx,Math.min(zx,hx-cx)),ty=fy-Math.max(-zy,Math.min(zy,fy-cy));
  if(Math.abs(tx-cx)+Math.abs(ty-cy)<.05)return;stopGlide();const e=1-Math.exp(-dt/180);cx+=(tx-cx)*e;cy+=(ty-cy)*e;draw();}
 const held=new Map<number,{x:number;y:number}>();let moved=false,down={x:0,y:0};
 canvas.onpointerdown=e=>{stopGlide();canvas.setPointerCapture(e.pointerId);held.set(e.pointerId,{x:e.clientX,y:e.clientY});down={x:e.clientX,y:e.clientY};moved=false;};
 canvas.onpointermove=e=>{const prev=held.get(e.pointerId);if(!prev)return;const points=[...held.values()],before=points.length===2?Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y):0;cx-=(e.clientX-prev.x)/scale;cy-=(e.clientY-prev.y)/scale;held.set(e.pointerId,{x:e.clientX,y:e.clientY});if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)moved=true;if(before){const p=[...held.values()];scale=Math.max(.35,Math.min(2.2,scale*Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)/before));moved=true;}requestDraw();};
 const masks=new Map<string,{data:Uint8ClampedArray;width:number;height:number}>();
 function hitBuilding(id:Building,x:number,y:number){if(id==='gate')return doors.hit(x,y);const s=slots[id],c=calibration(id),file=spriteFile(id,levels?.[id]||1),image=images.get(file)!,height=image.height*s.width/image.width,dx=x-s.x,dy=(y-s.y-c.shear*dx)/c.vertical,px=(dx+s.width/2)/s.width,py=(dy+height*s.pivot)/height;if(px<0||py<0||px>=1||py>=1)return false;let mask=masks.get(file);if(!mask){const sample=document.createElement('canvas');sample.width=192;sample.height=Math.ceil(192*image.height/image.width);const sc=sample.getContext('2d')!;sc.drawImage(image,0,0,sample.width,sample.height);mask={data:sc.getImageData(0,0,sample.width,sample.height).data,width:sample.width,height:sample.height};masks.set(file,mask);}return mask.data[(Math.floor(py*mask.height)*mask.width+Math.floor(px*mask.width))*4+3]>40;}
 canvas.onpointerup=e=>{held.delete(e.pointerId);if(moved)return;const x=cx+(e.clientX-w/2)/scale,y=cy+(e.clientY-h/2)/scale;const hit=[...built].sort((a,b)=>slots[b].y-slots[a].y).find(id=>hitBuilding(id,x,y));if(hit)onSelect(hit);};
 canvas.onpointercancel=()=>{held.clear();moved=true;};canvas.onwheel=e=>{e.preventDefault();stopGlide();const old=scale;scale=Math.max(.35,Math.min(2.2,scale*Math.exp(-e.deltaY*.001)));cx+=(e.clientX-w/2)*(1/old-1/scale);cy+=(e.clientY-h/2)*(1/old-1/scale);requestDraw();};
 function updateGate(hx:number,hy:number){
  const d=Math.abs(hx-577),edge=d<36||d>135?770:gateTowerFront(d);
  doors.order(viewport.querySelector<HTMLElement>('#world-hero')!,hy<edge);
  // Ground-space distance to the threshold. Hysteresis prevents flickering at the edge.
  const near=Math.abs(hx-577)<(gateOpen?65:48)&&Math.abs(hy-770)<(gateOpen?88:66);
  if(near===gateOpen)return;
  gateOpen=near;doors.setOpen(near);
  canvas.dataset.gate=near?'open':'closed';
 }
 canvas.dataset.gate='closed';setGateOpen(false);updateGate(hero.position().x,hero.position().y);
 hero.start();
 return {update(state:State,id:Building|null){encounters?.setMaxHp(100+heroBonus(state));const next=buildings.map(b=>state.levels[b]+(isBuilt(state,b)?'':'x')).join(',')+':'+id;if(next===signature)return;signature=next;levels=state.levels;selected=id;if(!LEGACY_LAYOUT)built=new Set(buildings.filter(b=>isBuilt(state,b)));canvas.dataset.buildings=[...built].join(',');objects=makeObjects();lighting.setScene(objects);hero.setScene(objects);dirty=true;requestDraw();},focus(id:Building){glideTo(slots[id].x,slots[id].y-60);},fit(){stopGlide();scale=Math.max(.2,Math.min((w-40)/WORLD.width,(h-120)/WORLD.height));cx=WORLD.width/2;cy=385;requestDraw();},setTime:lighting.setTime,previewClock:lighting.preview,subscribeClock:lighting.subscribe};
}
