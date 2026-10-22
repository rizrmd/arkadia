import {createFxStage,playCue,cueKeys,yawOfScreenAngle,UNIT_PX,type FxHandle} from './index';
import {tilePoint} from '../stronghold/terrain';
import {HERO_SKILLS,type SkillId} from '../stronghold/combat-vfx';
import {HEROES,characters,atlasUrl,type HeroId} from '../stronghold/heroes';
import type {Progress} from '../app/loader';
// FX Lab (/fx-lab): plays every hero's skill FX on a patch of snow, with the hero and a revenant standing in, so
// effects can be reviewed and tuned without fighting for them. ?hero=ember-warden&play=flame-fan&aim=20&repeat=1
// presets it; window.__FX_LAB__ drives it from scripts (scripts/vfx/capture.mjs).
const HERO={u:20,v:20},CHARGE:Partial<Record<SkillId,number>>={'rift-trap':640,'ember-snare':640,shockwave:460,cleave:320,'cinder-step':260,'rift-dash':260};
const RADIUS:Partial<Record<SkillId,number>>={'rift-trap':1.45,'ember-snare':1.5,shockwave:1.65,cleave:1.55,'cinder-step':1.35,'rift-dash':1.35};
const BOLTS:Partial<Record<SkillId,number[]>>={'flame-fan':[-.34,0,.34],'rift-bolt':[0]};

