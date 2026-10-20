import {project,unproject} from '../isometric';
export const COURT={x:577,y:70,size:10};
export function tilePoint(u:number,v:number){const p=project(u,v);return {x:p.x+COURT.x,y:p.y+COURT.y};}
const assetRoot='/modular-stronghold/';
function prop(id:string,u:number,v:number,width:number,extra=''){
 const p=tilePoint(u,v);return `<img class="terrain-prop ${id}" src="${assetRoot+id}.png" alt="" draggable="false" style="left:${p.x}px;top:${p.y}px;width:${width}px;z-index:${Math.round(p.y)};${extra}">`;
}
export function modularEnclosure(){
 const parts:string[]=[];
 // Each straight piece spans four grid units; towers hide the butt joins.
 for(let n=0;n<10;n+=2){
  parts.push(prop('wall-se',n+1,0,148,'--foot:70%;--wall-shear:.13;--wall-height:.72;'));
  parts.push(prop('wall-ne',0,n+1,145,'--foot:70%;--wall-shear:-.24;'));
  parts.push(prop('wall-se',n+1,10,148,'--foot:70%;--wall-shear:.13;--wall-height:.72;'));
  if(n!==6&&n!==8)parts.push(prop('wall-ne',10,n+1,145,'--foot:70%;--wall-shear:-.24;'));
 }
 for(const [u,v] of [[0,0],[10,0],[0,10]])parts.push(prop('tower',u,v,106));
 for(const [u,v] of [[-2,1],[-2,5],[-2,9],[1,-2],[5,-2],[9,-2],[12,2],[12,5],[2,12],[5,12]])parts.push(prop('pine',u,v,90));
 for(const [u,v] of [[-2,3],[3,-2],[11,3],[3,11]])parts.push(prop('rocks',u,v,145));
 for(const [u,v] of [[1,4],[4,1],[9,4],[3,9],[9,9]])parts.push(prop('moss',u,v,90));
 parts.push(prop('crate',2,5,34),prop('barrel',2.4,5.4,27),prop('crate',8.3,5.5,32),prop('banner',5,0,28,'margin-top:-65px;'),prop('torch',6,0,16,'margin-top:-45px;'));
 return parts.join('');
}
// Only visible tiles are generated. The grid has no finite background extent.
export function installTerrain(scene:HTMLElement,world:{width:number;height:number}){
 const canvas=document.createElement('canvas');canvas.className='terrain-canvas';canvas.setAttribute('aria-hidden','true');scene.prepend(canvas);
 const ctx=canvas.getContext('2d')!;let ready=false;
 const paving=new Image(),snow=new Image();paving.src=assetRoot+'paving.png';snow.src=assetRoot+'snow.png';
 function draw(){
  const w=scene.clientWidth,h=scene.clientHeight;if(!w||!h)return;
  const scale=Math.min(w/world.width,h/world.height),ox=(w-world.width*scale)/2,oy=(h-world.height*scale)/2,dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#798077';ctx.fillRect(0,0,w,h);if(!ready)return;
  const corners=[[0,0],[w,0],[w,h],[0,h]].map(([x,y])=>unproject((x-ox)/scale-COURT.x,(y-oy)/scale-COURT.y));
  const minU=Math.floor(Math.min(...corners.map(p=>p.x)))-2,maxU=Math.ceil(Math.max(...corners.map(p=>p.x)))+2,minV=Math.floor(Math.min(...corners.map(p=>p.y)))-2,maxV=Math.ceil(Math.max(...corners.map(p=>p.y)))+2;
  ctx.translate(ox,oy);ctx.scale(scale,scale);let tiles=0;
  for(let u=minU;u<=maxU;u++)for(let v=minV;v<=maxV;v++){
   const p=tilePoint(u+.5,v+.5);const inside=u>=0&&v>=0&&u<COURT.size&&v<COURT.size;
   ctx.drawImage(inside?paving:snow,p.x-64.6,p.y-32.3,129.2,64.6);tiles++;
  }
  canvas.dataset.tiles=String(tiles);canvas.dataset.ready='true';
 }
 Promise.all([paving.decode(),snow.decode()]).then(()=>{ready=true;draw();}).catch(()=>{canvas.dataset.error='Terrain assets failed to load';});
 new ResizeObserver(draw).observe(scene);draw();
 return draw;
}
