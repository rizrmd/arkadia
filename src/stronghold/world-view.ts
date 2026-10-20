import {environmentSprites,COURT,tilePoint} from './terrain';
import {slots,calibration,WORLD} from './scene';
import {buildings,type Building,type State} from './economy';
export async function createWorldView(canvas:HTMLCanvasElement,onSelect:(id:Building)=>void){
 const ctx=canvas.getContext('2d')!,environment=environmentSprites(),images=new Map<string,HTMLImageElement>();
 const spriteFile=(id:Building,level:number)=>id==='forge'?`/fortress-ui/forge-${level}.webp`:id==='gate'?'/modular-stronghold/v2/gateway-grand.png':`/assets/${slots[id].asset}.png`;
 const paving='/modular-stronghold/v2/paving-warm-texture.png',snow='/modular-stronghold/v2/snow-soft-texture.png';
 await Promise.all([...new Set([paving,snow,...environment.map(p=>p.file),...buildings.flatMap(b=>[1,2,3].map(l=>spriteFile(b,l)))])].map(async file=>{const image=new Image();image.src=file;await image.decode();images.set(file,image);}));
 let w=0,h=0,dpr=1,scale=1,cx=WORLD.width/2,cy=385,selected:Building='forge',levels:State['levels']|undefined;
 const material=(file:string,size:number)=>{const p=ctx.createPattern(images.get(file)!,'repeat')!;p.setTransform(new DOMMatrix([size,size/2,-size,size/2,COURT.x,COURT.y]));return p;};
 const snowPattern=material(snow,.7),pavingPattern=material(paving,.22);
 const polygon=(corners:number[][])=>{const path=new Path2D();corners.forEach(([u,v],i)=>{const p=tilePoint(u,v);i?path.lineTo(p.x,p.y):path.moveTo(p.x,p.y);});path.closePath();return path;};
 // Paving runs half a tile under the rear walls so snow cannot show between the
 // court and their inner foot. Front walls stand outside the court edge already.
 const court=polygon([[0,0],[15,0],[15,15],[0,15]]),paved=polygon([[-.5,-.5],[15,-.5],[15,15],[-.5,15]]);
 // Bake the soft ground shadow once. It must never run a blur filter while panning.
 const shadow=document.createElement('canvas'),shadowLeft=COURT.x-15*64-64,shadowTop=COURT.y-64;
 shadow.width=2048;shadow.height=1088;const shadowCtx=shadow.getContext('2d')!;shadowCtx.translate(-shadowLeft,-shadowTop);shadowCtx.strokeStyle='#29392d26';shadowCtx.lineWidth=30;shadowCtx.filter='blur(10px)';shadowCtx.stroke(court);
 function makeObjects(){return [...environment.map(p=>({...p,selected:false})),...buildings.map(id=>{const s=slots[id],c=calibration(id);return {layer:id==='gate'?'foreground' as const:'world' as const,id,...s,foot:s.pivot,shear:c.shear,vertical:c.vertical,depth:s.y,opacity:1,file:spriteFile(id,levels?.[id]||1),selected:id===selected};})].sort((a,b)=>({ground:0,backdrop:1,world:2,foreground:3})[a.layer]-({ground:0,backdrop:1,world:2,foreground:3})[b.layer]||a.depth-b.depth).map(p=>({...p,image:images.get(p.file)!,height:images.get(p.file)!.height*p.width/images.get(p.file)!.width}));}
 let objects=makeObjects(),signature=buildings.map(()=>1).join(',')+':forge';
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
 // Conservative transformed bounds include every sprite, its shadow and court.
 const boundsObjects=objects.map(p=>({...p,height:p.id==='forge'?Math.max(...[1,2,3].map(l=>{const image=images.get(spriteFile('forge',l))!;return image.height*p.width/image.width;})):p.height}));
 const points=boundsObjects.flatMap(p=>[-p.width/2,p.width/2].flatMap(x=>[-p.height*p.foot,p.height*(1-p.foot)].map(y=>({x:p.x+x,y:p.y+p.shear*x+p.vertical*y}))));
 const corners=[[0,0],[15,0],[15,15],[0,15]].map(([u,v])=>tilePoint(u,v));points.push(...corners);
 const left=Math.floor(Math.min(...points.map(p=>p.x))-32),top=Math.floor(Math.min(...points.map(p=>p.y))-32);
 const worldWidth=Math.ceil(Math.max(...points.map(p=>p.x))-left+32),worldHeight=Math.ceil(Math.max(...points.map(p=>p.y))-top+32);
 // Fixed quality across pan/zoom, bounded backing store and texture dimensions.
 const raster=Math.min(1.75,Math.sqrt(32*1024*1024/(4*worldWidth*worldHeight)),4096/Math.max(worldWidth,worldHeight));
 surface.width=Math.floor(worldWidth*raster);surface.height=Math.floor(worldHeight*raster);surface.style.width=worldWidth+'px';surface.style.height=worldHeight+'px';
 const sc=surface.getContext('2d')!;let dirty=true,frame=0;
 function paintWorld(){
  sc.setTransform(surface.width/worldWidth,0,0,surface.height/worldHeight,-left*surface.width/worldWidth,-top*surface.height/worldHeight);
  sc.fillStyle=snowPattern;sc.fillRect(left,top,worldWidth,worldHeight);sc.fillStyle=pavingPattern;sc.fill(paved);sc.drawImage(shadow,shadowLeft,shadowTop);
  for(const p of objects){sc.save();sc.globalAlpha=p.opacity;sc.translate(p.x,p.y);sc.transform(1,p.shear,0,p.vertical,0,0);if(p.selected){sc.shadowColor='#ffca64';sc.shadowBlur=9;}sc.drawImage(p.image,-p.width/2,-p.height*p.foot,p.width,p.height);sc.restore();}
  dirty=false;surface.dataset.paints=String(Number(surface.dataset.paints||0)+1);
 }
 function draw(){
  if(!w||!h)return;if(dirty)paintWorld();const x=w/2-cx*scale,y=h/2-cy*scale;
  surface.style.transform=`translate3d(${x+left*scale}px,${y+top*scale}px,0) scale(${scale})`;
  // Wrap a repeated GPU layer rather than repainting an infinite background.
  const sx=((x%(periodX*scale))+periodX*scale)%(periodX*scale)-periodX*scale;
  const sy=((y%(periodY*scale))+periodY*scale)%(periodY*scale)-periodY*scale;
  const sw=Math.ceil(w/scale+periodX),sh=Math.ceil(h/scale+periodY);
  if(snowLayer.style.width!==sw+'px')snowLayer.style.width=sw+'px';if(snowLayer.style.height!==sh+'px')snowLayer.style.height=sh+'px';
  snowLayer.style.transform=`translate3d(${sx}px,${sy}px,0) scale(${scale})`;
  canvas.dataset.ready='true';canvas.dataset.mode='full-screen';canvas.dataset.renderer='composited-world';
 }
 function requestDraw(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;draw();});}
 function resize(){const nw=canvas.clientWidth,nh=canvas.clientHeight,nd=Math.min(devicePixelRatio||1,1.75);if(nw===w&&nh===h&&nd===dpr)return;w=nw;h=nh;dpr=nd;
  // This canvas is the transparent input/accessibility surface, not a frame buffer.
  if(canvas.width!==1)canvas.width=1;if(canvas.height!==1)canvas.height=1;
  scale=Math.max(.65,Math.min(1.35,h/900));requestDraw();}new ResizeObserver(resize).observe(canvas);resize();
 const held=new Map<number,{x:number;y:number}>();let moved=false,down={x:0,y:0};
 canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);held.set(e.pointerId,{x:e.clientX,y:e.clientY});down={x:e.clientX,y:e.clientY};moved=false;};
 canvas.onpointermove=e=>{const prev=held.get(e.pointerId);if(!prev)return;const points=[...held.values()],before=points.length===2?Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y):0;cx-=(e.clientX-prev.x)/scale;cy-=(e.clientY-prev.y)/scale;held.set(e.pointerId,{x:e.clientX,y:e.clientY});if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)moved=true;if(before){const p=[...held.values()];scale=Math.max(.35,Math.min(2.2,scale*Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)/before));moved=true;}requestDraw();};
 const masks=new Map<string,{data:Uint8ClampedArray;width:number;height:number}>();
 function hitBuilding(id:Building,x:number,y:number){const s=slots[id],c=calibration(id),file=spriteFile(id,levels?.[id]||1),image=images.get(file)!,height=image.height*s.width/image.width,dx=x-s.x,dy=(y-s.y-c.shear*dx)/c.vertical,px=(dx+s.width/2)/s.width,py=(dy+height*s.pivot)/height;if(px<0||py<0||px>=1||py>=1)return false;let mask=masks.get(file);if(!mask){const sample=document.createElement('canvas');sample.width=192;sample.height=Math.ceil(192*image.height/image.width);const sc=sample.getContext('2d')!;sc.drawImage(image,0,0,sample.width,sample.height);mask={data:sc.getImageData(0,0,sample.width,sample.height).data,width:sample.width,height:sample.height};masks.set(file,mask);}return mask.data[(Math.floor(py*mask.height)*mask.width+Math.floor(px*mask.width))*4+3]>40;}
 canvas.onpointerup=e=>{held.delete(e.pointerId);if(moved)return;const x=cx+(e.clientX-w/2)/scale,y=cy+(e.clientY-h/2)/scale;const hit=[...buildings].sort((a,b)=>slots[b].y-slots[a].y).find(id=>hitBuilding(id,x,y));if(hit)onSelect(hit);};
 canvas.onpointercancel=()=>{held.clear();moved=true;};canvas.onwheel=e=>{e.preventDefault();const old=scale;scale=Math.max(.35,Math.min(2.2,scale*Math.exp(-e.deltaY*.001)));cx+=(e.clientX-w/2)*(1/old-1/scale);cy+=(e.clientY-h/2)*(1/old-1/scale);requestDraw();};
 return {update(state:State,id:Building){const next=buildings.map(b=>state.levels[b]).join(',')+':'+id;if(next===signature)return;signature=next;levels=state.levels;selected=id;objects=makeObjects();dirty=true;requestDraw();},focus(id:Building){cx=slots[id].x+(w>700?w*.1/scale:0);cy=slots[id].y+(w<700?100:-80);requestDraw();},fit(){scale=Math.max(.2,Math.min((w-40)/WORLD.width,(h-120)/WORLD.height));cx=WORLD.width/2;cy=385;requestDraw();}};
}
