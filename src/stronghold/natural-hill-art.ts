import {tilePoint} from './terrain';
import {featureHeight,PX_PER_METER,type ReliefFeature} from '../world/relief';
// One cached mesh-like canvas per hill. The outer ring is the collision ring; the ramp is part of the same
// surface and outer wall, with no internal cliff or sprite overlap at the crest. Vertical texture columns stay vertical.
export function naturalHillArt(f:ReliefFeature,snow:HTMLImageElement,rock:HTMLImageElement){
 const ring=f.outline!.map(([u,v])=>{const g=tilePoint(u,v),h=featureHeight(f,u,v)*PX_PER_METER;return {u,v,g,h,t:{x:g.x,y:g.y-h}};});
 const pad=24,left=Math.floor(Math.min(...ring.map(p=>p.g.x)))-pad,right=Math.ceil(Math.max(...ring.map(p=>p.g.x)))+pad;
 const top=Math.floor(Math.min(...ring.map(p=>p.t.y)))-pad,bottom=Math.ceil(Math.max(...ring.map(p=>p.g.y)))+pad;
 const canvas=document.createElement('canvas');canvas.width=(right-left)*2;canvas.height=(bottom-top)*2;
 (canvas as unknown as {src:string}).src='relief:'+f.id;
 const c=canvas.getContext('2d')!;c.scale(2,2);c.translate(-left,-top);
 const path=new Path2D();ring.forEach((p,i)=>i?path.lineTo(p.t.x,p.t.y):path.moveTo(p.t.x,p.t.y));path.closePath();
 // The footprint includes the slope, so snow grain and wear continue across the crest without a seam.
 c.save();c.clip(path);const pattern=c.createPattern(snow,'repeat')!,s=.7*1024/snow.width,o=tilePoint(0,0);
 pattern.setTransform(new DOMMatrix([s,s/2,-s,s/2,o.x,o.y-f.topM!*PX_PER_METER]));c.fillStyle=pattern;c.fillRect(left,top,right-left,bottom-top);
 c.fillStyle='rgba(236,241,248,.28)';c.fillRect(left,top,right-left,bottom-top);
 // Fine granular wear spreads from the flared ramp onto the plateau; no painted ribbon or circular kerbs.
 let seed=[...f.id].reduce((n,c)=>Math.imul(n,31)+c.charCodeAt(0)|0,71513);const random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
 for(let i=0;i<4400;i++){
  const span=f.u1-f.u0,depth=f.v1-f.v0,crest=f.rampStartV!,u=f.u0+random()*span,v=f.v0+random()*depth,center=f.u0+span*.51+.18*Math.sin(v-f.v0),width=v>crest-1?span*.21:span*.12+(crest-1-v)*.12;
  if(Math.abs(u-center)>width||random()>Math.min(1,(v-f.v0)*.24))continue;
  const p=tilePoint(u,v),y=p.y-featureHeight(f,u,v)*PX_PER_METER;
  c.fillStyle=random()<.5?'rgba(104,96,81,.22)':'rgba(155,148,130,.27)';c.beginPath();c.ellipse(p.x,y,.7+random()*3,.4+random()*1.2,-.45,0,Math.PI*2);c.fill();
 }
 // Embedded granite flecks and compressed snow bring the summit material toward the rock perimeter.
 for(let i=0;i<130;i++){
  const span=f.u1-f.u0,u=f.u0+span*(.06+random()*.86),v=f.v0+.4+random()*(f.rampStartV!-f.v0-.8);
  if(u>f.u0+span*.22&&u<f.u1-span*.22&&v>f.v0+1&&v<f.rampStartV!-.9)continue;
  const p=tilePoint(u,v),y=p.y-featureHeight(f,u,v)*PX_PER_METER;c.fillStyle='rgba(91,105,121,.27)';
  c.beginPath();c.moveTo(p.x-3,y);c.lineTo(p.x-1,y-2-random()*3);c.lineTo(p.x+3+random()*4,y-1);c.lineTo(p.x+4,y+2);c.closePath();c.fill();
 }
 c.restore();
 // Face texture spans connected wall panels. Every junction shares its exact top and foot vertices.
 let offset=0;
 for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length],dx=b.g.x-a.g.x,dy=b.g.y-a.g.y;
  const len=Math.abs(dx),H=Math.max(a.h,b.h);if(dx>=0||len<.1||H<.5)continue;
  const x=b.g.x,y=b.g.y,k=dy/dx;
  c.save();c.beginPath();c.moveTo(a.g.x,a.g.y+3);c.lineTo(b.g.x,b.g.y+3);c.lineTo(b.t.x,b.t.y-5);c.lineTo(a.t.x,a.t.y-5);c.closePath();c.clip();
  c.beginPath();c.moveTo(a.g.x,a.g.y+2);c.lineTo(b.g.x,b.g.y+2);c.lineTo(b.t.x,b.t.y+1);c.lineTo(a.t.x,a.t.y+1);c.closePath();
  c.fillStyle=dy>0?'#8995a8':'#a7b1bd';c.fill();
  c.transform(1,k,0,1,x,y);
  // Generated strip has a narrow alpha fringe; crop within its connected rock and snow bank, preserving scale.
  const sw=rock.naturalWidth,sh=rock.naturalHeight,scale=.19;
  for(let at=-offset% (sw*scale);at<len;at+=sw*scale)c.drawImage(rock,0,sh*.045,sw,sh*.85,at,-H-6,sw*scale,H+14);
  c.globalCompositeOperation='source-atop';c.fillStyle=dy>0?'rgba(34,48,73,.18)':'rgba(252,235,213,.04)';c.fillRect(0,-H,len,H+4);
  c.restore();offset+=len;
  // A soft contact at the foot and uneven snow apron blend the cliff into the ground texture.
  c.save();c.lineCap='round';c.strokeStyle='rgba(45,56,76,.13)';c.lineWidth=7;c.filter='blur(3px)';c.beginPath();c.moveTo(a.g.x,a.g.y);c.lineTo(b.g.x,b.g.y);c.stroke();c.restore();
  // Irregular wind-packed snow overhangs and banks, distributed as connected ribbons rather than stones.
  for(const foot of [false,true]){
   const start=foot?a.g:a.t,end=foot?b.g:b.t,steps=Math.max(4,Math.ceil(len/11));
   c.save();c.beginPath();c.moveTo(start.x,start.y-2);
   for(let j=1;j<=steps;j++){const t=j/steps;c.lineTo(start.x+(end.x-start.x)*t,start.y+(end.y-start.y)*t-2-(foot?random()*2:random()*3));}
   for(let j=steps;j>=0;j--){const t=j/steps;c.lineTo(start.x+(end.x-start.x)*t,start.y+(end.y-start.y)*t+(foot?3+random()*8:1+random()*6));}
   c.closePath();const g=c.createLinearGradient(0,start.y-5,0,start.y+12);g.addColorStop(0,'#e1e9f4');g.addColorStop(1,'rgba(183,201,225,.05)');c.fillStyle=g;c.fill();c.restore();
  }
 }
 return {feature:f,canvas,left,top,width:right-left,height:bottom-top,bottom};
}
