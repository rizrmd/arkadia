import {tilePoint} from './terrain';
import {phaseOf} from './daylight';

// Wall brackets sit on the outer masonry faces; posts flank the tent and open court.
export const TORCHES=[
 ...[3,7.5,12].flatMap(n=>[
  {u:n,v:0,lift:65,wall:true},{u:0,v:n,lift:65,wall:true},
  {u:n,v:15.5,lift:65,wall:true},{u:15.5,v:n,lift:65,wall:true}
 ]),
 ...[[5.5,6],[6,10],[10,6],[10.5,10]].map(([u,v])=>({u,v,lift:48,wall:false}))
].map(t=>({...t,...tilePoint(t.u,t.v)}));
export const torchesOn=(time:number)=>phaseOf(time)==='Night';

export function drawTorches(c:CanvasRenderingContext2D,lit:boolean){
 for(const t of TORCHES){
  const x=t.x,y=t.y-t.lift;c.save();
  // Dark iron collar, warm wood shaft, and a small snow-covered foot on free posts.
  c.lineCap='round';c.strokeStyle='#261b16';c.lineWidth=t.wall?5:6;
  c.beginPath();c.moveTo(x,y+5);c.lineTo(x,t.wall?y+25:t.y);c.stroke();
  c.strokeStyle='#826044';c.lineWidth=2;c.beginPath();c.moveTo(x-1,y+6);c.lineTo(x-1,t.wall?y+22:t.y-3);c.stroke();
  if(!t.wall){c.fillStyle='#4a4541';c.beginPath();c.ellipse(x,t.y,7,3,0,0,Math.PI*2);c.fill();c.fillStyle='#d9d9ce';c.fillRect(x-5,t.y-2,4,1.5);}
  c.fillStyle='#27282c';c.fillRect(x-5,y+2,10,5);c.fillRect(x-4,y+12,8,3);
  if(lit){
   c.fillStyle='#ed6c25';c.beginPath();c.moveTo(x-4,y+3);c.quadraticCurveTo(x-7,y-4,x-1,y-13);c.quadraticCurveTo(x-1,y-7,x+3,y-8);c.quadraticCurveTo(x+8,y,x+3,y+3);c.closePath();c.fill();
   c.fillStyle='#ffe5a0';c.beginPath();c.moveTo(x-2,y+3);c.quadraticCurveTo(x-3,y-2,x+1,y-6);c.quadraticCurveTo(x+4,y+1,x+2,y+3);c.fill();
  }
  c.restore();
 }
}
