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
 let c=canvas.getContext('2d',{willReadFrequently:true})!;c.scale(2,2);c.translate(-left,-top);
 const path=new Path2D();ring.forEach((p,i)=>i?path.lineTo(p.t.x,p.t.y):path.moveTo(p.t.x,p.t.y));path.closePath();
 // Plateau and ramp use the same ground texture coordinates, projected at their actual height.
 // The ramp matrix stretches only its downhill axis; at the zero-height mouth it matches the ground exactly.
 c.save();c.clip(path);const s=.7*1024/snow.width,o=tilePoint(0,0),crest=f.rampStartV!,drop=f.topM!*PX_PER_METER,k=drop/(f.v1-crest);
 c.fillStyle='#ccd8e8';c.fillRect(left,top,right-left,bottom-top);
 const zone=(upper:boolean)=>{
  const pts=f.outline!,out:[number,number][]=[];
  for(let i=0;i<pts.length;i++){
   const a=pts[i],b=pts[(i+1)%pts.length],ia=upper?a[1]<=crest:a[1]>=crest,ib=upper?b[1]<=crest:b[1]>=crest;
   if(ia)out.push(a);if(ia!==ib){const t=(crest-a[1])/(b[1]-a[1]);out.push([a[0]+(b[0]-a[0])*t,crest]);}
  }
  const p=new Path2D();out.forEach(([u,v],i)=>{const g=tilePoint(u,v),y=g.y-featureHeight(f,u,v)*PX_PER_METER;i?p.lineTo(g.x,y):p.moveTo(g.x,y);});p.closePath();return p;
 };
 for(const upper of [true,false]){
  const pattern=c.createPattern(snow,'repeat')!;pattern.setTransform(upper?new DOMMatrix([s,s/2,-s,s/2,o.x,o.y-drop]):new DOMMatrix([s,s/2,-s,s/2+k*s/64,o.x,o.y-k*f.v1]));
  c.save();c.clip(zone(upper));c.fillStyle=pattern;c.fillRect(left,top,right-left,bottom-top);
  if(upper)c.fillStyle='rgba(236,241,248,.28)';else{
   const u=(f.u0+f.u1)/2,a=tilePoint(u,crest),b=tilePoint(u,f.v1),distance=(-(b.x-a.x)+2*(b.y-a.y+drop))/5,fade=c.createLinearGradient(a.x,a.y-drop,a.x-distance,a.y-drop+distance*2);
   fade.addColorStop(0,'rgba(236,241,248,.28)');fade.addColorStop(1,'rgba(236,241,248,0)');c.fillStyle=fade;
  }
  c.fillRect(left,top,right-left,bottom-top);c.restore();
 }
 // Fine granular wear spreads from the flared ramp onto the plateau; no painted ribbon or circular kerbs.
 let seed=[...f.id].reduce((n,c)=>Math.imul(n,31)+c.charCodeAt(0)|0,71513);const random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
 for(let i=0;i<4400;i++){
  const span=f.u1-f.u0,depth=f.v1-f.v0,crest=f.rampStartV!,u=f.u0+random()*span,v=f.v0+random()*depth,center=f.u0+span*.51+.18*Math.sin(v-f.v0),width=v>crest-1?span*.21:span*.12+(crest-1-v)*.12;
  if(Math.abs(u-center)>width||random()>Math.min(1,(v-f.v0)*.24))continue;
  const p=tilePoint(u,v),y=p.y-featureHeight(f,u,v)*PX_PER_METER;
  c.fillStyle=random()<.5?'rgba(104,96,81,.22)':'rgba(155,148,130,.27)';c.beginPath();c.ellipse(p.x,y,.7+random()*3,.4+random()*1.2,-.45,0,Math.PI*2);c.fill();
 }
 c.restore();
 // Feather the last snow bank into the existing ground. This removes the antialiased sprite boundary
 // without adding a second decal or changing the zero-height collision mouth.
 const uMid=(f.u0+f.u1)/2,bank=tilePoint(uMid,f.v1-.4),mouth=tilePoint(uMid,f.v1),bankLift=featureHeight(f,uMid,f.v1-.4)*PX_PER_METER;
 const bankDistance=(-(mouth.x-bank.x)+2*(mouth.y-bank.y+bankLift))/5;
 const blend=c.createLinearGradient(bank.x,bank.y-bankLift,bank.x-bankDistance,bank.y-bankLift+bankDistance*2);blend.addColorStop(0,'#fff');blend.addColorStop(1,'rgba(255,255,255,0)');
 c.save();c.globalCompositeOperation='destination-in';c.fillStyle=blend;c.fillRect(left,top,right-left,bottom-top);c.restore();
 // Keep the complete walkable surface above the walls. At concave shoulders, a rear wall can project
 // across the ramp in screen space; compositing it behind the surface prevents the false overlap.
 const surfaceContext=c,wallCanvas=document.createElement('canvas');wallCanvas.width=canvas.width;wallCanvas.height=canvas.height;
 c=wallCanvas.getContext('2d',{willReadFrequently:true})!;c.setTransform(surfaceContext.getTransform());
 // Face texture spans connected wall panels. Every junction shares its exact top and foot vertices.
 const contact=new Path2D();for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];if(b.g.x<a.g.x&&Math.max(a.h,b.h)>.5){contact.moveTo(a.g.x,a.g.y);contact.lineTo(b.g.x,b.g.y);}}
 c.save();c.strokeStyle='rgba(45,56,76,.13)';c.lineWidth=7;c.lineCap='round';c.filter='blur(3px)';c.stroke(contact);c.restore();
 let offset=0;
 for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length],dx=b.g.x-a.g.x,dy=b.g.y-a.g.y;
  const len=Math.abs(dx),H=Math.max(a.h,b.h);if(dx>=0||len<.1||H<.5)continue;
  const x=b.g.x,y=b.g.y,k=dy/dx;
  c.save();c.beginPath();c.moveTo(a.g.x,a.g.y+12);c.lineTo(b.g.x,b.g.y+12);c.lineTo(b.t.x,b.t.y-5);c.lineTo(a.t.x,a.t.y-5);c.closePath();c.clip();
  c.beginPath();c.moveTo(a.g.x,a.g.y+2);c.lineTo(b.g.x,b.g.y+2);c.lineTo(b.t.x,b.t.y+1);c.lineTo(a.t.x,a.t.y+1);c.closePath();
  // Alpha above the generated crest reveals packed snow, never a flat gray filler strip.
  c.fillStyle='#dce5f1';c.fill();
  c.transform(1,k,0,1,x,y);
  // Generated strip has a narrow alpha fringe; crop within its connected rock and snow bank, preserving scale.
  const sw=rock.naturalWidth,sh=rock.naturalHeight,scale=.19;
  // Crop to this panel before drawing. Drawing the full strip behind dozens of tiny clips is expensive
  // in software renderers; the phase at each shared vertex still remains continuous.
  const phase=((-(offset+len)/scale)%sw+sw)%sw,sourceWidth=len/scale,first=Math.min(sourceWidth,sw-phase);
  c.drawImage(rock,phase,sh*.045,first,sh*.93,0,-H-6,first*scale,H+20);
  if(first<sourceWidth)c.drawImage(rock,0,sh*.045,sourceWidth-first,sh*.93,first*scale,-H-6,(sourceWidth-first)*scale,H+20);
  c.fillStyle=dy>0?'rgba(252,235,213,.04)':'rgba(34,48,73,.18)';c.fillRect(0,-H,len,H+4);
  c.restore();offset+=len;

 }
 surfaceContext.save();surfaceContext.setTransform(1,0,0,1,0,0);surfaceContext.globalCompositeOperation='destination-over';surfaceContext.drawImage(wallCanvas,0,0);surfaceContext.restore();
 return {feature:f,canvas,left,top,width:right-left,height:bottom-top,bottom};
}
