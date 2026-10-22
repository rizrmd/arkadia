import {project,unproject} from '../isometric';
export const COURT={x:577,y:-160,size:15};
// ?buildings=all shows every building and court prop in its original slot, whatever the save has built (layout QA).
export const LEGACY_LAYOUT=typeof location!=='undefined'&&new URLSearchParams(location.search).get('buildings')==='all';
export function tilePoint(u:number,v:number){const p=project(u,v);return {x:p.x+COURT.x,y:p.y+COURT.y};}
const assetRoot='/modular-stronghold/',v2=assetRoot+'v2/';
export type EnvironmentSprite={layer:'ground'|'backdrop'|'world'|'foreground';id:string;x:number;y:number;width:number;foot:number;shear:number;vertical:number;depth:number;opacity:number;file:string};
function prop(id:string,u:number,v:number,width:number,extra='',legacy=false):EnvironmentSprite{const p=tilePoint(u,v),value=(key:string,fallback:number)=>Number(extra.match(new RegExp(key+':([\\d.%-]+)'))?.[1].replace('%',''))||fallback;return {layer:['snowdrift-edge','weeds-edge','paving-worn'].includes(id)?'ground':u<0||v<0||u===0||v===0?'backdrop':u>=15||v>=15?'foreground':'world',id,...p,width,foot:value('--foot',97)/100,shear:value('--wall-shear',0),vertical:value('--wall-height',1),depth:value('z-index',Math.round(p.y)),opacity:value('opacity',1),file:(legacy?assetRoot:v2)+id+'.png'};}
export function environmentSprites(){
 const parts:EnvironmentSprite[]=[];
 for(let n=0;n<15;n+=5){
  parts.push(prop('rampart-se',n+2.5,0,356,'--foot:73%;--wall-shear:.03;'));
  parts.push(prop('rampart-ne',0,n+2.5,356,'--foot:74%;--wall-shear:-.13;'));
  // Keep the terminal wings at the same masonry scale as the rest of the wall.
  // Seat the terminal wings 16 px into and 8 px behind the gate towers.
  // Hide their end caps and stepped footings without extending into the passage.
  const left=prop('rampart-se',n+(n===10?1.8:2.5),15.5,356,'--foot:73%;--wall-shear:.03;');
  if(n===10){left.x+=16;left.y-=8;}parts.push(left);
  const right=prop('rampart-ne',15.5,n+(n===10?1.8:2.5),356,'--foot:74%;--wall-shear:-.13;');
  if(n===10){right.x-=16;right.y-=8;}parts.push(right);
 }
 // Coping piers bridge the side faces of the gateway towers to the wall wings.
 for(const [x,side] of [[469,'left'],[685,'right']] as const)parts.push({layer:'foreground',id:'gate-connector',x,y:774,width:104,foot:1,shear:0,vertical:1,depth:769,opacity:1,file:v2+'gate-connector-'+side+'-v3.png'});
 for(const [u,v] of [[0,0],[15,0],[0,15]])parts.push(prop('bastion',u,v,180));
 // Irregular masses and two distinct tree silhouettes replace the evenly spaced
 // miniature pine/rock arrangement. All remain individual reusable sprites.
 // Perimeter scenery keeps a snow gap from the enclosure: behind the rear walls
 // its base clears the battlements, in front of the front walls its crown stays
 // below the wall foot. verify-wall-clearance.mjs checks this per pixel.
 const rear=(along:number,out:number,side:'u'|'v')=>side==='u'?[along,-out]:[-out,along],front=(along:number,out:number,side:'u'|'v')=>side==='u'?[along,15+out]:[15+out,along];
 const trees=[...[3,5,9].map(n=>rear(n,3,'v')),...[2,5,9,13].map(n=>rear(n,3,'u')),...[4,7,10,13].map(n=>front(n,5,'v')),...[4,7,10,13].map(n=>front(n,5,'u'))];
 for(const [i,[u,v]] of trees.entries())parts.push(prop(i%3?'spruce-mature':'fir-young',u,v,135+(i%4)*19));
 for(const [u,v] of [rear(4,3.8,'v'),rear(4,3.8,'u'),rear(11,3.8,'u'),front(7,4.5,'v'),front(7,4.5,'u')])parts.push(prop('cliff-snow',u,v,320));
 for(const [u,v] of [rear(11,3,'v'),rear(11,3,'u'),front(11,3,'v'),front(11,3,'u')])parts.push(prop('boulders-snow',u,v,185));
 for(const [i,[u,v]] of [[1,4],[1,8],[1,12],[4,1],[8,1],[12,1],[14,5],[14,9],[5,14],[9,14],[12,13]].entries())parts.push(prop(i%3?'weeds-edge':'paving-worn',u,v,i%3?125:195,'z-index:1;'));
  // Drifts lie in open snow behind the rear walls and against the outer foot of the
 // front walls, never under a wall line where they could show inside the court.
 for(const [u,v] of [rear(7,3.5,'v'),rear(7,3.5,'u'),[16.2,6],[16.2,12],[6,16.2],[12,16.2]])parts.push(prop('snowdrift-edge',u,v,200,'z-index:1;'));
 for(const [u,v] of [[7,11],[12,8],[10,13],[9,7]])parts.push(prop('paving-worn',u,v,160,'z-index:1;opacity:.7;'));
 // No braziers at the front corner: the gateway covers them completely, so they only stood in its passage
 // as invisible obstacles.
 parts.push(prop('wall-broken',1.5,14.7,170));
 // The camp starts with the tent alone in the court; the supply cart, crate, barrel and brazier come with the old layout.
 if(LEGACY_LAYOUT)parts.push(prop('supply-cart',4.5,10,82),prop('brazier',13.2,5,32),prop('crate',5.3,10.6,34,'',true),prop('barrel',5.1,11.1,27,'',true));
 return parts;
}
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
  const corners=[[0,0],[15,0],[15,15],[0,15]].map(([u,v])=>tilePoint(u,v));ctx.beginPath();corners.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=surface(paving,.22);ctx.fill();
  // A restrained wall-foot contact shadow grounds the assembled structures.
  ctx.save();ctx.strokeStyle='#31352c30';ctx.lineWidth=30;ctx.filter='blur(12px)';ctx.stroke();ctx.restore();
  const light=ctx.createRadialGradient(560,200,100,560,200,1000);light.addColorStop(0,'#fff5db10');light.addColorStop(1,'#17212d20');ctx.fillStyle=light;ctx.fillRect(-ox/scale,-oy/scale,w/scale,h/scale);
  const a=unproject(w/scale,h/scale);canvas.dataset.tiles=String(Math.ceil((Math.abs(a.x)+20)*(Math.abs(a.y)+20)));canvas.dataset.ready='true';canvas.dataset.revision='2';
 }
 Promise.all([paving.decode(),snow.decode()]).then(()=>{ready=true;draw();}).catch(()=>{canvas.dataset.error='Terrain assets failed to load';});new ResizeObserver(draw).observe(scene);draw();return draw;
}
