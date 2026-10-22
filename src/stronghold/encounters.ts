import {fresh,reward,roll,choose,cards,reach,health,threshold,xpPercent,critChance,critMultiplier,type Progression} from './progression';
import './progression.css';
import {unproject} from '../isometric';
import {Fighter,STATS,inReach,swingTargets,turn} from '../characters/combat';
import type {CharacterMeta} from '../characters/sprites';
import {COURT,tilePoint} from './terrain';
import {GATE,SPAWN_DISTANCE_M,METERS_PER_TILE,fromGate,fromCenter,inSafeZone,spawnPoint,meters,type Tile} from './safe-zone';
import {DISPLAY,cutOut,drawFigureShadow,type Placed,type Pose} from './hero';
import type {Sun} from './daylight';
import type {Walk} from './controls';
import {loadImage} from '../app/loader';
import type {Net} from './net/client';
import {characters,DEFAULT_HERO,type HeroId} from './heroes';
import {createCombatVfx,facingScreenAngle,HERO_SKILLS,type SkillId} from './combat-vfx';
// Revenants roaming the snow beyond the safe zone, the hero's hit points and their auto attack. The fight runs on
// the arena's rules (combat.ts): the same hit points, damage, reach, hit stun and swing timing, with the reach
// scaled to the Stronghold's smaller figures. Positions are ground tiles from the court origin, as in terrain.ts tilePoint().
// Revenants spawn 10 m outside the gate (safe-zone.ts) and never enter the court: a chase stops
// at the boundary, and once the hero is back inside they lose interest and wander off; the hero heals there.
// Like the hero (hero.ts) they cannot walk through the ground footprints of trees, rocks and walls, uprights
// standing in front of them cut their silhouette out, and the only shadow under them is the sun-cast one.
// In a co-op room (net/client.ts) none of this runs here: the server simulates the same rules for every hero, and
// this module only mirrors its revenants and the own hero's hit points, clips and kills (netStep below).
const SCALE=DISPLAY/1.1; // the arena draws characters at 1.1x on tiles of the same size
const HERO_REACH=STATS.hero.reach*SCALE,ENEMY_REACH=STATS.revenant.reach*SCALE,SIDE=.35*SCALE,SPACING=.72*SCALE;
// Hero ground speed is 105 screen px/s along a 71.6 px tile edge (hero.ts); revenants walk at a bit over half of it,
// so the hero can always outrun a pack back to the safe zone.
const ENEMY_SPEED=105/Math.hypot(64,32)*.55,ENEMY_STRIDE=76*DISPLAY/1.1;
// Tiles: a revenant hunts the hero within AGGRO (packs spawn inside it, so they come straight for a hero in the wilds);
// the idle hero steps in to swing at one within ENGAGE. Packs of one to three surround the hero, and a swing only
// reaches the side it faces, so the ones behind land their blows.
const VEER=[.4,.8,1.2,1.6,2,2.4],AGGRO=13,ENGAGE=2,MAX_ENEMIES=8,PACK=3,SPAWN_EVERY=2000,REGEN=8,HERO_RESPAWN=3500,CORPSE=4400;
type Foe=Fighter&{home:Tile;wander:Tile|null;age:number;side:number};
type Hero={position():{x:number;y:number};face(sx:number,sy:number):void;respawn():void;teleport(x:number,y:number):boolean;
 blocked(x:number,y:number):boolean;occluders(x:number,y:number,box:number[]):Placed[];sun():Sun;hero?:()=>HeroId};
