import {requestGameFrame as requestAnimationFrame} from '../app/frame-scheduler';
import {createFxStage,playCue,cueKeys,yawOfScreenAngle,UNIT_PX,type FxHandle} from './index';
import {tilePoint} from '../stronghold/terrain';
import {HERO_SKILLS,SKILL_CATALOG,type SkillId} from '../stronghold/combat-vfx';
import {HEROES,characters,atlasUrl,type HeroId} from '../stronghold/heroes';
import type {Progress} from '../app/loader';
// FX Lab (/fx-lab) & Embedded Skill Player (/skill-player, or ?controls=simple):
// Plays every hero's skill FX on an isometric patch of Stronghold ground with the hero and a Revenant target dummy.
// Query parameters:
//   hero=ember-warden|rift-runner
//   skill=flame-fan|cinder-step|ember-snare|cleave|shockwave|rift-bolt|rift-dash|rift-trap (or play=...)
//   cue=full|cast|bolt|telegraph|detonate|impact (or full cue key such as flame-fan.cast)
//   dir=N|NE|E|SE|S|SW|W|NW (or row=..., aim=<deg>)
//   loop=1|0 (or repeat=1|0)
//   bg=night|day
//   controls=simple|full (defaults to simple on /skill-player, full on /fx-lab)
const HERO={u:20,v:20};
const CHARGE:Partial<Record<SkillId,number>>={'rift-trap':640,'ember-snare':640,shockwave:460,cleave:320,'cinder-step':260,'rift-dash':260};
const RADIUS:Partial<Record<SkillId,number>>={'rift-trap':1.45,'ember-snare':1.5,shockwave:1.65,cleave:1.55,'cinder-step':1.35,'rift-dash':1.35};
const BOLTS:Partial<Record<SkillId,number[]>>={'flame-fan':[-.34,0,.34],'rift-bolt':[0]};
const SELF_SKILLS=new Set<SkillId>(['shockwave','cleave','cinder-step','rift-dash']);

export const DIRS=['N','NE','E','SE','S','SW','W','NW'] as const;
export type CompassDir=(typeof DIRS)[number];
const DIR_AIM_DEG:Record<CompassDir,number>={N:-90,NE:-28,E:0,SE:20,S:90,SW:152,W:180,NW:-152};

function normalizeDeg(d:number):number{
 let a=((d+180)%360+360)%360-180;
 return a===-180?180:a;
}

function nearestCompassDir(deg:number):CompassDir{
 const norm=normalizeDeg(deg);
 let best:CompassDir='SE',bestDiff=1e9;
 for(const d of DIRS){
  let diff=Math.abs(normalizeDeg(norm-DIR_AIM_DEG[d]));
  if(diff>180)diff=360-diff;
  if(diff<bestDiff){bestDiff=diff;best=d;}
 }
 return best;
}

function resolveHeroParam(raw:string|null):HeroId{
 const v=(raw??'').toLowerCase().trim();
 if(v==='rift'||v==='rift-runner')return 'rift-runner';
 if(v==='ember'||v==='ember-warden')return 'ember-warden';
 return HEROES.find(h=>h.id===v)?.id??'ember-warden';
}

function resolveSkillParam(hero:HeroId,raw:string|null):SkillId{
 const list=HERO_SKILLS[hero];
 const v=(raw??'').toLowerCase().trim();
 if(!v)return list[0].id;
 const base=v.split('.')[0] as SkillId;
 if(list.some(s=>s.id===base))return base;
 if(v==='seismic-slam'||v==='slam')return 'shockwave';
 if(v==='astral-cleave'||v==='molten-cleave')return 'cleave';
 return list[0].id;
}

const CUE_LABELS:Record<string,string>={
 cast:'Cast',
 bolt:'Projectile / Bolt',
 telegraph:'Telegraph',
 detonate:'Detonate',
 impact:'Impact',
};

