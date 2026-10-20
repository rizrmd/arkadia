import {project,unproject} from '../isometric';
export const COURT={x:577,y:-160,size:15};
export function tilePoint(u:number,v:number){const p=project(u,v);return {x:p.x+COURT.x,y:p.y+COURT.y};}
const assetRoot='/modular-stronghold/',v2=assetRoot+'v2/';
function prop(id:string,u:number,v:number,width:number,extra='',legacy=false){const p=tilePoint(u,v);return `<img class="terrain-prop ${id}" src="${(legacy?assetRoot:v2)+id}.png" alt="" draggable="false" style="left:${p.x}px;top:${p.y}px;width:${width}px;z-index:${Math.round(p.y)};${extra}">`;}
export function modularEnclosure(){
 const parts:string[]=[];
 for(let n=0;n<15;n+=5){
  parts.push(prop('rampart-se',n+2.5,0,356,'--foot:73%;--wall-shear:.03;'));
  parts.push(prop('rampart-ne',0,n+2.5,356,'--foot:74%;--wall-shear:-.13;'));
  // Foreground wings end before the freestanding gateway at the front corner.
  parts.push(prop('rampart-se',n+2.5,15.5,356,'--foot:73%;--wall-shear:.03;'));
  parts.push(prop('rampart-ne',15.5,n+2.5,356,'--foot:74%;--wall-shear:-.13;'));
 }
 for(const [u,v] of [[0,0],[15,0],[0,15]])parts.push(prop('bastion',u,v,180));
 // Irregular masses and two distinct tree silhouettes replace the evenly spaced
 // miniature pine/rock arrangement. All remain individual reusable sprites.
 for(const [i,[u,v]] of [[-1,3],[-1,5],[-1,9],[2,-1],[5,-1],[9,-1],[13,-1],[16,4],[16,7],[16,10],[16,13],[4,16],[7,16],[10,16],[13,16]].entries())parts.push(prop(i%3?'spruce-mature':'fir-young',u,v,135+(i%4)*19));
 for(const [u,v] of [[-1.8,4],[4,-1.8],[11,-1.8],[16.8,7],[7,16.8]])parts.push(prop('cliff-snow',u,v,320));
 for(const [u,v] of [[-1,11],[11,-1],[16,11],[11,16]])parts.push(prop('boulders-snow',u,v,185));
 for(const [i,[u,v]] of [[1,4],[1,8],[1,12],[4,1],[8,1],[12,1],[14,5],[14,9],[5,14],[9,14],[12,13]].entries())parts.push(prop(i%3?'weeds-edge':'paving-worn',u,v,i%3?125:195,'z-index:1;'));
 for(const [u,v] of [[-.3,4],[-.3,10],[4,-.3],[10,-.3],[15.3,6],[15.3,12],[6,15.3],[12,15.3]])parts.push(prop('snowdrift-edge',u,v,200,'z-index:1;'));
 for(const [u,v] of [[7,11],[12,8],[10,13],[9,7]])parts.push(prop('paving-worn',u,v,160,'z-index:1;opacity:.7;'));
 parts.push(prop('supply-cart',4.5,10,82),prop('brazier',13.2,5,32),prop('brazier',14,13.7,32),prop('brazier',13.7,14,32),prop('wall-broken',1.5,14.7,170));
 parts.push(prop('crate',5.3,10.6,34,'',true),prop('barrel',5.1,11.1,27,'',true));
 return parts.join('');
}
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
  const corners=[[0,0],[15,0],[15,15],[0,15]].map(([u,v])=>tilePoint(u,v));ctx.beginPath();corners.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=surface(paving,.22);ctx.fill();
  // A restrained wall-foot contact shadow grounds the assembled structures.
  ctx.save();ctx.strokeStyle='#31352c30';ctx.lineWidth=30;ctx.filter='blur(12px)';ctx.stroke();ctx.restore();
  const light=ctx.createRadialGradient(560,200,100,560,200,1000);light.addColorStop(0,'#fff5db10');light.addColorStop(1,'#17212d20');ctx.fillStyle=light;ctx.fillRect(-ox/scale,-oy/scale,w/scale,h/scale);
  const a=unproject(w/scale,h/scale);canvas.dataset.tiles=String(Math.ceil((Math.abs(a.x)+20)*(Math.abs(a.y)+20)));canvas.dataset.ready='true';canvas.dataset.revision='2';
 }
 Promise.all([paving.decode(),snow.decode()]).then(()=>{ready=true;draw();}).catch(()=>{canvas.dataset.error='Terrain assets failed to load';});new ResizeObserver(draw).observe(scene);draw();return draw;
}
