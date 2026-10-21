import {unproject} from '../isometric';
import {Fighter,STATS,inReach,swingTargets,turn} from '../characters/combat';
import type {CharacterMeta} from '../characters/sprites';
import {COURT,tilePoint} from './terrain';
import {walkableGround} from './navigation';
import {SAFE_TILES,SAFE_RADIUS_M,METERS_PER_TILE,fromCenter,inSafeZone,spawnPoint,meters,type Tile} from './safe-zone';
import {DISPLAY,type Pose} from './hero';
import type {Walk} from './controls';
// Revenants roaming the snow beyond the safe zone, the hero's hit points and their auto attack. The fight runs on
// the arena's rules (combat.ts): the same hit points, damage, reach, hit stun and swing timing, with the reach
// scaled to the Stronghold's smaller figures. Positions are ground tiles from the court origin, as in terrain.ts tilePoint().
// Revenants only ever spawn outside 100 m of the tent (safe-zone.ts) and never set foot inside it: a chase stops
// at the boundary, and once the hero is back inside they lose interest and wander off; the hero heals there.
const SCALE=DISPLAY/1.1; // the arena draws characters at 1.1x on tiles of the same size
const HERO_REACH=STATS.hero.reach*SCALE,ENEMY_REACH=STATS.revenant.reach*SCALE,SIDE=.35*SCALE,SPACING=.72*SCALE;
// Hero ground speed is 105 screen px/s along a 71.6 px tile edge (hero.ts); revenants walk at a bit over half of it,
// so the hero can always outrun a pack back to the safe zone.
const ENEMY_SPEED=105/Math.hypot(64,32)*.55,ENEMY_STRIDE=76*DISPLAY/1.1;
// Tiles: a revenant hunts the hero within AGGRO (packs spawn inside it, so they come straight for a hero in the wilds);
// the idle hero steps in to swing at one within ENGAGE. Packs of one to three surround the hero, and a swing only
// reaches the side it faces, so the ones behind land their blows.
const AGGRO=13,ENGAGE=2,MAX_ENEMIES=8,PACK=3,SPAWN_EVERY=2000,RECYCLE=30,REGEN=8,HERO_RESPAWN=3500,CORPSE=4400;
type Foe=Fighter&{home:Tile;wander:Tile|null;age:number};
type Hero={position():{x:number;y:number};face(sx:number,sy:number):void;respawn():void;teleport(x:number,y:number):boolean};
const toTile=(x:number,y:number):Tile=>{const g=unproject(x-COURT.x,y-COURT.y);return {u:g.x,v:g.y};};
const screen=(du:number,dv:number)=>({x:(du-dv)*64,y:(du+dv)*32});
const tileOf=(f:Fighter):Tile=>({u:f.x,v:f.y});
const walkable=(p:Tile)=>{const w=tilePoint(p.u,p.v);return walkableGround(w.x,w.y);};
export async function createEncounters(o:{layer:HTMLElement;hud:HTMLElement;hero:Hero;direction:()=>Walk}){
 const manifest=await (await fetch('/assets/characters/manifest.json')).json(),heroMeta:CharacterMeta=manifest.characters.hero,meta:CharacterMeta=manifest.characters.revenant;
 const atlas=new Image();atlas.src='/assets/characters/'+meta.image+(meta.revision?`?v=${encodeURIComponent(meta.revision)}`:'');await atlas.decode();
 let seed=(Date.now()>>>0)||1;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const start=o.hero.position(),h=new Fighter('hero',heroMeta.clips,toTile(start.x,start.y).u,toTile(start.x,start.y).v);
 let maxHp=STATS.hero.hp,kills=0,spawnTimer=0,ambient='255,255,255',origin={x:0,y:0,scale:1};
 const foes:Foe[]=[],spawns:{u:number;v:number;m:number}[]=[];
 // Revenants behind the hero draw under its canvas, the rest over it.
 const heroCanvas=o.layer.querySelector<HTMLCanvasElement>('#world-hero')!,back=document.createElement('canvas'),front=document.createElement('canvas');
 back.id='world-foes-back';front.id='world-foes-front';for(const c of [back,front])c.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none';
 heroCanvas.before(back);heroCanvas.after(front);
 // Health bar over the hero's head, moved by the compositor, and the HUD panel.
 const bar=document.createElement('div');bar.id='hero-health';bar.setAttribute('aria-hidden','true');bar.innerHTML='<i></i>';front.after(bar);
 const hud=document.createElement('section');hud.id='hero-hud';hud.setAttribute('aria-label','Hero status');
 hud.innerHTML='<div class="hud-row"><span class="hud-label">Health</span><span class="hud-hp">100 / 100</span></div><div class="hud-bar" role="meter" aria-label="Health" aria-valuemin="0"><i></i></div><div class="hud-zone"></div><div class="hud-kills">Revenants defeated · 0</div>';
 o.hud.append(hud);
 const q=<T extends Element>(s:string)=>hud.querySelector(s) as T,hudFill=q<HTMLElement>('.hud-bar i'),barFill=bar.querySelector('i')!;

 function spawn(f?:Foe){
  const p=spawnPoint(random,tileOf(h),walkable);if(!p)return;
  // A new pack, or one returning revenant.
  const n=f?1:Math.min(MAX_ENEMIES-foes.length,1+Math.floor(random()*PACK));
  for(let i=0;i<n;i++){
   const a=random()*Math.PI*2,r=i?.6+random()*.6:0,q={u:p.u+Math.cos(a)*r,v:p.v+Math.sin(a)*r},at=inSafeZone(q)||!walkable(q)?p:q;
   spawns.push({u:+at.u.toFixed(2),v:+at.v.toFixed(2),m:+meters(fromCenter(at)).toFixed(1)});if(spawns.length>200)spawns.shift();
   const g=f??Object.assign(new Fighter('revenant',meta.clips,at.u,at.v),{home:at,wander:null,age:0});if(!f)foes.push(g);
   Object.assign(g,{x:at.u,y:at.v,home:at,wander:null,age:0,hp:STATS.revenant.hp,deadFor:0,cooldown:600+random()*900});g.play('idle');
  }
 }
 // Ground speed in tiles; a step that would enter the safe zone or leave walkable snow slides along it or stops.
 function move(f:Foe,du:number,dv:number,dt:number){
  const len=Math.hypot(du,dv);if(len<1e-6)return;const v=ENEMY_SPEED*dt/1000,dx=du/len*v,dy=dv/len*v,s=screen(du,dv);turn(f,s.x,s.y);
  for(const [mx,my] of [[dx,dy],[dx,0],[0,dy]]){const next={u:f.x+mx,v:f.y+my};if(inSafeZone(next)||!walkable(next))continue;
   f.x=next.u;f.y=next.v;const m=screen(mx,my);f.stride+=Math.hypot(m.x,m.y)/ENEMY_STRIDE;f.play('move');return;}
  f.play('idle');
 }
 function nearest(range:number){let best:Foe|null=null,d=range;for(const f of foes){const v=Math.hypot(f.x-h.x,f.y-h.y);if(f.alive&&v<=d){d=v;best=f;}}return best;}
 // The hero, when nobody steers: swing at a revenant in reach, or step in toward one a few paces away.
 function steer(input:Walk):Walk{
  if(input.x||input.y||!h.alive||h.state!=='idle')return input;
  const f=nearest(ENGAGE);if(!f||Math.hypot(f.x-h.x,f.y-h.y)<=HERO_REACH*.8)return input;
  const s=screen(f.x-h.x,f.y-h.y),l=Math.hypot(s.x,s.y);return {x:s.x/l,y:s.y/l};
 }
 function heroStep(dt:number,steering:boolean){
  if(!h.alive){h.deadFor+=dt;if(h.deadFor>HERO_RESPAWN){o.hero.respawn();const p=o.hero.position(),t=toTile(p.x,p.y);Object.assign(h,{x:t.u,y:t.v,hp:maxHp});h.play('idle');}return;}
  h.recover();
  if(h.state==='attack'){if(h.impact())for(const f of swingTargets(h,foes,HERO_REACH,SIDE))if(f.damage(STATS.hero.damage))kills++;return;}
  if(h.state==='hit')return;
  if(!steering){const f=nearest(HERO_REACH);if(f){const s=screen(f.x-h.x,f.y-h.y);turn(h,s.x,s.y);o.hero.face(s.x,s.y);h.play('attack');return;}}
  if(inSafeZone(tileOf(h)))h.hp=Math.min(maxHp,h.hp+REGEN*dt/1000);
 }
 function foeStep(f:Foe,dt:number,heroSafe:boolean){
  f.age+=dt;
  if(!f.alive){f.deadFor+=dt;if(f.deadFor>CORPSE)spawn(f);return;}
  f.recover();if(f.state==='hit')return;
  const du=h.x-f.x,dv=h.y-f.y,dist=Math.hypot(du,dv);
  if(f.state==='attack'){if(f.impact()&&h.alive&&!heroSafe&&inReach(f,h,ENEMY_REACH+.25*SCALE,SIDE))h.damage(STATS.revenant.damage);return;}
  // Far from a hero out in the wilds: come back as a fresh revenant near them.
  if(!heroSafe&&dist>RECYCLE){spawn(f);return;}
  if(h.alive&&!heroSafe&&dist<AGGRO){
   if(dist>ENEMY_REACH){move(f,du,dv,dt);return;}
   const s=screen(du,dv);turn(f,s.x,s.y);if(f.cooldown<=0){f.cooldown=1500+random()*1200;f.play('attack');}else f.play('idle');return;
  }
  // Wander around the spawn point, outside the zone.
  if(!f.wander||random()<.002){const a=random()*Math.PI*2,r=random()*5,w={u:f.home.u+Math.cos(a)*r,v:f.home.v+Math.sin(a)*r};f.wander=random()<.5&&!inSafeZone(w)&&walkable(w)?w:{u:f.x,v:f.y};}
  const wu=f.wander.u-f.x,wv=f.wander.v-f.y;if(Math.hypot(wu,wv)>.15)move(f,wu,wv,dt);else f.play('idle');
 }
 // Revenants keep a body's width apart and off the hero; only revenants are pushed, never into the zone.
 function separate(){
  const list=foes.filter(f=>f.alive);
  for(const a of list){for(const b of [...list,h]){if(a===b)continue;const dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);if(d>=SPACING||d<1e-6)continue;
   const push=(SPACING-d)*(b===h?1:.5),next={u:a.x+dx/d*push,v:a.y+dy/d*push};if(!inSafeZone(next)&&walkable(next)){a.x=next.u;a.y=next.v;}}}
 }
 function step(dt:number){
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
 const cell=document.createElement('canvas');cell.width=meta.cell.w;cell.height=meta.cell.h;const cc=cell.getContext('2d')!;
 function paintCell(f:Foe){
  const fr=meta.frames[f.clip.frames[f.frame()]];cc.globalCompositeOperation='copy';cc.drawImage(atlas,fr.x,fr.y,fr.w,fr.h,0,0,cell.width,cell.height);
  if(ambient!=='255,255,255'){cc.globalCompositeOperation='multiply';cc.fillStyle=`rgb(${ambient})`;cc.fillRect(0,0,cell.width,cell.height);cc.globalCompositeOperation='destination-in';cc.drawImage(atlas,fr.x,fr.y,fr.w,fr.h,0,0,cell.width,cell.height);}
  if(f.flash>0){cc.globalCompositeOperation='source-atop';cc.fillStyle='rgba(255,140,110,.55)';cc.fillRect(0,0,cell.width,cell.height);}
  cc.globalCompositeOperation='source-over';
 }
 let painted=false;
 function render(){
  const dpr=Math.min(devicePixelRatio||1,2),W=Math.round(innerWidth*dpr),H=Math.round(innerHeight*dpr);
  for(const c of [back,front])if(c.width!==W||c.height!==H){c.width=W;c.height=H;painted=true;}
  const hp=o.hero.position(),k=origin.scale,at=(x:number,y:number)=>({x:origin.x+x*k,y:origin.y+y*k});
  const shown=foes.filter(f=>{if(f.deadFor>CORPSE-500&&!f.alive)return false;const w=tilePoint(f.x,f.y),s=at(w.x,w.y);return s.x>-80&&s.x<innerWidth+80&&s.y>-40&&s.y<innerHeight+120;});
  if(shown.length||painted){
   for(const c of [back,front]){const g=c.getContext('2d')!;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);}
   for(const f of shown.sort((a,b)=>tilePoint(a.x,a.y).y-tilePoint(b.x,b.y).y)){
    const w=tilePoint(f.x,f.y),s=at(w.x,w.y),g=(w.y<hp.y?back:front).getContext('2d')!;
    const alpha=Math.min(1,f.age/500)*(f.alive?1:Math.max(0,1-(f.deadFor-3500)/900));if(alpha<=0)continue;
    g.setTransform(dpr,0,0,dpr,0,0);g.globalAlpha=alpha;
    g.fillStyle='rgba(5,6,8,.32)';g.beginPath();g.ellipse(s.x,s.y,12*k,6*k,0,0,Math.PI*2);g.fill();
    paintCell(f);g.save();g.translate(s.x,s.y);g.scale((f.vertical?1:f.facing)*DISPLAY*k,DISPLAY*k);g.drawImage(cell,-meta.cell.pivot.x,-meta.cell.pivot.y);g.restore();
    // A small health bar over each wounded revenant.
    if(f.alive&&f.hp<STATS.revenant.hp){const bw=24,by=s.y-62*k;g.fillStyle='#120c0ccc';g.fillRect(s.x-bw/2-1,by-1,bw+2,5);g.fillStyle='#d9534f';g.fillRect(s.x-bw/2,by,bw*f.hp/STATS.revenant.hp,3);}
    g.globalAlpha=1;
   }
   painted=shown.length>0;
  }
  // Hero bar: hidden at full health inside the zone, shown once hurt or out in the wilds.
  const s=at(hp.x,hp.y),ratio=Math.max(0,h.hp)/maxHp,show=h.alive&&(ratio<.999||!inSafeZone(tileOf(h)));
  bar.style.transform=`translate3d(${s.x}px,${s.y-64*k}px,0)`;bar.dataset.visible=String(show);barFill.style.transform=`scaleX(${ratio})`;bar.dataset.low=String(ratio<.3);
  hudFill.style.transform=`scaleX(${ratio})`;hud.dataset.low=String(ratio<.3);
  const text=`${Math.ceil(h.hp)} / ${maxHp}`;if(q('.hud-hp').textContent!==text){q('.hud-hp').textContent=text;q('.hud-bar').setAttribute('aria-valuenow',String(Math.ceil(h.hp)));q('.hud-bar').setAttribute('aria-valuemax',String(maxHp));}
  const m=Math.round(meters(fromCenter(tileOf(h)))),zone=!h.alive?'Defeated · returning to the tent':inSafeZone(tileOf(h))?`Safe zone · ${m} m from the tent`:`Wilds · ${m} m from the tent · revenants roam`;
  if(q('.hud-zone').textContent!==zone)q('.hud-zone').textContent=zone;hud.dataset.zone=inSafeZone(tileOf(h))?'safe':'wild';
  const k2=`Revenants defeated · ${kills}`;if(q('.hud-kills').textContent!==k2)q('.hud-kills').textContent=k2;
  Object.assign(hud.dataset,{hp:String(Math.ceil(h.hp)),max:String(maxHp),state:h.state,kills:String(kills),foes:String(foes.filter(f=>f.alive).length)});
 }
 let last=0;
 const loop=(now:number)=>{let dt=last?Math.min(now-last,120):16;last=now;for(;dt>0;dt-=34)step(Math.min(dt,34));render();requestAnimationFrame(loop);};
 requestAnimationFrame(loop);
 const api={
  steer,
  // While swinging, stunned or down, the hero plays that clip in place of walking.
  pose:():Pose|null=>h.state==='idle'||h.state==='move'?null:{clip:h.state,t:h.t},
  place(x:number,y:number,scale:number){origin={x,y,scale};},
  setAmbient(rgb:readonly number[]){ambient=rgb.map(v=>Math.round(v*255)).join();},
  setMaxHp(n:number){if(n===maxHp)return;h.hp=Math.min(n,h.hp+Math.max(0,n-maxHp));maxHp=n;},
  snapshot:()=>({safeRadiusM:SAFE_RADIUS_M,metersPerTile:METERS_PER_TILE,safeTiles:SAFE_TILES,
   hero:{hp:h.hp,maxHp,state:h.state,u:+h.x.toFixed(2),v:+h.y.toFixed(2),meters:+meters(fromCenter(tileOf(h))).toFixed(1),safe:inSafeZone(tileOf(h))},
   foes:foes.map(f=>({u:+f.x.toFixed(2),v:+f.y.toFixed(2),hp:f.hp,state:f.state,meters:+meters(fromCenter(tileOf(f))).toFixed(1)})),
   kills,spawns:[...spawns],minSpawnMeters:spawns.length?Math.min(...spawns.map(s=>s.m)):null,minFoeMeters:foes.length?Math.min(...foes.map(f=>meters(fromCenter(tileOf(f))))):null}),
  // Testing hook: stand the hero on a ground tile.
  teleport(u:number,v:number){const w=tilePoint(u,v);if(!o.hero.teleport(w.x,w.y))return false;h.x=u;h.y=v;return true;}
 };
 (window as any).__STRONGHOLD_COMBAT__=api;
 return api;
}