export async function mount(root:HTMLElement,progress:Progress){
 progress(0,1,'Loading the FX Lab');
 const q=new URLSearchParams(location.search);
 let hero:HeroId=(HEROES.find(h=>h.id===q.get('hero'))?.id)??'ember-warden',aimDeg=Number(q.get('aim')??20),repeat=q.get('repeat')==='1',last='';
 root.innerHTML=`<div id="fx-lab" style="position:fixed;inset:0;overflow:hidden;background:#141c22;font:14px Georgia,serif;color:#eee7d7">
  <canvas id="fx-lab-ground" style="position:absolute;inset:0;width:100%;height:100%"></canvas>
  <canvas id="fx-lab-figures" style="position:absolute;inset:0;width:100%;height:100%;z-index:2"></canvas>
  <aside id="fx-lab-panel" style="position:absolute;z-index:5;right:16px;top:16px;width:min(300px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;background:#0e1418e6;border:1px solid #c9a86a66;border-radius:10px;padding:12px">
   <h1 style="margin:0 0 8px;font-size:18px;font-weight:400;letter-spacing:.04em">FX Lab <small style="color:#c9a86a;font-size:11px;letter-spacing:.2em">NIXIEFX</small></h1>
   <label>Hero <select id="fx-hero" style="width:100%;margin:4px 0 10px;font:inherit;background:#141c22;color:inherit;border:1px solid #c9a86a66;border-radius:6px;padding:4px"></select></label>
   <div style="font-size:11px;letter-spacing:.18em;color:#c9a86a">SKILLS</div><div id="fx-skills" style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px"></div>
   <div style="font-size:11px;letter-spacing:.18em;color:#c9a86a">CUES</div><div id="fx-cues" style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0 10px"></div>
   <label style="display:block">Aim <span id="fx-aim-v"></span>°<input id="fx-aim" type="range" min="-180" max="180" style="width:100%"></label>
   <label style="display:flex;gap:6px;align-items:center;margin:6px 0"><input id="fx-repeat" type="checkbox"> Repeat</label>
   <div id="fx-stats" style="font-size:12px;color:#cfc6b4;font-variant-numeric:tabular-nums"></div>
  </aside></div>`;
 const $=<T extends HTMLElement>(s:string)=>root.querySelector(s) as T;
 const groundCv=$<HTMLCanvasElement>('#fx-lab-ground'),figCv=$<HTMLCanvasElement>('#fx-lab-figures');
 const stage=createFxStage({under:figCv,over:figCv});
 const chars=await characters(),imgs=new Map<string,HTMLImageElement>();
 await Promise.all(['ember-warden','rift-runner','revenant'].map(id=>new Promise<void>(ok=>{const m=chars[id],i=new Image();i.onload=()=>ok();i.onerror=()=>ok();i.src=atlasUrl(m);imgs.set(id,i);})));
 await stage.loaded;
 let view={x:0,y:0,scale:1};
 const target=()=>{const yaw=yawOfScreenAngle(aimDeg*Math.PI/180);return {u:HERO.u+Math.cos(yaw)*3.2,v:HERO.v+Math.sin(yaw)*3.2};};
 const screen=(u:number,v:number)=>{const p=tilePoint(u,v);return {x:view.x+p.x*view.scale,y:view.y+p.y*view.scale};};
 function layout(){const w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,2),k=Math.max(1,Math.min(2,Math.min(w,h)/560));
  const p=tilePoint(HERO.u+1,HERO.v);view={x:Math.round(w*(w>700?.42:.5)-p.x*k),y:Math.round(h*.55-p.y*k),scale:k};stage.place(view.x,view.y,view.scale);
  for(const c of [groundCv,figCv]){c.width=w*dpr;c.height=h*dpr;}
  const g=groundCv.getContext('2d')!;g.setTransform(dpr,0,0,dpr,0,0);
  const night=q.get('bg')==='night',bg=g.createRadialGradient(w*.45,h*.55,40,w*.45,h*.55,Math.max(w,h)*.75);for(const [t,c] of (night?[[0,'#4a5a72'],[.55,'#2a3448'],[1,'#0e131c']]:[[0,'#d6dee6'],[.55,'#a9b5c2'],[1,'#4a5664']]) as [number,string][])bg.addColorStop(t,c);g.fillStyle=bg;g.fillRect(0,0,w,h);
  g.strokeStyle='rgba(40,56,72,.18)';g.lineWidth=1;for(let i=0;i<=40;i++){const a=screen(i,0),b=screen(i,40),c=screen(0,i),d=screen(40,i);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.moveTo(c.x,c.y);g.lineTo(d.x,d.y);g.stroke();}
  drawFigures();}
 function drawFigures(){const dpr=Math.min(devicePixelRatio||1,2),f=figCv.getContext('2d')!;f.setTransform(1,0,0,1,0,0);f.clearRect(0,0,figCv.width,figCv.height);f.setTransform(dpr,0,0,dpr,0,0);
  const t=target(),list=[{id:hero as string,...HERO,flip:Math.cos(aimDeg*Math.PI/180)<0},{id:'revenant',...t,flip:true}].sort((a,b)=>tilePoint(a.u,a.v).y-tilePoint(b.u,b.v).y);
  for(const c of list){const m=chars[c.id],img=imgs.get(c.id);if(!m||!img?.complete)continue;const fr=m.frames[m.clips?.idle?.frames?.[0]??0]??m.frames[0],s=1.25*UNIT_PX*view.scale/fr.h,p=screen(c.u,c.v);
   f.save();f.translate(p.x,p.y);f.fillStyle='rgba(20,28,36,.28)';f.beginPath();f.ellipse(0,0,28*view.scale,10*view.scale,0,0,Math.PI*2);f.fill();
   f.scale(c.flip?-s:s,s);f.drawImage(img,fr.x,fr.y,fr.w,fr.h,-m.cell.pivot.x,-m.cell.pivot.y,fr.w,fr.h);f.restore();}}
 addEventListener('resize',layout);layout();

 const ctx=(at:{u:number;v:number},extra:{radius?:number}={})=>({...at,yaw:yawOfScreenAngle(aimDeg*Math.PI/180),target:target(),follow:()=>HERO,...extra});
 function cue(key:string){last='cue:'+key;
  const at=key.startsWith('hit.')||/\.(impact|detonate|telegraph)$/.test(key)&&!key.startsWith('shockwave')&&!key.startsWith('cleave')&&!key.includes('step')&&!key.includes('dash')?target():HERO;
  const skill=key.split('.')[0] as SkillId;
  if(key.endsWith('.bolt'))return bolt(key,0);
  playCue(stage,hero,key,ctx(at,{radius:RADIUS[skill]}));}
 // Everything below runs on the lab's own clock (tick), so scripts can pause it and step frame-exact moments.
 let simTime=0,paused=false;const tasks:{at:number;run:()=>void}[]=[],bolts:{h:FxHandle[];yaw:number;d:number;onEnd?:(at:{u:number;v:number})=>void}[]=[];
 const after=(ms:number,run:()=>void)=>tasks.push({at:simTime+ms/1000,run});
 function bolt(key:string,offset:number,onEnd?:(at:{u:number;v:number})=>void){
  const yaw=yawOfScreenAngle(aimDeg*Math.PI/180+offset);bolts.push({h:playCue(stage,hero,key,{...HERO,yaw}),yaw,d:0,onEnd});}
 function tick(dt:number,render=true){simTime+=dt;
  for(let i=tasks.length-1;i>=0;i--)if(tasks[i].at<=simTime)tasks.splice(i,1)[0].run();
  for(let i=bolts.length-1;i>=0;i--){const b=bolts[i];b.d=Math.min(3.2,b.d+6.5*dt);for(const x of b.h)x.setLocal(b.d);
   if(b.d>=3.2){bolts.splice(i,1);for(const x of b.h)x.release();b.onEnd?.({u:HERO.u+Math.cos(b.yaw)*3.2,v:HERO.v+Math.sin(b.yaw)*3.2});}}
  stage.frame(dt,render);}
 function sequence(skill:SkillId){last='skill:'+skill;const keys=cueKeys(hero),has=(p:string)=>keys.includes(`${skill}.${p}`),radius=RADIUS[skill];
  const self=skill==='shockwave'||skill==='cleave'||skill==='cinder-step'||skill==='rift-dash',spot=self?HERO:target();
  if(has('cast'))playCue(stage,hero,`${skill}.cast`,ctx(HERO,{radius}));
  if(has('bolt'))for(const off of BOLTS[skill]??[0])bolt(`${skill}.bolt`,off,at=>has('impact')&&playCue(stage,hero,`${skill}.impact`,{...at,yaw:yawOfScreenAngle(aimDeg*Math.PI/180)}));
  if(has('telegraph'))playCue(stage,hero,`${skill}.telegraph`,ctx(spot,{radius}));
  if(has('detonate'))after(CHARGE[skill]??260,()=>playCue(stage,hero,`${skill}.detonate`,ctx(spot,{radius})));}
 const btn=(label:string,on:()=>void)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='font:inherit;font-size:12px;color:#eee7d7;background:#1c262d;border:1px solid #c9a86a66;border-radius:999px;padding:3px 10px;cursor:pointer';b.onclick=on;return b;};
 function panel(){const sel=$<HTMLSelectElement>('#fx-hero');sel.innerHTML=HEROES.map(h=>`<option value="${h.id}"${h.id===hero?' selected':''}>${h.name}</option>`).join('');
  sel.onchange=()=>{hero=sel.value as HeroId;panel();drawFigures();};
  $('#fx-skills').replaceChildren(...HERO_SKILLS[hero].map(s=>btn(s.name,()=>sequence(s.id))));
  $('#fx-cues').replaceChildren(...cueKeys(hero).map(k=>btn(k,()=>cue(k))));
  const aim=$<HTMLInputElement>('#fx-aim');aim.value=String(aimDeg);$('#fx-aim-v').textContent=String(aimDeg);aim.oninput=()=>{aimDeg=+aim.value;$('#fx-aim-v').textContent=aim.value;drawFigures();};
  const rep=$<HTMLInputElement>('#fx-repeat');rep.checked=repeat;rep.onchange=()=>{repeat=rep.checked;};}
 panel();
 let prev=0,again=0,fps=60;
 const loop=(now:number)=>{const dt=prev?Math.min(.05,(now-prev)/1000):1/60;prev=now;fps=fps*.95+(1/dt)*.05;if(!paused)tick(dt);
  if(repeat&&last&&!paused){again+=dt;if(again>2.2){again=0;const [kind,id]=last.split(':');kind==='skill'?sequence(id as SkillId):cue(id);}}
  const s=stage.stats();$('#fx-stats').textContent=`${s.particles} particles · ${s.live} effects · ${Math.round(fps)} fps${s.missing.length?' · missing '+s.missing.join(','):''}`;requestAnimationFrame(loop);};
 requestAnimationFrame(loop);
 const preset=q.get('play') as SkillId|null;if(preset)setTimeout(()=>HERO_SKILLS[hero].some(s=>s.id===preset)?sequence(preset):cue(preset),300);
 (window as any).__FX_LAB__={stage,sequence,cue,play:(key:string)=>HERO_SKILLS[hero].some(s=>s.id===key)?sequence(key as SkillId):cue(key),pause:(on=true)=>{paused=on;},advance:(ms:number)=>{const n=Math.max(1,Math.round(ms/1000*60));for(let i=0;i<n;i++)tick(1/60,i===n-1);},setHero:(id:HeroId)=>{hero=id;panel();drawFigures();},setAim:(d:number)=>{aimDeg=d;panel();drawFigures();},stats:()=>stage.stats(),hide:()=>{$('#fx-lab-panel').style.display='none';}};
 document.body.dataset.fxLab='ready';
 progress(1,1,'FX Lab ready');
}