export async function mount(root:HTMLElement,progress:Progress){
 progress(0,1,'Loading the Skill Player');
 const q=new URLSearchParams(location.search);
 const isSkillPlayerPath=location.pathname.startsWith('/skill-player');
 const controlsMode=q.get('controls')??(isSkillPlayerPath?'simple':'full');
 const isSimple=controlsMode==='simple';

 let hero:HeroId=resolveHeroParam(q.get('hero'));
 let previewPose:'idle'|'run'=q.get('pose')==='run'?'run':'idle';
 const rawPlay=q.get('skill')??q.get('play');
 let activeSkill:SkillId=resolveSkillParam(hero,rawPlay);

 const rawCue=q.get('cue')??(rawPlay&&rawPlay.includes('.')?rawPlay:null);
 let activeCue='full';
 if(rawCue){
  const c=rawCue.toLowerCase().trim();
  if(c==='full'||c==='sequence')activeCue='full';
  else if(c.includes('.'))activeCue=c;
  else activeCue=`${activeSkill}.${c}`;
 }

 const rawDir=(q.get('dir')??q.get('row')??'').toUpperCase().trim() as CompassDir;
 let aimDeg=DIRS.includes(rawDir)?DIR_AIM_DEG[rawDir]:Number(q.get('aim')??20);
 if(Number.isNaN(aimDeg))aimDeg=20;
 let activeDir:CompassDir=DIRS.includes(rawDir)?rawDir:nearestCompassDir(aimDeg);

 const loopParam=q.get('loop')??q.get('repeat');
 let repeat=loopParam!==null?loopParam!=='0'&&loopParam!=='false':isSimple;
 const bgParam=(q.get('bg')??'').toLowerCase().trim();
 let bgMode:'night'|'day'=bgParam==='day'||bgParam==='light'?'day':bgParam==='night'||bgParam==='dark'?'night':(isSimple?'night':'day');
 let last='';

 root.innerHTML=`
 <style>
  #fx-lab{position:fixed;inset:0;display:flex;flex-direction:column;overflow:hidden;background:#12181c;font:13px/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#e6efec;user-select:none}
  #fx-stage-wrap{position:relative;flex:1;min-height:180px;overflow:hidden;background:#141c22}
  #fx-lab-ground,#fx-lab-figures{position:absolute;inset:0;width:100%;height:100%;display:block}
  #fx-lab-figures{z-index:2;pointer-events:none}
  #sp-badge{position:absolute;z-index:6;left:10px;top:10px;padding:4px 10px;border-radius:6px;background:rgba(10,15,20,0.82);border:1px solid rgba(201,168,106,0.35);color:#f1e3c6;font-size:12px;font-variant-numeric:tabular-nums;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,0.45)}
  #sp-controls{display:none;flex-direction:column;gap:6px;padding:8px 10px;border-top:1px solid #2a363b;background:#12181c;z-index:6}
  #fx-lab[data-controls="simple"] #sp-controls{display:flex}
  #fx-lab[data-controls="simple"] #fx-lab-panel{display:none !important}
  #fx-lab:not([data-controls="simple"]) #sp-badge{display:none}
  .sp-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px}
  .sp-group{display:inline-flex;align-items:center;gap:4px;flex-wrap:wrap}
  .sp-label{font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#95a8a3;margin-right:2px}
  .sp-btn,.sp-select{font:inherit;color:#e6efec;background:#1e272c;border:1px solid #2a363b;border-radius:6px;padding:4px 9px;min-height:28px;cursor:pointer;transition:border-color 120ms,background 120ms}
  .sp-btn:hover,.sp-select:hover{border-color:#4b626b}
  .sp-btn[aria-pressed="true"],.sp-btn.primary{background:#5fc9b5;border-color:#5fc9b5;color:#06211c;font-weight:600}
  .sp-seg{display:inline-flex}
  .sp-seg .sp-btn{border-radius:0}
  .sp-seg .sp-btn:first-child{border-radius:6px 0 0 6px}
  .sp-seg .sp-btn:last-child{border-radius:0 6px 6px 0;margin-left:-1px}
  #sp-headings .sp-btn{min-width:34px;padding:4px 6px}
  .sp-divider{width:1px;height:18px;background:#2a363b;margin:0 2px}
  @media (max-width:520px){
   #sp-controls{padding:6px 6px;gap:5px}
   .sp-btn,.sp-select{padding:3px 7px;min-height:26px;font-size:12px}
   #sp-headings .sp-btn{min-width:29px;padding:3px 4px}
   .sp-label{display:none}
  }
 </style>
 <div id="fx-lab" data-controls="${isSimple?'simple':'full'}" data-bg="${bgMode}">
  <div id="fx-stage-wrap">
   <canvas id="fx-lab-ground"></canvas>
   <canvas id="fx-lab-figures"></canvas>
   <div id="sp-badge" aria-live="polite"></div>
   <aside id="fx-lab-panel" style="position:absolute;z-index:5;right:16px;top:16px;width:min(300px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;background:#0e1418e6;border:1px solid #c9a86a66;border-radius:10px;padding:12px;font:14px Georgia,serif;color:#eee7d7">
    <h1 style="margin:0 0 8px;font-size:18px;font-weight:400;letter-spacing:.04em">FX Lab <small style="color:#c9a86a;font-size:11px;letter-spacing:.2em">NIXIEFX</small></h1>
    <label>Hero <select id="fx-hero" style="width:100%;margin:4px 0 10px;font:inherit;background:#141c22;color:inherit;border:1px solid #c9a86a66;border-radius:6px;padding:4px"></select></label>
    <label>Pose <select id="fx-pose" style="width:100%;margin:4px 0 10px;font:inherit;background:#141c22;color:inherit"><option value="idle">Skill</option><option value="run">Run</option></select></label>
    <div style="font-size:11px;letter-spacing:.18em;color:#c9a86a">SKILLS</div><div id="fx-skills" style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px"></div>
    <div style="font-size:11px;letter-spacing:.18em;color:#c9a86a">CUES</div><div id="fx-cues" style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0 10px"></div>
    <label style="display:block">Aim <span id="fx-aim-v"></span>°<input id="fx-aim" type="range" min="-180" max="180" style="width:100%"></label>
    <label style="display:flex;gap:6px;align-items:center;margin:6px 0"><input id="fx-repeat" type="checkbox"> Repeat</label>
    <div id="fx-stats" style="font-size:12px;color:#cfc6b4;font-variant-numeric:tabular-nums"></div>
   </aside>
  </div>
  <form id="sp-controls" onsubmit="return false" aria-label="Skill Player Controls">
   <div class="sp-row">
    <label class="sp-group">Pose <select id="sp-pose" class="sp-select" aria-label="Preview Pose"><option value="idle">Skill</option><option value="run">Run</option></select></label>
    <label class="sp-group" aria-label="Skill">
     <span class="sp-label">Skill</span>
     <select id="sp-skill" class="sp-select" aria-label="Select Skill"></select>
    </label>
    <span class="sp-divider" aria-hidden="true"></span>
    <div class="sp-group" id="sp-cues" role="group" aria-label="Cue Stage Switcher"></div>
   </div>
   <div class="sp-row">
    <div class="sp-group" id="sp-headings" role="group" aria-label="8-Direction Switcher"></div>
    <span class="sp-divider" aria-hidden="true"></span>
    <button type="button" id="sp-play" class="sp-btn primary" title="Play or replay active skill">Play / Replay</button>
    <div class="sp-seg" role="group" aria-label="Repeat Mode">
     <button type="button" id="sp-loop" class="sp-btn" aria-pressed="${repeat}">Loop</button>
     <button type="button" id="sp-once" class="sp-btn" aria-pressed="${!repeat}">Once</button>
    </div>
    <div class="sp-seg" role="group" aria-label="Background Switcher">
     <button type="button" id="sp-bg-night" class="sp-btn" aria-pressed="${bgMode==='night'}">Night</button>
     <button type="button" id="sp-bg-day" class="sp-btn" aria-pressed="${bgMode==='day'}">Day</button>
    </div>
   </div>
  </form>
 </div>`;

 const $=<T extends HTMLElement>(s:string)=>root.querySelector(s) as T;
 const labEl=$<HTMLElement>('#fx-lab');
 const stageWrap=$<HTMLElement>('#fx-stage-wrap');
 const groundCv=$<HTMLCanvasElement>('#fx-lab-ground'),figCv=$<HTMLCanvasElement>('#fx-lab-figures');
 const stage=createFxStage({under:figCv,over:figCv});
 const poseSelect=$<HTMLSelectElement>('#sp-pose'),labPoseSelect=$<HTMLSelectElement>('#fx-pose');
 const selectPose=(pose:'idle'|'run')=>{previewPose=pose;poseSelect.value=labPoseSelect.value=pose;};selectPose(previewPose);
 poseSelect.onchange=()=>selectPose(poseSelect.value==='run'?'run':'idle');labPoseSelect.onchange=()=>selectPose(labPoseSelect.value==='run'?'run':'idle');
 const chars=await characters(),imgs=new Map<string,HTMLImageElement>();
 await Promise.all(['ember-warden','rift-runner','revenant'].map(id=>new Promise<void>(ok=>{const m=chars[id],i=new Image();i.onload=()=>ok();i.onerror=()=>ok();i.src=atlasUrl(m);imgs.set(id,i);})));
 await stage.loaded;

 let view={x:0,y:0,scale:1};
 let simTime=0,paused=false,castAnimStart=0,castAnimUntil=0,again=0;
 let lastHeroClip='',lastHeroFrame=0,lastHeroFlip=false;
 const targetDist=()=>{
  const s=activeCue==='full'?activeSkill:(activeCue.split('.')[0] as SkillId);
  return isSimple&&SELF_SKILLS.has(s)?1.25:3.2;
 };
 const target=(dist=3.2)=>{const yaw=yawOfScreenAngle(aimDeg*Math.PI/180);return {u:HERO.u+Math.cos(yaw)*dist,v:HERO.v+Math.sin(yaw)*dist};};
 const screen=(u:number,v:number)=>{const p=tilePoint(u,v);return {x:view.x+p.x*view.scale,y:view.y+p.y*view.scale};};

 function heroClipForDir(m:any,dir:CompassDir,attacking:boolean):{clipName:string;clip:any;flip:boolean}{
  const prefix=previewPose==='run'?'move':attacking?'attack':'idle';
  const fallbackDir=dir==='E'?'SE':dir==='W'?'SW':dir;
  const viewKey=m.clips?.[`${prefix}-${dir}`]?dir:fallbackDir;
  const flip=dir==='SW'||dir==='W'||dir==='NW';
  const clipName=m.clips?.[`${prefix}-${viewKey}`]?`${prefix}-${viewKey}`:m.clips?.[`idle-${viewKey}`]?`idle-${viewKey}`:'idle';
  const clip=m.clips?.[clipName]??m.clips?.idle;
  return {clipName,clip,flip};
 }

 function layout(){
  const w=stageWrap.clientWidth||innerWidth,h=stageWrap.clientHeight||innerHeight,dpr=Math.min(devicePixelRatio||1,2);
  const k=Math.max(1,Math.min(2,Math.min(w,h)/(isSimple?440:560)));
  const d=targetDist(),t=target(d);
  const focus=isSimple?tilePoint(HERO.u+(t.u-HERO.u)*.42,HERO.v+(t.v-HERO.v)*.42):tilePoint(HERO.u+1,HERO.v);
  view={x:Math.round(w*(isSimple?.5:(w>700?.42:.5))-focus.x*k),y:Math.round(h*(isSimple?.58:.55)-focus.y*k),scale:k};
  stage.place(view.x,view.y,view.scale);
  for(const c of [groundCv,figCv]){c.width=Math.max(1,Math.round(w*dpr));c.height=Math.max(1,Math.round(h*dpr));}
  drawGround();
  drawFigures();
 }

 function drawGround(){
  const w=stageWrap.clientWidth||innerWidth,h=stageWrap.clientHeight||innerHeight,dpr=Math.min(devicePixelRatio||1,2);
  const g=groundCv.getContext('2d')!;g.setTransform(dpr,0,0,dpr,0,0);
  const night=bgMode==='night';
  const bg=g.createRadialGradient(w*.5,h*.55,36,w*.5,h*.55,Math.max(w,h)*.75);
  for(const [t,c] of (night?[[0,'#4a5a72'],[.55,'#2a3448'],[1,'#0e131c']]:[[0,'#eef4fa'],[.55,'#d4e0ec'],[1,'#889aaa']]) as [number,string][])bg.addColorStop(t,c);
  g.fillStyle=bg;g.fillRect(0,0,w,h);
  g.strokeStyle=night?'rgba(140,175,210,.14)':'rgba(40,56,72,.14)';g.lineWidth=1;
  for(let i=0;i<=40;i++){const a=screen(i,0),b=screen(i,40),c=screen(0,i),d=screen(40,i);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.moveTo(c.x,c.y);g.lineTo(d.x,d.y);g.stroke();}
 }

 function drawFigures(){
  const dpr=Math.min(devicePixelRatio||1,2),f=figCv.getContext('2d')!;
  f.setTransform(1,0,0,1,0,0);f.clearRect(0,0,figCv.width,figCv.height);f.setTransform(dpr,0,0,dpr,0,0);
  const d=targetDist(),t=target(d);
  const attacking=simTime<castAnimUntil;
  const list=[
   {id:hero as string,u:HERO.u,v:HERO.v,isHero:true},
   {id:'revenant',u:t.u,v:t.v,isHero:false}
  ].sort((a,b)=>tilePoint(a.u,a.v).y-tilePoint(b.u,b.v).y);

  for(const c of list){
   const m=chars[c.id],img=imgs.get(c.id);if(!m||!img?.complete)continue;
   let frameIdx=0,flip=false;
   if(c.isHero){
    const hc=heroClipForDir(m,activeDir,attacking);
    const frames=hc.clip?.frames??[0];
    const fps=hc.clip?.fps??6;
    const animIdx=attacking&&previewPose!=='run'?Math.min(frames.length-1,Math.floor(Math.max(0,simTime-castAnimStart)*fps)):(Math.floor(simTime*fps)%frames.length);
    frameIdx=frames[animIdx]??0;
    flip=hc.flip;
    lastHeroClip=hc.clipName;
    lastHeroFrame=frameIdx;
    lastHeroFlip=flip;
    Object.assign(figCv.dataset,{hero:c.id,clip:hc.clipName,frame:String(frameIdx),flip:String(flip),dir:activeDir});
   }else{
    const revClip=m.clips?.idle;
    const frames=revClip?.frames??[0];
    frameIdx=frames[Math.floor(simTime*(revClip?.fps??5))%frames.length]??0;
    flip=Math.cos(aimDeg*Math.PI/180)>=0;
   }
   const fr=m.frames[frameIdx]??m.frames[0];
   const cw=m.cell?.w??fr.w,ch=m.cell?.h??fr.h;
   const s=1.25*UNIT_PX*view.scale/ch,p=screen(c.u,c.v);
   f.save();f.translate(p.x,p.y);
   if(bgMode==='night'&&c.isHero){
    const pg=f.createRadialGradient(0,-8*view.scale,2,0,-8*view.scale,44*view.scale);
    pg.addColorStop(0,'rgba(255,204,136,0.22)');pg.addColorStop(1,'rgba(255,160,85,0)');
    f.fillStyle=pg;f.beginPath();f.ellipse(0,0,44*view.scale,22*view.scale,0,0,Math.PI*2);f.fill();
   }
   f.fillStyle='rgba(16,22,30,.34)';f.beginPath();f.ellipse(0,0,28*view.scale,10*view.scale,0,0,Math.PI*2);f.fill();
   f.scale(flip?-s:s,s);f.drawImage(img,fr.x,fr.y,fr.w,fr.h,-m.cell.pivot.x,-m.cell.pivot.y,cw,ch);f.restore();
  }
 }

 addEventListener('resize',layout);
 new ResizeObserver(()=>layout()).observe(stageWrap);

 const tasks:{at:number;run:()=>void}[]=[],bolts:{h:FxHandle[];yaw:number;d:number;speed:number;hit:boolean;onEnd?:(at:{u:number;v:number})=>void}[]=[];
 const after=(ms:number,run:()=>void)=>tasks.push({at:simTime+ms/1000,run});

 const ctx=(at:{u:number;v:number},extra:{radius?:number}={})=>({...at,yaw:yawOfScreenAngle(aimDeg*Math.PI/180),target:target(3.2),follow:()=>HERO,...extra});

 function bolt(key:string,offset:number,onEnd?:(at:{u:number;v:number})=>void){
  const yaw=yawOfScreenAngle(aimDeg*Math.PI/180+offset);
  const speed=key.startsWith('rift-bolt')||key.startsWith('flame-fan')?16.0:6.5;
  bolts.push({h:playCue(stage,hero,key,{...HERO,yaw}),yaw,d:0,speed,hit:false,onEnd});
 }

 function cue(key:string){
  last='cue:'+key;again=0;castAnimStart=simTime;castAnimUntil=simTime+0.55;
  const skill=key.split('.')[0] as SkillId;
  const isSelf=SELF_SKILLS.has(skill);
  const at=key.startsWith('hit.')||(/\.(impact|detonate|telegraph)$/.test(key)&&!isSelf)?target(3.2):HERO;
  if(key.endsWith('.bolt')){bolt(key,0);syncSimpleUI();return;}
  playCue(stage,hero,key,ctx(at,{radius:RADIUS[skill]}));
  syncSimpleUI();
 }

 function sequence(skill:SkillId){
  last='skill:'+skill;again=0;castAnimStart=simTime;castAnimUntil=simTime+0.55;
  const keys=cueKeys(hero),has=(p:string)=>keys.includes(`${skill}.${p}`),radius=RADIUS[skill];
  const self=SELF_SKILLS.has(skill),spot=self?HERO:target(3.2);
  if(has('cast'))playCue(stage,hero,`${skill}.cast`,ctx(HERO,{radius}));
  if(has('bolt'))for(const off of BOLTS[skill]??[0])bolt(`${skill}.bolt`,off,at=>has('impact')&&playCue(stage,hero,`${skill}.impact`,{...at,yaw:yawOfScreenAngle(aimDeg*Math.PI/180)}));
  if(has('telegraph'))playCue(stage,hero,`${skill}.telegraph`,ctx(spot,{radius}));
  if(has('detonate'))after(CHARGE[skill]??260,()=>playCue(stage,hero,`${skill}.detonate`,ctx(spot,{radius})));
  syncSimpleUI();
 }

 function triggerActive(){
  paused=false;
  if(activeCue==='full')sequence(activeSkill);
  else cue(activeCue);
 }

 function tick(dt:number,render=true){
  simTime+=dt;
  for(let i=tasks.length-1;i>=0;i--)if(tasks[i].at<=simTime)tasks.splice(i,1)[0].run();
  for(let i=bolts.length-1;i>=0;i--){
   const b=bolts[i];b.d=Math.min(3.2,b.d+b.speed*dt);
   for(const x of b.h)x.setLocal(b.d);
   if(b.d>=3.2&&!b.hit){
    b.hit=true;
    b.onEnd?.({u:HERO.u+Math.cos(b.yaw)*3.2,v:HERO.v+Math.sin(b.yaw)*3.2});
    const handles=b.h;
    bolts.splice(i,1);
    after(220,()=>{for(const x of handles)x.release();});
   }
  }
  if(render)drawFigures();
  stage.frame(dt,render);
 }

 const btn=(label:string,on:()=>void)=>{
  const b=document.createElement('button');b.type='button';b.textContent=label;
  b.style.cssText='font:inherit;font-size:12px;color:#eee7d7;background:#1c262d;border:1px solid #c9a86a66;border-radius:999px;padding:3px 10px;cursor:pointer';
  b.onclick=on;return b;
 };

 function cuesForSkill(h:HeroId,s:SkillId):{id:string;label:string}[]{
  const keys=cueKeys(h);
  const out:{id:string;label:string}[]=[{id:'full',label:'Full Sequence'}];
  for(const phase of ['cast','bolt','telegraph','detonate','impact']){
   const k=`${s}.${phase}`;
   if(keys.includes(k))out.push({id:k,label:CUE_LABELS[phase]??phase});
  }
  return out;
 }

 function syncSimpleUI(){
  const heroObj=HEROES.find(h=>h.id===hero)!;
  const skillObj=HERO_SKILLS[hero].find(s=>s.id===activeSkill)??SKILL_CATALOG[activeSkill]??HERO_SKILLS[hero][0];
  const cueList=cuesForSkill(hero,activeSkill);
  if(activeCue!=='full'&&!cueList.some(c=>c.id===activeCue))activeCue='full';

  const spSkill=$<HTMLSelectElement>('#sp-skill');
  if(spSkill){
   const opts=HERO_SKILLS[hero].map(s=>`<option value="${s.id}"${s.id===activeSkill?' selected':''}>${s.name}</option>`).join('');
   if(spSkill.innerHTML!==opts)spSkill.innerHTML=opts;
   spSkill.value=activeSkill;
  }

  const spCues=$<HTMLElement>('#sp-cues');
  if(spCues){
   spCues.replaceChildren(...cueList.map(c=>{
    const b=document.createElement('button');
    b.type='button';
    b.className='sp-btn';
    b.dataset.cue=c.id;
    b.textContent=c.label;
    b.setAttribute('aria-pressed',String(c.id===activeCue));
    b.onclick=()=>{activeCue=c.id;layout();triggerActive();};
    return b;
   }));
  }

  const spHeadings=$<HTMLElement>('#sp-headings');
  if(spHeadings){
   if(!spHeadings.children.length){
    for(const d of DIRS){
     const b=document.createElement('button');
     b.type='button';
     b.className='sp-btn';
     b.id=`dir-${d}`;
     b.dataset.dir=d;
     b.textContent=d;
     b.onclick=()=>{
      activeDir=d;
      aimDeg=DIR_AIM_DEG[d];
      layout();
      triggerActive();
     };
     spHeadings.appendChild(b);
    }
   }
   spHeadings.querySelectorAll<HTMLButtonElement>('button').forEach(b=>{
    b.setAttribute('aria-pressed',String(b.dataset.dir===activeDir));
   });
  }

  $('#sp-loop')?.setAttribute('aria-pressed',String(repeat));
  $('#sp-once')?.setAttribute('aria-pressed',String(!repeat));
  $('#sp-bg-night')?.setAttribute('aria-pressed',String(bgMode==='night'));
  $('#sp-bg-day')?.setAttribute('aria-pressed',String(bgMode==='day'));
  labEl.dataset.bg=bgMode;

  const activeCueLabel=cueList.find(c=>c.id===activeCue)?.label??'Full Sequence';
  const badge=$<HTMLElement>('#sp-badge');
  if(badge){
   const st=stage.stats();
   badge.textContent=`${heroObj.name} · ${skillObj.name} · ${activeCueLabel} · ${activeDir}${st.particles?` · ${st.particles} pts`:''}`;
  }
 }

 function bindSimpleEvents(){
  const spSkill=$<HTMLSelectElement>('#sp-skill');
  spSkill.onchange=()=>{
   activeSkill=spSkill.value as SkillId;
   activeCue='full';
   layout();
   triggerActive();
  };
  $('#sp-play').onclick=()=>triggerActive();
  $('#sp-loop').onclick=()=>{repeat=true;syncSimpleUI();triggerActive();};
  $('#sp-once').onclick=()=>{repeat=false;syncSimpleUI();};
  $('#sp-bg-night').onclick=()=>{bgMode='night';layout();syncSimpleUI();};
  $('#sp-bg-day').onclick=()=>{bgMode='day';layout();syncSimpleUI();};
 }

 function panel(){
  const sel=$<HTMLSelectElement>('#fx-hero');
  sel.innerHTML=HEROES.map(h=>`<option value="${h.id}"${h.id===hero?' selected':''}>${h.name}</option>`).join('');
  sel.onchange=()=>{
   hero=sel.value as HeroId;
   activeSkill=HERO_SKILLS[hero][0].id;
   activeCue='full';
   panel();
   layout();
  };
  $('#fx-skills').replaceChildren(...HERO_SKILLS[hero].map(s=>btn(s.name,()=>{activeSkill=s.id;activeCue='full';layout();sequence(s.id);})));
  $('#fx-cues').replaceChildren(...cueKeys(hero).map(k=>btn(k,()=>{
   const sk=k.split('.')[0] as SkillId;
   if(HERO_SKILLS[hero].some(s=>s.id===sk))activeSkill=sk;
   activeCue=k;
   layout();
   cue(k);
  })));
  const aim=$<HTMLInputElement>('#fx-aim');
  aim.value=String(aimDeg);
  $('#fx-aim-v').textContent=String(aimDeg);
  aim.oninput=()=>{
   aimDeg=+aim.value;
   activeDir=nearestCompassDir(aimDeg);
   $('#fx-aim-v').textContent=aim.value;
   layout();
   syncSimpleUI();
  };
  const rep=$<HTMLInputElement>('#fx-repeat');
  rep.checked=repeat;
  rep.onchange=()=>{repeat=rep.checked;syncSimpleUI();};
  syncSimpleUI();
 }

 bindSimpleEvents();
 panel();
 layout();

 let prev=0,fps=60;
 const loop=(now:number)=>{
  const dt=prev?Math.min(.05,(now-prev)/1000):1/60;prev=now;fps=fps*.95+(1/dt)*.05;
  if(!paused)tick(dt);
  if(repeat&&last&&!paused){
   again+=dt;
   if(again>2.2){
    again=0;
    const [kind,id]=last.split(':');
    kind==='skill'?sequence(id as SkillId):cue(id);
   }
  }
  const s=stage.stats();
  $('#fx-stats').textContent=`${s.particles} particles · ${s.live} effects · ${Math.round(fps)} fps${s.missing.length?' · missing '+s.missing.join(','):''}`;
  if(isSimple){
   const heroObj=HEROES.find(h=>h.id===hero)!;
   const skillObj=HERO_SKILLS[hero].find(s=>s.id===activeSkill)??SKILL_CATALOG[activeSkill]??HERO_SKILLS[hero][0];
   const cueList=cuesForSkill(hero,activeSkill);
   const activeCueLabel=cueList.find(c=>c.id===activeCue)?.label??'Full Sequence';
   $('#sp-badge').textContent=`${heroObj.name} · ${skillObj.name} · ${activeCueLabel} · ${activeDir} · ${s.particles} particles`;
  }
  requestAnimationFrame(loop);
 };
 requestAnimationFrame(loop);

 const autoplay=q.get('autoplay')!=='0';
 if(isSimple&&autoplay){
  setTimeout(()=>triggerActive(),160);
 }else if(rawPlay){
  setTimeout(()=>HERO_SKILLS[hero].some(s=>s.id===rawPlay)?sequence(rawPlay as SkillId):cue(rawPlay),260);
 }

 const api={
  stage,
  sequence:(s:SkillId)=>{activeSkill=s;activeCue='full';layout();sequence(s);},
  cue:(k:string)=>{activeCue=k;layout();cue(k);},
  play:(key?:string)=>{
   if(!key){triggerActive();return;}
   if(HERO_SKILLS[hero].some(s=>s.id===key)){activeSkill=key as SkillId;activeCue='full';layout();sequence(key as SkillId);}
   else{activeCue=key;layout();cue(key);}
  },
  pause:(on=true)=>{paused=on;},
  advance:(ms:number)=>{const n=Math.max(1,Math.round(ms/1000*60));for(let i=0;i<n;i++)tick(1/60,i===n-1);},
  setPose:(pose:'idle'|'run')=>{selectPose(pose);layout();},
  setHero:(id:HeroId)=>{hero=id;activeSkill=HERO_SKILLS[hero][0].id;activeCue='full';panel();layout();},
  setSkill:(id:SkillId)=>{activeSkill=id;activeCue='full';layout();triggerActive();},
  setCue:(c:string)=>{activeCue=c;layout();triggerActive();},
  setDir:(d:CompassDir)=>{if(DIRS.includes(d)){activeDir=d;aimDeg=DIR_AIM_DEG[d];layout();triggerActive();}},
  setAim:(d:number)=>{aimDeg=d;activeDir=nearestCompassDir(d);panel();layout();},
  setLoop:(on:boolean)=>{repeat=on;syncSimpleUI();},
  setBg:(bg:'night'|'day')=>{bgMode=bg;layout();syncSimpleUI();},
  state:()=>({hero,pose:previewPose,skill:activeSkill,cue:activeCue,dir:activeDir,aimDeg,repeat,bg:bgMode,paused,heroClip:lastHeroClip,heroFrame:lastHeroFrame,heroFlip:lastHeroFlip}),
  stats:()=>stage.stats(),
  hide:()=>{$('#fx-lab-panel').style.display='none';},
 };
 (window as any).__FX_LAB__=api;
 (window as any).skillPlayer=api;
 document.body.dataset.fxLab='ready';
 progress(1,1,'Skill Player ready');
}
