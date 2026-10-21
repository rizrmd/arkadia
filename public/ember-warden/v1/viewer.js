const manifest=await(await fetch('manifest.json')).json(),canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
const entry=document.querySelector('#entry');
const action=document.querySelector('#action'),mode=document.querySelector('#mode'),speed=document.querySelector('#speed'),scrub=document.querySelector('#scrub'),play=document.querySelector('#play'),vfxToggle=document.querySelector('#vfx'),sockets=document.querySelector('#sockets'),info=document.querySelector('#info');
for(const a of manifest.actions){const o=document.createElement('option');o.value=a;o.textContent=a.replaceAll('-',' ');action.append(o)}
// Trim logical margins when uploading frames; retain the common origin in draw offsets.
const bitmaps=new Map;
for(const p of new Set([...manifest.clips,...manifest.vfx].map(c=>c.image))){
 const im=new Image;im.src=p;await im.decode();
 for(const c of [...manifest.clips,...manifest.vfx].filter(c=>c.image===p))for(let i=0;i<c.frames.length;i++){
  const f=c.frames[i],b=f.alphaBounds||[0,0,f.rect[2],f.rect[3]],key=(c.image.startsWith('vfx/')?'vfx:':'body:')+c.id+':'+i;
  const bitmap=await createImageBitmap(im,f.rect[0]+b[0],f.rect[1]+b[1],Math.max(1,b[2]-b[0]),Math.max(1,b[3]-b[1]));bitmaps.set(key,{bitmap,offset:b.slice(0,2)});
 }
}
const state={time:0,playing:true,seen:[],vfxSeen:[],trace:[],phases:[],frame:0,action:'idle',selected:0,drawSerial:0};let last=null;const seen=new Set,phases=new Set,fxSeen=new Set;let resetTime=0;
function reset(a){action.value=a;state.action=a;state.time=0;last=null;seen.clear();fxSeen.clear();phases.clear();state.trace=[];state.seen=[];state.vfxSeen=[];state.phases=[];state.playing=true;play.textContent='Pause';const c=manifest.clips.find(c=>c.action===a);scrub.max=c.frames.length-1;scrub.value=0;resetTime=performance.now()}
function drawBody(c,f,x,y,alpha=1){ctx.globalAlpha=alpha;const b=bitmaps.get('body:'+c.id+':'+f);ctx.drawImage(b.bitmap,x-128+b.offset[0],y-179.2+b.offset[1]);ctx.globalAlpha=1}
function drawFx(c,f,x,y){if(!c||!vfxToggle.checked)return;const b=bitmaps.get('vfx:'+c.id+':'+f);ctx.drawImage(b.bitmap,x-192+b.offset[0],y-243.2+b.offset[1]);fxSeen.add(c.id+':'+f)}
function draw(now){const dt=last===null?0:Math.min(.06,(now-last)/1000);last=now;if(state.playing)state.time+=dt*Number(speed.value);
 ctx.fillStyle='#192027';ctx.fillRect(0,0,canvas.width,canvas.height);const chosen=manifest.clips.filter(c=>c.action===state.action),first=chosen[0],duration=first.frames.length/first.fps;let phase='action',local=state.time;
 if(mode.value==='transition'){if(local<.65){phase=entry.value+' before';local=state.time}else{local-=.65;if(!first.loop&&local>=duration){phase=first.holdLastFrame?'death hold':entry.value+' after';local=first.holdLastFrame?duration-.00001:local-duration}else if(first.loop&&local>=duration*2){phase='run after';local-=duration*2}}}
 else if(!first.loop&&local>=duration)phase=first.holdLastFrame?'death hold':'completed';
 if(phase==='action'||phase==='death hold'||phase==='completed')phases.add(phase);else phases.add(phase);
 for(let di=0;di<chosen.length;di++){
  let c=chosen[di],f;const x=180+(di%4)*300,y=220+Math.floor(di/4)*300;
  const gridX=x-130,gridY=y-190;ctx.strokeStyle='#3b444c';ctx.strokeRect(gridX,gridY,260,250);ctx.fillStyle='#eef0ec';ctx.font='16px system-ui';ctx.fillText(c.direction,x-120,y-165);
  if(phase==='idle before'||phase==='idle after')c=manifest.clips.find(v=>v.action==='idle'&&v.direction===c.direction);if(phase==='run before'||phase==='run after')c=manifest.clips.find(v=>v.action==='run'&&v.direction===c.direction);
  f=state.playing?c.loop?Math.floor(Math.max(0,local)*c.fps)%c.frames.length:Math.min(c.frames.length-1,Math.floor(Math.max(0,local)*c.fps)):Math.min(c.frames.length-1,state.selected);
  const isAction=c.action===state.action;if(isAction)seen.add(c.id+':'+f);
  // Moving preview translates the ground relative to the same measured locomotion speed.
  const moving=['run','flame-fan-moving'].includes(c.action),heading={N:-90,NE:-45,E:0,SE:45,S:90,SW:135,W:180,NW:225}[c.direction]*Math.PI/180;
  const travel=moving?local*83.81:0,dx=(-Math.cos(heading)*travel)%24,dy=(-Math.sin(heading)*travel*.487)%24;
  ctx.save();ctx.beginPath();ctx.rect(x-125,y-150,250,190);ctx.clip();ctx.strokeStyle='#ffffff12';
  for(let k=-8;k<9;k++){
   ctx.beginPath();ctx.moveTo(x-140,y+k*24+dy);ctx.lineTo(x+140,y+k*24+dy);ctx.stroke();
   ctx.beginPath();ctx.moveTo(x+k*24+dx,y-160);ctx.lineTo(x+k*24+dx,y+50);ctx.stroke();
  }ctx.restore();
  const fx=manifest.vfx.find(v=>v.id===c.id),fxFrame=Math.min(f,(fx?.frames.length||1)-1);
  if(fx?.drawOrder==='behind-body')drawFx(fx,fxFrame,x,y);
  const blend=mode.value==='transition'&&phase==='action'&&!first.loop?Math.min(1,local/.12,(duration-local)/.12):1;
  if(blend<1&&!first.holdLastFrame){const neutral=manifest.clips.find(v=>v.action==='idle'&&v.direction===c.direction);drawBody(neutral,0,x,y,1-blend);drawBody(c,f,x,y,blend)}else drawBody(c,f,x,y);
  if(fx?.drawOrder!=='behind-body')drawFx(fx,fxFrame,x,y);
  if(sockets.checked){const m=c.frames[f].muzzle;ctx.fillStyle='#71e9ff';ctx.fillRect(x-2,y-2,4,4);ctx.fillStyle='#ffd766';ctx.fillRect(x-128+m[0]-2,y-179.2+m[1]-2,4,4)}
  if(di===0){state.frame=f;state.phase=phase;if(state.playing)scrub.value=f;state.trace.push({time:state.time,frame:f,phase});if(state.trace.length>800)state.trace.shift()}
  ctx.fillStyle='#c4c9c8';ctx.font='13px system-ui';ctx.fillText(`${f+1}/${c.frames.length} · ${phase}`,x-120,y+48);
 }
 state.drawSerial++;state.seen=[...seen];state.vfxSeen=[...fxSeen];state.phases=[...phases];info.textContent=`${state.action} · ${state.phase} · ${state.seen.length} observed body frames · ${Number(speed.value)}×`;
 requestAnimationFrame(draw)
}
action.onchange=()=>reset(action.value);mode.onchange=()=>reset(action.value);entry.onchange=()=>reset(action.value);play.onclick=()=>{if(state.playing)state.selected=state.frame;state.playing=!state.playing;play.textContent=state.playing?'Pause':'Play';last=null};document.querySelector('#restart').onclick=()=>reset(action.value);scrub.oninput=()=>{state.playing=false;play.textContent='Play';state.selected=Number(scrub.value);state.time=state.selected/manifest.clips.find(c=>c.action===state.action).fps};document.querySelector('#step').onclick=()=>{state.selected=(state.frame+1)%Number(Number(scrub.max)+1);scrub.value=state.selected;scrub.oninput()};
window.ember={manifest,state,setAction:reset};reset('idle');window.emberReady=true;requestAnimationFrame(draw);
