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
 const snowPattern=material(snow,.7),pavingPattern=material(paving,.22),court=new Path2D();
 [[0,0],[15,0],[15,15],[0,15]].forEach(([u,v],i)=>{const p=tilePoint(u,v);i?court.lineTo(p.x,p.y):court.moveTo(p.x,p.y);});court.closePath();
 // Bake the soft ground shadow once. It must never run a blur filter while panning.
 const shadow=document.createElement('canvas'),shadowLeft=COURT.x-15*64-64,shadowTop=COURT.y-64;
 shadow.width=2048;shadow.height=1088;const shadowCtx=shadow.getContext('2d')!;shadowCtx.translate(-shadowLeft,-shadowTop);shadowCtx.strokeStyle='#29392d26';shadowCtx.lineWidth=30;shadowCtx.filter='blur(10px)';shadowCtx.stroke(court);
 function makeObjects(){return [...environment.map(p=>({...p,selected:false})),...buildings.map(id=>{const s=slots[id],c=calibration(id);return {id,...s,foot:s.pivot,shear:c.shear,vertical:c.vertical,depth:s.y,opacity:1,file:spriteFile(id,levels?.[id]||1),selected:id===selected};})].sort((a,b)=>a.depth-b.depth).map(p=>({...p,image:images.get(p.file)!,height:images.get(p.file)!.height*p.width/images.get(p.file)!.width}));}
 let objects=makeObjects(),signature=buildings.map(()=>1).join(',')+':forge';
 const TILE=256,PAD=32,BUDGET=32*1024*1024;
 type CachedTile={canvas:HTMLCanvasElement;bytes:number};const tiles=new Map<string,CachedTile>();let cacheBytes=0,frame=0,idle=0;
 const rasterScale=()=>Math.max(.25,Math.min(4,Math.ceil(dpr*scale*4)/4));
 const tileKey=(x:number,y:number,r:number)=>`${r}:${x}:${y}`;
 function paintTile(x:number,y:number,r:number){const key=tileKey(x,y,r),found=tiles.get(key);if(found){tiles.delete(key);tiles.set(key,found);return found.canvas;}
  const tile=document.createElement('canvas'),size=TILE+PAD*2,left=x*TILE-PAD,top=y*TILE-PAD;tile.width=tile.height=size*r;const tc=tile.getContext('2d')!;tc.setTransform(r,0,0,r,-left*r,-top*r);tc.fillStyle=snowPattern;tc.fillRect(left,top,size,size);tc.fillStyle=pavingPattern;tc.fill(court);tc.drawImage(shadow,shadowLeft,shadowTop);
  for(const p of objects){if(p.x+p.width<left||p.x-p.width>left+size||p.y+p.height<top||p.y-p.height*2>top+size)continue;tc.save();tc.globalAlpha=p.opacity;tc.translate(p.x,p.y);tc.transform(1,p.shear,0,p.vertical,0,0);if(p.selected){tc.shadowColor='#ffca64';tc.shadowBlur=9;}tc.drawImage(p.image,-p.width/2,-p.height*p.foot,p.width,p.height);tc.restore();}
  const bytes=tile.width*tile.height*4;tiles.set(key,{canvas:tile,bytes});cacheBytes+=bytes;return tile;
 }
 function clearTiles(){for(const t of tiles.values())t.canvas.width=t.canvas.height=1;tiles.clear();cacheBytes=0;}
 function trim(keep:Set<string>){for(const [key,t] of tiles){if(cacheBytes<=BUDGET)break;if(keep.has(key))continue;tiles.delete(key);cacheBytes-=t.bytes;t.canvas.width=t.canvas.height=1;}}
 function bounds(){return {minX:Math.floor((cx-w/(2*scale))/TILE),maxX:Math.floor((cx+w/(2*scale))/TILE),minY:Math.floor((cy-h/(2*scale))/TILE),maxY:Math.floor((cy+h/(2*scale))/TILE)};}
 function prefetch(){idle=0;const b=bounds(),r=rasterScale(),keep=new Set<string>();for(let y=b.minY;y<=b.maxY;y++)for(let x=b.minX;x<=b.maxX;x++)keep.add(tileKey(x,y,r));
  // Warm one neighboring tile per idle turn, with the same bounded cache budget.
  for(let y=b.minY-1;y<=b.maxY+1;y++)for(let x=b.minX-1;x<=b.maxX+1;x++){if(tiles.has(tileKey(x,y,r)))continue;paintTile(x,y,r);keep.add(tileKey(x,y,r));trim(keep);return;}
 }
 function draw(){
  if(!w||!h)return;const r=rasterScale(),b=bounds(),keep=new Set<string>();ctx.setTransform(dpr*scale,0,0,dpr*scale,(w/2-cx*scale)*dpr,(h/2-cy*scale)*dpr);
  for(let y=b.minY;y<=b.maxY;y++)for(let x=b.minX;x<=b.maxX;x++){const tile=paintTile(x,y,r);keep.add(tileKey(x,y,r));ctx.drawImage(tile,x*TILE-PAD,y*TILE-PAD,TILE+PAD*2,TILE+PAD*2);}
  trim(keep);if(canvas.dataset.ready!=='true'){canvas.dataset.ready='true';canvas.dataset.mode='full-screen';canvas.dataset.renderer='cached-world-tiles';}
  if(!idle&&'requestIdleCallback' in window)idle=window.requestIdleCallback(prefetch,{timeout:250});
 }
 function requestDraw(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;draw();});}
 function resize(){const nw=canvas.clientWidth,nh=canvas.clientHeight,nd=Math.min(devicePixelRatio||1,1.75);if(nw===w&&nh===h&&nd===dpr)return;w=nw;h=nh;dpr=nd;const width=Math.round(w*dpr),height=Math.round(h*dpr);if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;scale=Math.max(.65,Math.min(1.35,h/900));requestDraw();}new ResizeObserver(resize).observe(canvas);resize();
 const held=new Map<number,{x:number;y:number}>();let moved=false,down={x:0,y:0};
 canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);held.set(e.pointerId,{x:e.clientX,y:e.clientY});down={x:e.clientX,y:e.clientY};moved=false;};
 canvas.onpointermove=e=>{const prev=held.get(e.pointerId);if(!prev)return;const points=[...held.values()],before=points.length===2?Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y):0;cx-=(e.clientX-prev.x)/scale;cy-=(e.clientY-prev.y)/scale;held.set(e.pointerId,{x:e.clientX,y:e.clientY});if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)moved=true;if(before){const p=[...held.values()];scale=Math.max(.35,Math.min(2.2,scale*Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)/before));moved=true;}requestDraw();};
 const masks=new Map<string,{data:Uint8ClampedArray;width:number;height:number}>();
 function hitBuilding(id:Building,x:number,y:number){const s=slots[id],c=calibration(id),file=spriteFile(id,levels?.[id]||1),image=images.get(file)!,height=image.height*s.width/image.width,dx=x-s.x,dy=(y-s.y-c.shear*dx)/c.vertical,px=(dx+s.width/2)/s.width,py=(dy+height*s.pivot)/height;if(px<0||py<0||px>=1||py>=1)return false;let mask=masks.get(file);if(!mask){const sample=document.createElement('canvas');sample.width=192;sample.height=Math.ceil(192*image.height/image.width);const sc=sample.getContext('2d')!;sc.drawImage(image,0,0,sample.width,sample.height);mask={data:sc.getImageData(0,0,sample.width,sample.height).data,width:sample.width,height:sample.height};masks.set(file,mask);}return mask.data[(Math.floor(py*mask.height)*mask.width+Math.floor(px*mask.width))*4+3]>40;}
 canvas.onpointerup=e=>{held.delete(e.pointerId);if(moved)return;const x=cx+(e.clientX-w/2)/scale,y=cy+(e.clientY-h/2)/scale;const hit=[...buildings].sort((a,b)=>slots[b].y-slots[a].y).find(id=>hitBuilding(id,x,y));if(hit)onSelect(hit);};
 canvas.onpointercancel=()=>{held.clear();moved=true;};canvas.onwheel=e=>{e.preventDefault();const old=scale;scale=Math.max(.35,Math.min(2.2,scale*Math.exp(-e.deltaY*.001)));cx+=(e.clientX-w/2)*(1/old-1/scale);cy+=(e.clientY-h/2)*(1/old-1/scale);requestDraw();};
 return {update(state:State,id:Building){const next=buildings.map(b=>state.levels[b]).join(',')+':'+id;if(next===signature)return;signature=next;levels=state.levels;selected=id;objects=makeObjects();clearTiles();requestDraw();},focus(id:Building){cx=slots[id].x+(w>700?w*.1/scale:0);cy=slots[id].y+(w<700?100:-80);requestDraw();},fit(){scale=Math.max(.2,Math.min((w-40)/WORLD.width,(h-120)/WORLD.height));cx=WORLD.width/2;cy=385;requestDraw();}};
}
