import {environmentSprites,COURT,tilePoint} from './terrain';
import {slots,calibration,WORLD} from './scene';
import {buildings,type Building,type State} from './economy';
export async function createWorldView(canvas:HTMLCanvasElement,onSelect:(id:Building)=>void){
 const ctx=canvas.getContext('2d')!,environment=environmentSprites(),images=new Map<string,HTMLImageElement>();
 const spriteFile=(id:Building,level:number)=>id==='forge'?`/fortress-ui/forge-${level}.webp`:id==='gate'?'/modular-stronghold/v2/gateway-grand.png':`/assets/${slots[id].asset}.png`;
 const paving='/modular-stronghold/v2/paving-warm-texture.png',snow='/modular-stronghold/v2/snow-soft-texture.png';
 await Promise.all([...new Set([paving,snow,...environment.map(p=>p.file),...buildings.flatMap(b=>[1,2,3].map(l=>spriteFile(b,l)))])].map(async file=>{const image=new Image();image.src=file;await image.decode();images.set(file,image);}));
 let w=innerWidth,h=innerHeight,scale=1,cx=WORLD.width/2,cy=385,selected:Building='forge',levels:State['levels']|undefined;
 function draw(){
  const dpr=Math.min(devicePixelRatio||1,1.75);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#c5d0d5';ctx.fillRect(0,0,w,h);ctx.translate(w/2-cx*scale,h/2-cy*scale);ctx.scale(scale,scale);
  const material=(file:string,size:number)=>{const p=ctx.createPattern(images.get(file)!,'repeat')!;p.setTransform(new DOMMatrix([size,size/2,-size,size/2,COURT.x,COURT.y]));return p;};
  const left=cx-w/(2*scale),top=cy-h/(2*scale);ctx.fillStyle=material(snow,.7);ctx.fillRect(left,top,w/scale,h/scale);ctx.beginPath();[[0,0],[15,0],[15,15],[0,15]].forEach(([u,v],i)=>{const p=tilePoint(u,v);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.closePath();ctx.fillStyle=material(paving,.22);ctx.fill();ctx.save();ctx.strokeStyle='#29392d26';ctx.lineWidth=30;ctx.filter='blur(10px)';ctx.stroke();ctx.restore();
  const objects=[...environment.map(p=>({...p,selected:false})),...buildings.map(id=>{const s=slots[id],c=calibration(id);return {id,...s,foot:s.pivot,shear:c.shear,vertical:c.vertical,depth:s.y,opacity:1,file:spriteFile(id,levels?.[id]||1),selected:id===selected};})].sort((a,b)=>a.depth-b.depth);
  for(const p of objects){const image=images.get(p.file)!;const height=image.height*p.width/image.width;if(p.x+p.width<left||p.x-p.width>left+w/scale||p.y+height<top||p.y-height*2>top+h/scale)continue;ctx.save();ctx.globalAlpha=p.opacity;ctx.translate(p.x,p.y);ctx.transform(1,p.shear,0,p.vertical,0,0);if(p.selected){ctx.shadowColor='#ffca64';ctx.shadowBlur=9;}ctx.drawImage(image,-p.width/2,-height*p.foot,p.width,height);ctx.restore();}
  canvas.dataset.ready='true';canvas.dataset.mode='full-screen';
 }
 function resize(){w=canvas.clientWidth;h=canvas.clientHeight;scale=Math.max(.65,Math.min(1.35,h/900));draw();}new ResizeObserver(resize).observe(canvas);resize();
 const held=new Map<number,{x:number;y:number}>();let moved=false,down={x:0,y:0};
 canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);held.set(e.pointerId,{x:e.clientX,y:e.clientY});down={x:e.clientX,y:e.clientY};moved=false;};
 canvas.onpointermove=e=>{const prev=held.get(e.pointerId);if(!prev)return;const points=[...held.values()],before=points.length===2?Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y):0;cx-=(e.clientX-prev.x)/scale;cy-=(e.clientY-prev.y)/scale;held.set(e.pointerId,{x:e.clientX,y:e.clientY});if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)moved=true;if(before){const p=[...held.values()];scale=Math.max(.35,Math.min(2.2,scale*Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)/before));moved=true;}draw();};
 const masks=new Map<string,{data:Uint8ClampedArray;width:number;height:number}>();
 function hitBuilding(id:Building,x:number,y:number){const s=slots[id],c=calibration(id),file=spriteFile(id,levels?.[id]||1),image=images.get(file)!,height=image.height*s.width/image.width,dx=x-s.x,dy=(y-s.y-c.shear*dx)/c.vertical,px=(dx+s.width/2)/s.width,py=(dy+height*s.pivot)/height;if(px<0||py<0||px>=1||py>=1)return false;let mask=masks.get(file);if(!mask){const sample=document.createElement('canvas');sample.width=192;sample.height=Math.ceil(192*image.height/image.width);const sc=sample.getContext('2d')!;sc.drawImage(image,0,0,sample.width,sample.height);mask={data:sc.getImageData(0,0,sample.width,sample.height).data,width:sample.width,height:sample.height};masks.set(file,mask);}return mask.data[(Math.floor(py*mask.height)*mask.width+Math.floor(px*mask.width))*4+3]>40;}
 canvas.onpointerup=e=>{held.delete(e.pointerId);if(moved)return;const x=cx+(e.clientX-w/2)/scale,y=cy+(e.clientY-h/2)/scale;const hit=[...buildings].sort((a,b)=>slots[b].y-slots[a].y).find(id=>hitBuilding(id,x,y));if(hit)onSelect(hit);};
 canvas.onpointercancel=()=>{held.clear();moved=true;};canvas.onwheel=e=>{e.preventDefault();const old=scale;scale=Math.max(.35,Math.min(2.2,scale*Math.exp(-e.deltaY*.001)));cx+=(e.clientX-w/2)*(1/old-1/scale);cy+=(e.clientY-h/2)*(1/old-1/scale);draw();};
 return {update(state:State,id:Building){levels=state.levels;selected=id;draw();},focus(id:Building){cx=slots[id].x+(w>700?w*.1/scale:0);cy=slots[id].y+(w<700?100:-80);draw();},fit(){scale=Math.max(.2,Math.min((w-40)/WORLD.width,(h-120)/WORLD.height));cx=WORLD.width/2;cy=385;draw();}};
}