const toTile=(x:number,y:number):Tile=>{const g=unproject(x-COURT.x,y-COURT.y);return {u:g.x,v:g.y};};
const screen=(du:number,dv:number)=>({x:(du-dv)*64,y:(du+dv)*32});
const tileOf=(f:Fighter):Tile=>({u:f.x,v:f.y});
export async function createEncounters(o:{layer:HTMLElement;hud:HTMLElement;hero:Hero;direction:()=>Walk;net?:Net}){
 const walkable=(p:Tile)=>{const w=tilePoint(p.u,p.v);return !o.hero.blocked(w.x,w.y);};
 // The fight times every hero by the knight's clips, as the co-op server does: each picked hero's swing, hit and
 // fall are packed to the same lengths (scripts/pack-heroes.mjs).
 const all=await characters(),heroMeta:CharacterMeta=all.hero,meta:CharacterMeta=all.revenant;
 const atlas=await loadImage('/assets/characters/'+meta.image+(meta.revision?`?v=${encodeURIComponent(meta.revision)}`:''));
 let seed=(Date.now()>>>0)||1;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const start=o.hero.position(),h=new Fighter('hero',heroMeta.clips,toTile(start.x,start.y).u,toTile(start.x,start.y).v);
 let maxHp=STATS.hero.hp,kills=0,spawnTimer=0,ambient='255,255,255',origin={x:0,y:0,scale:1};
 let run=fresh(),baseHp=100,levelUpPulseMs=0,regenAccum=0,swingCount=0;
 const local:Foe[]=[],spawns:{u:number;v:number;m:number}[]=[];let foes=local,online=false,heroPlays=-1;
 // Revenants behind the hero stand under its canvas, the rest over it; their health bars sit above both.
 // The ground AoE / attack reach ring (#hero-aoe) sits flat on the snow beneath both the hero and revenants.
 const heroCanvas=o.layer.querySelector<HTMLCanvasElement>('#world-hero')!,aoe=document.createElement('canvas'),aoeCtx=aoe.getContext('2d')!,back=document.createElement('div'),front=document.createElement('div'),bars=document.createElement('div');
 aoe.id='hero-aoe';aoe.setAttribute('aria-hidden','true');aoe.hidden=true;
 aoe.style.cssText='position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform;pointer-events:none';
 back.id='world-foes-back';front.id='world-foes-front';bars.id='world-foe-bars';for(const c of [back,front,bars])c.style.cssText='position:absolute;left:0;top:0;pointer-events:none';
 heroCanvas.before(aoe,back);heroCanvas.after(front);
 // Health + EXP bar over the hero's head, moved by the compositor, and the HUD panel.
 const bar=document.createElement('div');bar.id='hero-health';bar.setAttribute('aria-hidden','true');bar.innerHTML='<i></i><b class="hero-exp"></b>';front.after(bars,bar);
 const hud=document.createElement('section');hud.id='hero-hud';hud.setAttribute('aria-label','Hero status');
 hud.innerHTML='<div class="hud-row"><span class="hud-label">Health</span><span class="hud-hp">100 / 100</span></div><div class="hud-bar" role="meter" aria-label="Health" aria-valuemin="0"><i></i></div><div class="hud-exp-row"><span class="hud-lv-badge">Lv. 1</span><span class="hud-xp-text">0 / 20 XP (0%)</span></div><div class="hud-exp-bar" role="progressbar" aria-label="Experience" aria-valuemin="0" aria-valuemax="20" aria-valuenow="0"><i></i></div><div class="hud-zone"></div><div class="hud-kills">Revenants defeated · 0</div>';
 o.hud.append(hud);
 const progress=document.createElement('div');progress.className='run-progress';hud.append(progress);
 const picker=document.createElement('section');picker.className='level-cards';picker.hidden=true;picker.setAttribute('role','dialog');picker.setAttribute('aria-label','Choose a level-up blessing');o.hud.append(picker);

 const currentHeroId=():HeroId=>o.hero.hero?.()??DEFAULT_HERO;
 function onKill(){
  kills++;
  const prevLevel=run.level;
  reward(run,random);
  if(run.level>prevLevel){
   levelUpPulseMs=1200;
   vfx.triggerLevelUp(run.level,h.x,h.y);
  }
  if(run.pending)h.immune=200;
  const leech=(run.skills.leech??0)*2;
  if(leech>0){
   const before=h.hp;h.hp=Math.min(maxHp,h.hp+leech);
   if(h.hp>before)vfx.recordHeroHeal(h.hp-before,h.x,h.y,'SOUL FEAST');
  }
 }

 const vfx=createCombatVfx({
  layer:o.layer,heroCanvas,backLayer:back,frontLayer:front,
  getHero:()=>({u:h.x,v:h.y,facing:h.facing,back:h.back,vertical:h.vertical,heroId:currentHeroId()}),
  getRun:()=>run,
  getFoes:()=>foes,
  onKill:()=>onKill(),
  random
 });

 // Combat skill bar (hotkeys 1-4 or click/tap)
 const skillBar=document.createElement('nav');skillBar.id='combat-skills';skillBar.setAttribute('aria-label','Combat skills');o.hud.append(skillBar);
 let renderedHeroSkills='';
 function syncSkillBar(){
  skillBar.hidden=Boolean(run.pending);
  const hid=currentHeroId(),skills=HERO_SKILLS[hid];
  if(renderedHeroSkills!==hid){
   renderedHeroSkills=hid;
   skillBar.replaceChildren();
   for(const s of skills){
    const btn=document.createElement('button');btn.type='button';btn.className='skill-btn';btn.dataset.skill=s.id;
    btn.innerHTML=`<span class="skill-key">${s.key}</span><span class="skill-badge">${s.badge}</span><span class="skill-name">${s.name}</span><i class="skill-cd"></i>`;
    btn.onclick=e=>{e.stopPropagation();if(!run.pending&&h.alive)vfx.castSkill(s.id);};
    skillBar.append(btn);
   }
  }
  for(const s of skills){
   const cd=vfx.cooldown(s.id),ratio=Math.min(1,cd/s.cooldownMs);
   const fill=skillBar.querySelector<HTMLElement>(`.skill-btn[data-skill="${s.id}"] .skill-cd`);
   if(fill)fill.style.transform=`scaleY(${ratio.toFixed(3)})`;
  }
 }
 window.addEventListener('keydown',e=>{
  if(run.pending||!h.alive||e.repeat)return;
  const tag=(e.target as HTMLElement|null)?.tagName;if(tag==='INPUT'||tag==='TEXTAREA')return;
  const skills=HERO_SKILLS[currentHeroId()],idx=['1','2','3','4'].indexOf(e.key);
  if(idx>=0&&skills[idx])vfx.castSkill(skills[idx].id);
 });

 let offerKey='';
 function select(id:string){
  if(online){o.net?.chooseCard(id,run.level);return;}
  if(!choose(run,id,random))return;
  const beforeMax=maxHp,beforeHp=h.hp;
  maxHp=baseHp+health(run);
  h.hp=Math.min(maxHp,h.hp+Math.max(0,maxHp-beforeMax)+(id==='heal'?maxHp*.35:0));
  if(h.hp>beforeHp)vfx.recordHeroHeal(h.hp-beforeHp,h.x,h.y,cards[id]?.name.toUpperCase());
 }

 const q=<T extends Element>(s:string)=>hud.querySelector(s) as T;
 const hudFill=q<HTMLElement>('.hud-bar i'),barFill=bar.querySelector('i')!;
 const hudLvBadge=q<HTMLElement>('.hud-lv-badge'),hudXpText=q<HTMLElement>('.hud-xp-text'),hudExpBar=q<HTMLElement>('.hud-exp-bar'),hudExpFill=q<HTMLElement>('.hud-exp-bar i');
 const barExpFill=bar.querySelector<HTMLElement>('b.hero-exp')!;

 function drawProgress(){
  const nextXp=threshold(run),pct=xpPercent(run),expRatio=Math.max(0,Math.min(1,run.xp/Math.max(1,nextXp)));
  const lvText=`Lv. ${run.level}`,xpText=`${run.xp} / ${nextXp} XP (${pct}%)`;
  if(hudLvBadge.textContent!==lvText)hudLvBadge.textContent=lvText;
  if(hudXpText.textContent!==xpText)hudXpText.textContent=xpText;
  const shownRatio=levelUpPulseMs>600?1:expRatio;
  hudExpFill.style.transform=`scaleX(${shownRatio.toFixed(4)})`;
  barExpFill.style.transform=`scaleX(${shownRatio.toFixed(4)})`;
  hudExpBar.setAttribute('aria-valuenow',String(run.xp));
  hudExpBar.setAttribute('aria-valuemax',String(nextXp));
  hud.dataset.level=String(run.level);
  hud.dataset.xp=String(run.xp);
  hud.dataset.xpNext=String(nextXp);
  hud.dataset.xpPct=String(pct);
  hud.dataset.levelup=String(levelUpPulseMs>0);

  const label=`Level ${run.level} · ${run.xp} / ${nextXp} XP · ${run.gold} Gold · ${run.stars} Stars`;
  if(progress.textContent!==label)progress.textContent=label;
  picker.hidden=!run.pending;const key=JSON.stringify([online,run.level,run.pending,run.offers,run.skills]);if(key===offerKey)return;offerKey=key;
  picker.replaceChildren();if(!run.pending)return;
  const title=document.createElement('h2');title.textContent=`Level ${run.level} — Choose a blessing`;picker.append(title);
  const help=document.createElement('p');help.textContent=`${run.pending} choice(s) remaining · Protected while choosing`;picker.append(help);
  const row=document.createElement('div');row.className='blessing-row';picker.append(row);
  for(const id of run.offers){const card=cards[id];if(!card)continue;const button=document.createElement('button');const rank=run.skills[id]??0;button.innerHTML=`<small>${id==='star'?'STAR UPGRADE':rank?'SKILL UPGRADE':'BLESSING'}</small><strong>${card.name}${rank?' · Rank '+(rank+1):''}</strong><span>${card.description}</span>`;button.onclick=()=>select(id);row.append(button);}
 }

 function spawn(f?:Foe){
  const p=spawnPoint(random,tileOf(h),walkable);if(!p)return;
  // A new pack, or one returning revenant.
  const n=f?1:Math.min(MAX_ENEMIES-foes.length,1+Math.floor(random()*PACK));
  for(let i=0;i<n;i++){
   const at=i?spawnPoint(random,tileOf(h),walkable):p;if(!at)continue;
   spawns.push({u:+at.u.toFixed(2),v:+at.v.toFixed(2),m:+meters(fromGate(at)).toFixed(1)});if(spawns.length>200)spawns.shift();
   const g=f??Object.assign(new Fighter('revenant',meta.clips,at.u,at.v),{home:at,wander:null,age:0,side:1});if(!f)foes.push(g);
   Object.assign(g,{x:at.u,y:at.v,home:at,wander:null,age:0,hp:STATS.revenant.hp,deadFor:0,cooldown:600+random()*900});g.play('idle');
  }
 }
 // Ground speed in tiles; a step that would enter the safe zone, leave walkable snow or walk into a footprint
 // slides along it, veers around it or stops. Veering takes the shallowest free turn, first to the side it last
 // turned to, and when pressed against a footprint steps partly back off it (footprints are widened across the
 // screen more than up and down, so a square turn still grazes them): the revenant follows the edge round a
 // trunk instead of dithering at it. One already overlapping a footprint may walk out. False when stopped.
 function move(f:Foe,du:number,dv:number,dt:number){
  const len=Math.hypot(du,dv);if(len<1e-6)return false;const v=ENEMY_SPEED*dt/1000,dx=du/len*v,dy=dv/len*v,stuck=!walkable(tileOf(f));
  const veer=(a:number)=>[dx*Math.cos(a)-dy*Math.sin(a),dx*Math.sin(a)+dy*Math.cos(a),Math.sign(a)];
  // A slide along one axis only counts when it covers real ground; head-on, it barely moves and stalled the chase.
  for(const [mx,my,side=0] of [[dx,dy],[dx,0],[0,dy],...[1,-1].flatMap(t=>VEER.map(a=>veer(a*t*f.side)))]){
   const next={u:f.x+mx,v:f.y+my};if(Math.hypot(mx,my)<v*.4||inSafeZone(next)||!stuck&&!walkable(next))continue;if(side)f.side=side;
   f.x=next.u;f.y=next.v;const m=screen(mx,my);turn(f,m.x,m.y);f.stride+=Math.hypot(m.x,m.y)/ENEMY_STRIDE;f.play('move');return true;}
  const s=screen(du,dv);turn(f,s.x,s.y);f.play('idle');return false;
 }
 function nearest(range:number){let best:Foe|null=null,d=range;for(const f of foes){const v=Math.hypot(f.x-h.x,f.y-h.y);if(f.alive&&v<=d){d=v;best=f;}}return best;}
 // The hero, when nobody steers: swing at a revenant in reach, or step in toward one a few paces away.
 function steer(input:Walk):Walk{
  if(run.pending)return {x:0,y:0};
  if(online||input.x||input.y||!h.alive||h.state!=='idle')return input;
  const r=reach(run),f=nearest(Math.max(ENGAGE,HERO_REACH*r+.8));if(!f||Math.hypot(f.x-h.x,f.y-h.y)<=HERO_REACH*r*.8)return input;
  const s=screen(f.x-h.x,f.y-h.y),l=Math.hypot(s.x,s.y);return {x:s.x/l,y:s.y/l};
 }
 function heroStep(dt:number,steering:boolean){
  if(!h.alive){h.deadFor+=dt;if(h.deadFor>HERO_RESPAWN){o.hero.respawn();const p=o.hero.position(),t=toTile(p.x,p.y);Object.assign(h,{x:t.u,y:t.v,hp:maxHp});h.play('idle');}return;}
  h.recover();
  if(run.pending){h.immune=200;return;}
  if(h.state==='attack'){
   if(h.impact()){
    swingCount++;
    const angle=facingScreenAngle(h);
    let anyCrit=false;
    for(const f of swingTargets(h,foes,HERO_REACH*reach(run),SIDE)){
     const res=vfx.applyHitToFoe(f,{angle});
     if(res.crit)anyCrit=true;
    }
    vfx.spawnSlash(h.x,h.y,angle,anyCrit);
    // Weave hero signature projectile on every 3rd swing when foes are still active
    if(swingCount%3===0&&!run.pending){
     const hid=currentHeroId();
     vfx.castSkill(hid==='ember-warden'?'flame-fan':'rift-bolt');
    }
   }
   return;
  }
  if(h.state==='hit')return;
  if(!steering){const f=nearest(HERO_REACH*reach(run));if(f){const s=screen(f.x-h.x,f.y-h.y);turn(h,s.x,s.y);o.hero.face(s.x,s.y);h.play('attack');return;}}
  if(inSafeZone(tileOf(h))&&h.hp<maxHp){
   const before=h.hp;h.hp=Math.min(maxHp,h.hp+REGEN*dt/1000);
   regenAccum+=h.hp-before;
   if(regenAccum>=4||(h.hp>=maxHp&&regenAccum>=1)){
    vfx.recordHeroHeal(Math.round(regenAccum),h.x,h.y);
    regenAccum=0;
   }
  }else regenAccum=0;
 }
 function foeStep(f:Foe,dt:number,heroSafe:boolean){
  f.age+=dt;
  if(!f.alive){f.deadFor+=dt;if(f.deadFor>CORPSE)spawn(f);return;}
  f.recover();if(f.state==='hit')return;
  const du=h.x-f.x,dv=h.y-f.y,dist=Math.hypot(du,dv);
  if(f.state==='attack'){
   if(f.impact()&&h.alive&&!heroSafe&&inReach(f,h,ENEMY_REACH+.25*SCALE,SIDE)){
    const before=h.hp;
    h.damage(STATS.revenant.damage);
    if(h.hp<before)vfx.recordHeroDamage(before-h.hp,h.x,h.y);
   }
   return;
  }
  if(h.alive&&!heroSafe&&dist<AGGRO){
   if(dist>ENEMY_REACH){move(f,du,dv,dt);return;}
   const s=screen(du,dv);turn(f,s.x,s.y);if(f.cooldown<=0){f.cooldown=1500+random()*1200;f.play('attack');}else f.play('idle');return;
  }
  // Wander around the spawn point, outside the zone.
  if(!f.wander||random()<.002){const a=random()*Math.PI*2,r=random()*5,w={u:f.home.u+Math.cos(a)*r,v:f.home.v+Math.sin(a)*r};f.wander=random()<.5&&!inSafeZone(w)&&walkable(w)?w:{u:f.x,v:f.y};}
  // A wander target behind an obstacle is given up for a new one.
  const wu=f.wander.u-f.x,wv=f.wander.v-f.y;if(Math.hypot(wu,wv)>.15){if(!move(f,wu,wv,dt))f.wander=null;}else f.play('idle');
 }
 // Revenants keep a body's width apart and off the hero; only revenants are pushed, never into the zone.
 function separate(){
  const list=foes.filter(f=>f.alive);
  for(const a of list){for(const b of [...list,h]){if(a===b)continue;const dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);if(d>=SPACING||d<1e-6)continue;
   const push=(SPACING-d)*(b===h?1:.5),next={u:a.x+dx/d*push,v:a.y+dy/d*push};if(!inSafeZone(next)&&walkable(next)){a.x=next.u;a.y=next.v;}}}
 }
 // Co-op: revenants at the interpolated server snapshot, keyed by server id. A clip the server (re)starts (its
 // play counter changed) replays from its first frame here; a respawn (new generation) fades in again.
 type Mirror=Foe&{gen:number;plays:number};const mirrors=new Map<number,Mirror>();
 function netStep(dt:number){
  const net=o.net!,me=net.me();
  if(me){
   const prevHp=h.hp,prevLevel=run.level;
   if(me.n!==heroPlays){
    heroPlays=me.n;h.state=me.st as Fighter['state'];h.t=0;
    if(me.st==='attack')vfx.spawnSlash(h.x,h.y,facingScreenAngle({facing:me.fc,back:me.bk,vertical:me.vt}),false);
   }
   if(me.hp<prevHp-.05){h.flash=120;vfx.recordHeroDamage(prevHp-me.hp,h.x,h.y);}
   else if(me.hp>prevHp+.5&&prevHp>0){vfx.recordHeroHeal(me.hp-prevHp,h.x,h.y);}
   Object.assign(h,{hp:me.hp,facing:me.fc,back:me.bk,vertical:me.vt});maxHp=me.max;kills=me.k;run=me.run??fresh();
   if(run.level>prevLevel){levelUpPulseMs=1200;vfx.triggerLevelUp(run.level,h.x,h.y);}
   const p=o.hero.position(),t=toTile(p.x,p.y);h.x=t.u;h.y=t.v;h.tick(dt);
  }
  const seen=new Set<number>();
  for(const e of net.enemies(frameAt)){
   seen.add(e.id);let f=mirrors.get(e.id);
   if(!f){f=Object.assign(new Fighter('revenant',meta.clips,e.u,e.v),{home:{u:e.u,v:e.v},wander:null,age:0,side:1,gen:e.g,plays:-1});mirrors.set(e.id,f);}
   if(f.gen!==e.g){Object.assign(f,{gen:e.g,age:0,deadFor:0,x:e.u,y:e.v,hp:e.hp});}
   const m=screen(e.u-f.x,e.v-f.y);f.stride+=Math.hypot(m.x,m.y)/ENEMY_STRIDE;
   Object.assign(f,{x:e.u,y:e.v,facing:e.fc,back:e.bk,vertical:e.vt});
   if(e.n!==f.plays){f.plays=e.n;f.state=e.st as Fighter['state'];f.t=0;}
   if(e.hp<f.hp){f.flash=120;vfx.recordCoopEnemyDamage(f,f.hp-e.hp);}
   f.hp=e.hp;
   f.tick(dt);f.age+=dt;if(!f.alive)f.deadFor+=dt;
  }
  for(const id of mirrors.keys())if(!seen.has(id))mirrors.delete(id);
  foes=[...mirrors.values()];
 }
 function step(dt:number){
  levelUpPulseMs=Math.max(0,levelUpPulseMs-dt);
  vfx.step(dt);
  // Joining a room drops the local revenants; leaving it (offline) starts a fresh local fight where the hero stands.
  const net=!!o.net?.active();
  if(net!==online){run=fresh();online=net;mirrors.clear();local.length=0;foes=local;spawnTimer=0;heroPlays=-1;if(!net){h.play('idle');h.hp=maxHp;}}
  if(online){netStep(dt);return;}
  const input=o.direction(),steering=!!(input.x||input.y);
  for(const f of [h,...foes])f.tick(dt);
  if(h.alive&&h.state==='idle'){const p=o.hero.position(),t=toTile(p.x,p.y);h.x=t.u;h.y=t.v;}
  heroStep(dt,steering);
  const heroSafe=inSafeZone(tileOf(h));
  for(const f of foes)foeStep(f,dt,heroSafe);
  separate();
  spawnTimer-=dt;if(spawnTimer<=0&&foes.length<MAX_ENEMIES){spawnTimer=SPAWN_EVERY;spawn();}
 }
 // One revenant frame at atlas resolution, tinted by the ambient light and the red hit flash.
 const cell=document.createElement('canvas');cell.width=meta.cell.w;cell.height=meta.cell.h;
 const cc=cell.getContext('2d')!,pivot=meta.cell.pivot;
 function paintCell(f:Foe){
  const fr=meta.frames[f.clip.frames[f.frame()]];cc.globalCompositeOperation='copy';cc.drawImage(atlas,fr.x,fr.y,fr.w,fr.h,0,0,cell.width,cell.height);
  if(ambient!=='255,255,255'){cc.globalCompositeOperation='multiply';cc.fillStyle=`rgb(${ambient})`;cc.fillRect(0,0,cell.width,cell.height);cc.globalCompositeOperation='destination-in';cc.drawImage(atlas,fr.x,fr.y,fr.w,fr.h,0,0,cell.width,cell.height);}
  if(f.flash>0){cc.globalCompositeOperation='source-atop';cc.fillStyle='rgba(255,140,110,.55)';cc.fillRect(0,0,cell.width,cell.height);}
  cc.globalCompositeOperation='source-over';
  return fr;
 }
 // Each revenant is its own small canvas around its foot (sun shadow, sprite, then the uprights in front of it
 // cut out), moved by the compositor like the heroes. It is composed again only when its look changes (frame,
 // facing, light, hit flash, sun, zoom or what stands in front of it), not every frame: two full-screen layers
 // cleared and redrawn every frame used half the frame time of a phone in a co-op room full of revenants.
 type View={el:HTMLCanvasElement;g:CanvasRenderingContext2D;bar:HTMLElement;fill:HTMLElement;look:string;size:string;at:string;alpha:string;hp:string};
 const views=new Map<Foe,View>();
 function view(f:Foe){
  let v=views.get(f);if(v)return v;
  const el=document.createElement('canvas'),bar=document.createElement('div');el.className='foe';bar.className='foe-health';bar.hidden=true;bar.innerHTML='<i></i>';bars.append(bar);
  el.style.cssText='position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform;pointer-events:none';
  v={el,g:el.getContext('2d')!,bar,fill:bar.querySelector('i')!,look:'',size:'',at:'',alpha:'',hp:''};views.set(f,v);return v;
 }
 function paint(f:Foe,target:HTMLCanvasElement,box:number[],s:Sun,r:number){
  const wpx=Math.ceil((box[2]-box[0])*r),hpx=Math.ceil((box[3]-box[1])*r),fg=target.getContext('2d')!;if(target.width!==wpx||target.height!==hpx){target.width=wpx;target.height=hpx;}
  const dir=f.vertical?1:f.facing,local=()=>fg.setTransform(r,0,0,r,-box[0]*r,-box[1]*r),sprite=(src:HTMLCanvasElement)=>{fg.scale(dir*DISPLAY,DISPLAY);fg.drawImage(src,-pivot.x,-pivot.y);};
  fg.setTransform(1,0,0,1,0,0);fg.clearRect(0,0,wpx,hpx);const fr=paintCell(f);local();
  drawFigureShadow(fg,atlas,fr,meta.cell,s,dir);
  fg.save();sprite(cell);fg.restore();return fg;
 }
 // Revenants share one atlas, so a pack walking or waiting together shows the same few pictures: those are kept
 // (the most recently used 48, about 7 MB at phone resolution) and a revenant in the open copies one in. A
 // revenant behind an upright is composed on its own, with that upright cut out where it stands.
 const looks=new Map<string,HTMLCanvasElement>(),LOOKS=48;
 function compose(f:Foe,v:View,px:number,py:number,box:number[],s:Sun,r:number,hidden:Placed[],look:string){
  if(hidden.length){cutOut(paint(f,v.el,box,s,r),hidden,px,py);return;}
  let c=looks.get(look);
  if(c){looks.delete(look);looks.set(look,c);}
  else{const oldest=looks.size>=LOOKS?looks.keys().next().value:undefined;if(oldest!==undefined){c=looks.get(oldest)!;looks.delete(oldest);}else c=document.createElement('canvas');paint(f,c,box,s,r);looks.set(look,c);}
  if(v.el.width!==c.width||v.el.height!==c.height){v.el.width=c.width;v.el.height=c.height;}
  v.g.globalCompositeOperation='copy';v.g.setTransform(1,0,0,1,0,0);v.g.drawImage(c,0,0);v.g.globalCompositeOperation='source-over';
 }
 // Compared with what was last written: a style reads back normalized.
 const written=new Map<object,Record<string,string>>();
 const put=(target:Record<string,any>,key:string,value:string)=>{let w=written.get(target);if(!w)written.set(target,w={});if(w[key]!==value){w[key]=value;target[key]=value;}};
 const set=(v:View,k:'size'|'at'|'alpha'|'hp',value:string,apply:()=>void)=>{if(v[k]!==value){v[k]=value;apply();}};
 // Children of a layer in this order; anything else (hidden revenants) moves behind them.
 function arrange(layer:HTMLElement,list:HTMLElement[]){list.forEach((el,i)=>{if(layer.children[i]!==el)layer.insertBefore(el,layer.children[i]??null);});}
 function render(){
  drawProgress();
  syncSkillBar();
  const dpr=Math.min(devicePixelRatio||1,2),hp=o.hero.position(),k=origin.scale,at=(x:number,y:number)=>({x:origin.x+x*k,y:origin.y+y*k});
  const shown=foes.filter(f=>{if(f.deadFor>CORPSE-500&&!f.alive)return false;const w=tilePoint(f.x,f.y),s=at(w.x,w.y);return s.x>-80&&s.x<innerWidth+80&&s.y>-40&&s.y<innerHeight+120;});
  const layers={back:[] as HTMLElement[],front:[] as HTMLElement[]},live=new Set<Foe>();
  if(shown.length){
   // Local bounds around the foot: the mirrored sprite cell plus the foot-anchored sun-cast silhouette, as in hero.ts.
   const sun=o.hero.sun(),r=k*dpr,half=Math.max(pivot.x,meta.cell.w-pivot.x)*DISPLAY,top=-pivot.y*DISPLAY,H0=-top,bottom=(meta.cell.h-pivot.y)*DISPLAY+8;
   const ends=[-half,half].flatMap(w=>[0,H0].flatMap(h=>[[w+h*sun.dx,h*sun.dy],[w*sun.wx+h*sun.dx,w*sun.wy+h*sun.dy]])),sxs=[-half,half,...ends.map(e=>e[0])],sys=[top,bottom,...ends.map(e=>e[1]-8),...ends.map(e=>e[1]+8)];
   const box=[Math.floor(Math.min(...sxs))-4,Math.floor(Math.min(...sys))-4,Math.ceil(Math.max(...sxs))+4,Math.ceil(Math.max(...sys))+4];
   const light=[ambient,sun.alpha,sun.dx,sun.dy,sun.wx,sun.wy,r,box].join();
   for(const f of shown.sort((a,b)=>tilePoint(a.x,a.y).y-tilePoint(b.x,b.y).y)){
    const w=tilePoint(f.x,f.y),s=at(w.x,w.y),shk=vfx.shakeOffset(f);
    const alpha=Math.min(1,f.age/500)*(f.alive?1:Math.max(0,1-(f.deadFor-3500)/900));if(alpha<=0)continue;
    const v=view(f),hidden=o.hero.occluders(w.x,w.y,box);live.add(f);(w.y<hp.y?layers.back:layers.front).push(v.el);
    // Uprights in front cut the figure where it stands, so only then does its position change the picture.
    const look=[f.clip.frames[f.frame()],f.vertical?0:f.facing,f.flash>0,light,hidden.length?hidden.map(p=>p.x+':'+p.y).join()+'@'+w.x.toFixed(1)+','+w.y.toFixed(1):''].join('|');
    if(look!==v.look){v.look=look;compose(f,v,w.x,w.y,box,sun,r,hidden,look);}
    set(v,'size',v.el.width+'x'+v.el.height+'@'+dpr,()=>{v.el.style.width=v.el.width/dpr+'px';v.el.style.height=v.el.height/dpr+'px';});
    set(v,'at',`translate3d(${s.x+box[0]*k+shk.dx}px,${s.y+box[1]*k+shk.dy}px,0)`,()=>{v.el.style.transform=v.at;v.el.dataset.x=w.x.toFixed(2);v.el.dataset.y=w.y.toFixed(2);});
    set(v,'alpha',alpha.toFixed(2),()=>{v.el.style.opacity=v.alpha;});
    // A small health bar over each wounded revenant.
    const wounded=f.alive&&f.hp<STATS.revenant.hp;
    set(v,'hp',wounded?`translate3d(${s.x-13+shk.dx}px,${s.y-62*k-1+shk.dy}px,0)|${f.hp/STATS.revenant.hp}`:'',()=>{v.bar.hidden=!wounded;if(wounded){v.bar.style.transform=`translate3d(${s.x-13+shk.dx}px,${s.y-62*k-1+shk.dy}px,0)`;v.fill.style.transform=`scaleX(${f.hp/STATS.revenant.hp})`;}});
   }
  }
  arrange(back,layers.back);arrange(front,layers.front);
  // Off screen or gone: hidden, and dropped once the revenant no longer exists (a co-op mirror that left).
  for(const [f,v] of views){if(live.has(f))continue;if(foes.includes(f)){if(!v.el.hidden){v.el.hidden=true;v.bar.hidden=true;v.hp='';}}else{v.el.remove();v.bar.remove();views.delete(f);}}
  for(const f of live){const v=views.get(f)!;if(v.el.hidden)v.el.hidden=false;}
  vfx.render();
  // Hero bar and ground AoE reach indicator: hidden at full health inside the zone (unless reach is upgraded), shown once hurt or out in the wilds.
  const s=at(hp.x,hp.y),ratio=Math.max(0,h.hp)/maxHp,inZone=inSafeZone(tileOf(h)),show=h.alive&&(ratio<.999||!inZone||run.xp>0||run.level>1);
  const rMult=reach(run),aoeRx=Math.round(HERO_REACH*rMult*64*Math.SQRT2),aoeRy=Math.round(aoeRx*.52),aoePadX=aoeRx+6,aoePadY=aoeRy+6,showAoe=h.alive&&(!inZone||rMult>1.001);
  if(aoe.hidden===showAoe)aoe.hidden=!showAoe;
  if(showAoe){
   const aoeKey=`${rMult.toFixed(2)}:${dpr}:${h.state==='attack'?1:0}`;
   if(aoe.dataset.key!==aoeKey){
    aoe.dataset.key=aoeKey;aoe.dataset.reach=rMult.toFixed(2);aoe.dataset.radiusPx=String(aoeRx);
    const wpx=aoePadX*2,hpx=aoePadY*2;aoe.width=Math.ceil(wpx*dpr);aoe.height=Math.ceil(hpx*dpr);aoe.style.width=wpx+'px';aoe.style.height=hpx+'px';
    aoeCtx.setTransform(dpr,0,0,dpr,aoePadX*dpr,aoePadY*dpr);aoeCtx.clearRect(-aoePadX,-aoePadY,wpx,hpx);
    aoeCtx.save();aoeCtx.scale(1,.52);
    const pulse=h.state==='attack'?.05:0,g=aoeCtx.createRadialGradient(0,0,4,0,0,aoeRx);
    g.addColorStop(0,`rgba(255,208,138,${(.22+pulse).toFixed(2)})`);
    g.addColorStop(.68,`rgba(255,180,104,${(.11+pulse*.5).toFixed(2)})`);
    g.addColorStop(1,'rgba(242,196,107,0)');
    aoeCtx.fillStyle=g;aoeCtx.beginPath();aoeCtx.arc(0,0,aoeRx,0,Math.PI*2);aoeCtx.fill();
    aoeCtx.strokeStyle=`rgba(242,196,107,${((rMult>1.001?.38:.24)+pulse).toFixed(2)})`;
    aoeCtx.lineWidth=rMult>1.001?1.75:1.2;
    aoeCtx.beginPath();aoeCtx.arc(0,0,aoeRx-1,0,Math.PI*2);aoeCtx.stroke();
    aoeCtx.restore();
   }
   put(aoe.style,'transform',`translate3d(${s.x-aoePadX*k}px,${s.y-2*k-aoePadY*k}px,0) scale(${k})`);
  }
  put(bar.style,'transform',`translate3d(${s.x}px,${s.y-64*k}px,0)`);put(bar.dataset,'visible',String(show));put(barFill.style,'transform',`scaleX(${ratio})`);put(bar.dataset,'low',String(ratio<.3));
  put(hudFill.style,'transform',`scaleX(${ratio})`);put(hud.dataset,'low',String(ratio<.3));
  const text=`${Math.ceil(h.hp)} / ${maxHp}`;if(q('.hud-hp').textContent!==text){q('.hud-hp').textContent=text;q('.hud-bar').setAttribute('aria-valuenow',String(Math.ceil(h.hp)));q('.hud-bar').setAttribute('aria-valuemax',String(maxHp));}
  const zone=!h.alive?'Defeated · returning to the tent':inZone?'Safe zone':'Wilds · revenants roam';
  if(q('.hud-zone').textContent!==zone)q('.hud-zone').textContent=zone;put(hud.dataset,'zone',inZone?'safe':'wild');
  const k2=`Revenants defeated · ${kills}`;if(q('.hud-kills').textContent!==k2)q('.hud-kills').textContent=k2;
  for(const [key,value] of Object.entries({hp:String(Math.ceil(h.hp)),max:String(maxHp),state:h.state,kills:String(kills),foes:String(foes.filter(f=>f.alive).length),reach:rMult.toFixed(2)}))put(hud.dataset,key,value);
 }
 let last=0;
 // Co-op revenants are sampled at the frame's timestamp, not whenever this callback happens to run.
 let frameAt=performance.now();
 const loop=(now:number)=>{let dt=last?Math.min(now-last,120):16;last=now;frameAt=now;for(;dt>0;dt-=34)step(Math.min(dt,34));render();requestAnimationFrame(loop);};
 const api={
  steer,
  reach:()=>reach(run),
  // While swinging, stunned or down, the hero plays that clip in place of walking.
  pose:():Pose|null=>h.state==='idle'||h.state==='move'?null:{clip:h.state,t:h.t},
  place(x:number,y:number,scale:number){origin={x,y,scale};vfx.place(x,y,scale);render();},
  // Started after the hero's loop (world-view.ts), so each frame draws with the camera the hero just moved.
  start(){requestAnimationFrame(loop);},
  setAmbient(rgb:readonly number[]){ambient=rgb.map(v=>Math.round(v*255)).join();},
  setMaxHp(n:number){baseHp=n;if(online)return;n+=health(run);if(n===maxHp)return;h.hp=Math.min(n,h.hp+Math.max(0,n-maxHp));maxHp=n;},
  snapshot:()=>({spawnDistanceM:SPAWN_DISTANCE_M,gate:GATE,metersPerTile:METERS_PER_TILE,
   hero:{hp:h.hp,maxHp,state:h.state,u:+h.x.toFixed(2),v:+h.y.toFixed(2),meters:+meters(fromCenter(tileOf(h))).toFixed(1),safe:inSafeZone(tileOf(h)),reach:+reach(run).toFixed(2),aoeRadiusPx:Math.round(HERO_REACH*reach(run)*64*Math.SQRT2),critChance:+critChance(run).toFixed(2),critMultiplier:+critMultiplier(run).toFixed(2)},
   foes:foes.map(f=>({u:+f.x.toFixed(2),v:+f.y.toFixed(2),hp:f.hp,state:f.state,safe:inSafeZone(tileOf(f)),clear:walkable(tileOf(f)),gateMeters:+meters(fromGate(tileOf(f))).toFixed(1)})),
   run:structuredClone(run),
   reach:+reach(run).toFixed(2),
   scale:+origin.scale.toFixed(4),
   expBar:{level:run.level,xp:run.xp,nextXp:threshold(run),percent:xpPercent(run),pulsing:levelUpPulseMs>0},
   vfx:vfx.snapshot(),
   kills,spawns:[...spawns],minSpawnMeters:spawns.length?Math.min(...spawns.map(s=>s.m)):null,minFoeMeters:foes.length?Math.min(...foes.map(f=>meters(fromGate(tileOf(f))))):null}),
  // Testing hooks: stand the hero on a ground tile, summon revenants, and trigger skills / crits / projectiles / AoE / level-up VFX.
  teleport(u:number,v:number){const w=tilePoint(u,v);if(!o.hero.teleport(w.x,w.y))return false;h.x=u;h.y=v;return true;},
  clear:(u:number,v:number)=>walkable({u,v}),
  summon(u:number,v:number){const at={u,v};if(inSafeZone(at)||!walkable(at))return -1;const f:Foe=Object.assign(new Fighter('revenant',meta.clips,u,v),{home:at,wander:null,age:500,side:1});f.play('idle');return foes.push(f)-1;},
  offer(offers?:string[]){if(!online){if(run.pending<=0){run.level++;run.pending=1;}if(offers?.length)run.offers=[...offers];else if(!run.offers.length)roll(run,random);offerKey='';render();}return structuredClone(run);},
  choose:(id:string)=>{select(id);render();return structuredClone(run);},
  castSkill:(id:SkillId,opts?:{targetU?:number;targetV?:number;forceCrit?:boolean})=>vfx.castSkill(id,opts),
  spawnProjectile:vfx.spawnProjectile,
  spawnAoE:vfx.spawnAoE,
  triggerLevelUp:(level?:number)=>{const lv=level??run.level;levelUpPulseMs=1200;vfx.triggerLevelUp(lv,h.x,h.y);render();},
  hitFoe:(index:number,forceCrit?:boolean)=>{const f=foes[index];if(!f)return null;const r=vfx.applyHitToFoe(f,{forceCrit});render();return r;}
 };
 (window as any).__STRONGHOLD_COMBAT__=api;
 return api;
}
