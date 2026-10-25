import './index';
import {createFxStage,UNIT_PX,yawOfScreenAngle} from './index';
import {characters,atlasUrl} from '../stronghold/heroes';
import {tilePoint} from '../stronghold/terrain';
import {createRiftBoltAnimation,riftBoltLevel,RIFT_BOLT_TIMING} from './rift-bolt-levels';
import './rift-bolt-player.css';

const root=document.querySelector<HTMLElement>('#player')!;
root.innerHTML=`<header><div><p class="eyebrow">ARKODIA / RIFT RUNNER</p><h1>Rift Bolt <span>Animation Player</span></h1></div><span class="tag">LIVE NIXIEFX</span></header>
<section id="viewport" aria-label="Rift Bolt animation stage"><canvas id="ground"></canvas><canvas id="figures"></canvas><div class="stage-top"><span id="rank-name"></span><span id="phase" role="status">Loading</span></div><div class="stage-bottom"><span>CASTER</span><span>PIERCING VOLLEY → IMPACT</span></div></section>
<section class="controls" aria-label="Playback controls"><div class="level-row"><label for="level">Skill level</label><select id="level" aria-label="Skill level">${[1,2,3,4,5].map(n=>`<option value="${n}">Lv. ${n}</option>`).join('')}</select><p id="description"></p></div><div class="transport"><button id="play" disabled>Pause</button><button id="replay" disabled>Replay</button><button id="loop" aria-pressed="true">Loop</button><label class="background">Backdrop <select id="background"><option value="night">Night</option><option value="day">Day</option></select></label><output id="elapsed">0.00 / 2.60 s</output></div><progress id="timeline" max="2.6" value="0" aria-label="Animation progress"></progress><p class="hint">Casting · Projectile travel · Impact <span>Visual preview — combat rules unchanged</span></p></section>`;
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const viewEl=$('viewport'),ground=$<HTMLCanvasElement>('ground'),figures=$<HTMLCanvasElement>('figures');
const playBtn=$<HTMLButtonElement>('play'),levelSelect=$<HTMLSelectElement>('level');
const q=new URLSearchParams(location.search);
let level=riftBoltLevel(Number(q.get('level')||1)).level,loop=q.get('loop')!=='0',paused=q.get('autoplay')==='0',bg='night';
let animation:ReturnType<typeof createRiftBoltAnimation>|undefined,cycles=0,view={x:0,y:0,scale:1};
const stage=createFxStage({under:figures,over:figures});
let manifest:Record<string,any>={},images=new Map<string,HTMLImageElement>();
const origin={u:20,v:20},yaw=yawOfScreenAngle(0);
const point=(u:number,v:number)=>{const p=tilePoint(u,v);return {x:view.x+p.x*view.scale,y:view.y+p.y*view.scale};};
function sync(){
 const spec=riftBoltLevel(level);levelSelect.value=String(level);
 $('rank-name').textContent=`LV. ${level} / ${spec.name}`;
 $('description').textContent=`${spec.offsets.length} piercing ${spec.offsets.length===1?'spear':'spears'} · ${spec.area.toFixed(2)}× cast ring`;
 playBtn.textContent=paused?'Play':'Pause';playBtn.setAttribute('aria-pressed',String(!paused));
 $('loop').setAttribute('aria-pressed',String(loop));
}
function replay(){
 animation?.dispose();
 // Drain released particles in simulation before starting a fresh take; no stale volley after rank changes.
 for(let i=0;i<150;i++)stage.frame(1/60,false);
 animation=createRiftBoltAnimation(stage,level);cycles++;paused=false;sync();drawFigures();
}
function layout(){
 const w=viewEl.clientWidth,h=viewEl.clientHeight,dpr=Math.min(devicePixelRatio,2);
 // Fit the full 5.2 tile path and the largest ring on narrow screens.
 const scale=Math.min(1.5,(w-32)/600,(h-64)/280);
 const focus=tilePoint(origin.u+Math.cos(yaw)*2.35,origin.v+Math.sin(yaw)*2.35);
 view={x:w/2-focus.x*scale,y:h*.64-focus.y*scale,scale};stage.place(view.x,view.y,view.scale);
 for(const cv of [ground,figures]){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}
 const g=ground.getContext('2d')!;g.setTransform(dpr,0,0,dpr,0,0);
 const gradient=g.createRadialGradient(w/2,h*.6,0,w/2,h*.6,w*.8);
 gradient.addColorStop(0,bg==='night'?'#283447':'#e2eaf1');gradient.addColorStop(1,bg==='night'?'#0b101a':'#8d9eac');g.fillStyle=gradient;g.fillRect(0,0,w,h);
 g.strokeStyle=bg==='night'?'#8ba8cc18':'#25334920';g.lineWidth=1;
 for(let i=10;i<=30;i++){const a=point(i,10),b=point(i,30),c=point(10,i),d=point(30,i);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.moveTo(c.x,c.y);g.lineTo(d.x,d.y);g.stroke();}
 drawFigures();
}
function drawFigures(){
 const f=figures.getContext('2d')!,dpr=Math.min(devicePixelRatio,2),time=animation?.time??0;
 f.setTransform(1,0,0,1,0,0);f.clearRect(0,0,figures.width,figures.height);f.setTransform(dpr,0,0,dpr,0,0);
 const actors=[{id:'rift-runner',...origin,hero:true},...riftBoltLevel(level).offsets.map(off=>{const a=yawOfScreenAngle(off);return {id:'revenant',u:origin.u+Math.cos(a)*5.2,v:origin.v+Math.sin(a)*5.2,hero:false};})];
 for(const a of actors){
  const m=manifest[a.id],img=images.get(a.id);if(!m||!img)continue;
  const casting=a.hero&&time<.68;
  const clip=m.clips?.[casting?'attack-E':'idle-E']??m.clips?.[casting?'attack-SE':'idle-SE']??m.clips?.idle;
  const frames=clip?.frames??[0],fps=clip?.fps??6;
  const index=casting?Math.min(frames.length-1,Math.floor(time*fps)):Math.floor(time*fps)%frames.length;
  const fr=m.frames[frames[index]??0],cw=m.cell?.w??fr.w,ch=m.cell?.h??fr.h,s=1.4*UNIT_PX*view.scale/ch,p=point(a.u,a.v);
  f.save();f.translate(p.x,p.y);f.fillStyle='#05091366';f.beginPath();f.ellipse(0,0,24*view.scale,9*view.scale,0,0,Math.PI*2);f.fill();
  // Brief target recoil makes impact timing readable without simulating damage.
  const hit=time>1.11&&time<1.3&&!a.hero;f.translate(hit?3*view.scale:0,0);f.scale(a.hero?s:-s,s);
  f.drawImage(img,fr.x,fr.y,fr.w,fr.h,-m.cell.pivot.x,-m.cell.pivot.y,cw,ch);f.restore();
 }
}
playBtn.onclick=()=>{if(animation?.complete){replay();return;}paused=!paused;sync();};
$('replay').onclick=replay;
$('loop').onclick=()=>{loop=!loop;sync();};
levelSelect.onchange=()=>{level=Number(levelSelect.value);replay();};
$<HTMLSelectElement>('background').onchange=e=>{bg=(e.target as HTMLSelectElement).value;layout();};
new ResizeObserver(layout).observe(viewEl);sync();layout();
async function boot(){
 manifest=await characters();
 await Promise.all(['rift-runner','revenant'].map(id=>new Promise<void>((resolve,reject)=>{const img=new Image();img.onload=()=>{images.set(id,img);resolve();};img.onerror=()=>reject(Error('Failed to load '+id));img.src=atlasUrl(manifest[id]);})));
 await stage.loaded;if(stage.failed()||!stage.playable())throw Error('NixieFX renderer failed to initialize');
 const startPaused=paused;replay();paused=startPaused;sync();playBtn.disabled=false;$<HTMLButtonElement>('replay').disabled=false;
 let previous=0;
 function frame(now:number){
  const dt=previous?Math.min(.05,(now-previous)/1000):0;previous=now;
  if(!paused&&!document.hidden&&animation){
   animation.advance(dt);stage.frame(dt);drawFigures();
   if(animation.complete){if(loop)replay();else{paused=true;sync();}}
  }
  const t=Math.min(RIFT_BOLT_TIMING.duration,animation?.time??0);
  $<HTMLProgressElement>('timeline').value=t;$('elapsed').textContent=`${t.toFixed(2)} / 2.60 s`;
  $('phase').textContent=paused?(animation?.complete?'Complete':'Paused'):(animation?.phase??'Ready');
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
 (window as any).__RIFT_BOLT__={state:()=>({level,loop,paused,time:animation?.time,phase:animation?.phase,cycles,spec:riftBoltLevel(level),stats:stage.stats()}),
  seek:(seconds:number)=>{replay();paused=true;for(let t=0;t<seconds;t+=1/120){animation!.advance(1/120);stage.frame(1/120,false);}stage.frame(0);drawFigures();sync();}};
}
boot().catch(error=>{$('phase').textContent='Unable to load animation';$('description').textContent=String(error);console.error(error);});
