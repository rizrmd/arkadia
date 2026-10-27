import {KEY,fresh,load} from './economy';
import {cards,HERO_ACTIVE_POOL} from './progression';
import type {HeroId} from './heroes';
export const GAMEPLAY_LOCK='arkodia.gameplay.owner.v1';
export const GAMEPLAY_ERROR='Gameplay could not be saved. Play is paused; free browser storage and reload. Your original save is retained.';
export type GameplayRecord={version:1;revision:number;hero:HeroId;state:any};
type Store=Pick<Storage,'getItem'|'setItem'>;
// This lock spans the playable page, including synchronous pagehide saves. Other tabs
// wait before creating a hero or writing position. Economy operations keep their own lock.
let ownsEconomy=false;
export function withEconomyLock<T>(fn:()=>T):Promise<T>{
 if(ownsEconomy)return Promise.resolve(fn());
 if(!navigator.locks)return Promise.reject(Error('This browser needs Web Locks for safe resource transactions.'));
 return navigator.locks.request(KEY,fn);
}
export async function ownGameplay(){
 if(!navigator.locks)throw Error('This browser needs Web Locks to safely resume gameplay.');
 await new Promise<void>((resolve,reject)=>{
  navigator.locks.request(GAMEPLAY_LOCK,()=>navigator.locks.request(KEY,async()=>{
   let release!:()=>void;const held=new Promise<void>(r=>release=r);
   ownsEconomy=true;addEventListener('pagehide',()=>release(),{once:true});resolve();await held;ownsEconomy=false;
  })).catch(reject);
 });
 addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
}
function finiteTree(value:any,depth=0):boolean{
 if(depth>20)return false;
 if(typeof value==='number')return Number.isFinite(value)&&Math.abs(value)<1e15;
 if(value===undefined||value===null||typeof value==='boolean')return true;
 if(typeof value==='string')return value.length<10000;
 if(Array.isArray(value))return value.length<=100000&&value.every(v=>finiteTree(v,depth+1));
 return typeof value==='object'&&Object.keys(value).length<300&&Object.entries(value).every(([k,v])=>!['__proto__','constructor','prototype'].includes(k)&&finiteTree(v,depth+1));
}
export function validateGameplay(record:any,hero:HeroId):asserts record is GameplayRecord{
 const s=record?.state,p=s?.run;
 const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
 const fighter=(f:any)=>f&&['idle','move','attack','hit','die'].includes(f.state)&&['t','facing','stride','hp','cooldown','flash','deadFor','immune','x','y'].every(k=>number(f[k]))&&['back','vertical','impactDone'].every(k=>typeof f[k]==='boolean');
 if(record?.version!==1||record.hero!==hero||!Number.isSafeInteger(record.revision)||record.revision<1||!finiteTree(record)||!p||!Number.isSafeInteger(p.level)||p.level<1||!Number.isFinite(p.xp)||p.xp<0||!Number.isFinite(p.gold)||p.gold<0||!Array.isArray(p.slots)||p.slots.length>3||!p.skills||!Array.isArray(p.offers)||!s.hero||!['idle','move','attack','hit','die'].includes(s.hero.state)||!Number.isFinite(s.maxHp)||s.maxHp<=0||!Array.isArray(s.foes)||s.foes.length>64||!Array.isArray(s.souls)||!s.effects||!s.world)throw Error('Invalid or unsupported gameplay save. Original retained; restore a valid backup or reset progression in Settings.');
 if(!fighter(s.hero)||s.foes.some((f:any)=>!fighter(f)||!number(f.level)||!number(f.maxHp)||!f.home)||!number(s.position?.x)||!number(s.position?.y)||['baseHp','kills','spawnTimer','seed','elapsedMs','levelUpPulseMs','regenAccum','soulId'].some(k=>!number(s[k]))||!Number.isSafeInteger(p.pending)||p.pending<0||!Number.isSafeInteger(p.stars)||p.stars<0||Object.entries(p.skills).some(([id,rank])=>!cards[id]||(cards[id].kind==='active'&&!HERO_ACTIVE_POOL[hero].includes(id as any))||!Number.isSafeInteger(rank)||(rank as number)<0)||p.slots.some((id:string)=>!HERO_ACTIVE_POOL[hero].includes(id as any)||!p.skills[id])||p.offers.some((id:string)=>!cards[id])||!Array.isArray(s.effects.projectiles)||!Array.isArray(s.effects.aoes)||!Array.isArray(s.effects.burnSoils)||!s.effects.cooldowns||!number(s.world.clockBase)||!s.world.doors||!s.world.gateHealth)throw Error('Incomplete gameplay save. Original retained.');
 const point=(a:any)=>a&&number(a.u)&&number(a.v);
 const area=(a:any)=>point(a)&&['rift-trap','ember-snare','shockwave','cleave-cone','flame-cone'].includes(a.kind)&&HERO_ACTIVE_POOL[hero].includes(a.skill)&&['circle','cone'].includes(a.shape)&&['radius','angle','spread','age','duration','damageScale'].every(k=>number(a[k]))&&a.age>=0&&a.duration>=0&&typeof a.detonated==='boolean';
 if(s.foes.some((f:any)=>!point(f.home)||(f.wander!==null&&!point(f.wander)))||s.souls.some((a:any)=>!point(a)||!Number.isSafeInteger(a.id)||!Number.isSafeInteger(a.level)||a.level<1||!number(a.age)||a.age<0)||new Set(s.souls.map((a:any)=>a.id)).size!==s.souls.length||Object.entries(s.effects.cooldowns).some(([id,n])=>!HERO_ACTIVE_POOL[hero].includes(id as any)||!number(n)||Number(n)<0)||s.effects.aoes.some((a:any)=>!area(a))||s.effects.burnSoils.some((b:any)=>!area(b.area)||!number(b.elapsed)||b.elapsed<0||!Number.isInteger(b.emitted)||b.emitted<0||b.emitted>5)||s.effects.projectiles.some((a:any)=>!point(a)||!HERO_ACTIVE_POOL[hero].includes(a.skill)||!['rift-bolt','flame-bolt','arcane-orb'].includes(a.kind)||['vx','vy','radius','range','traveled','damageScale','age','id'].some(k=>!number(a[k]))||!Array.isArray(a.hitIds)||a.hitIds.some((i:any)=>!Number.isSafeInteger(i)||i<0||i>=s.foes.length)||!Array.isArray(a.trail)||a.trail.some((p:any)=>!point(p)))||!Number.isSafeInteger(s.effects.nextId)||s.effects.nextId<1||typeof s.world.gateOpen!=='boolean'||['index','target'].some(k=>!Number.isInteger(s.world.doors[k])||s.world.doors[k]<0||s.world.doors[k]>15)||!number(s.world.doors.elapsed)||!number(s.world.gateHealth.hp)||!number(s.world.gateHealth.max)||s.world.gateHealth.max<=0||(s.world.route!==null&&s.world.route!==undefined&&(!number(s.world.route.x)||!number(s.world.route.y))))throw Error('Invalid gameplay effects or world state. Original retained.');
}
// Gameplay is nested in the existing economy envelope, so consumable effects and
// inventory counts can commit in ONE localStorage write. Legacy fields are kept.
export function gameplayStore(storage:Store,hero:HeroId){
 const initial=storage.getItem(KEY),root=initial?JSON.parse(initial):fresh();
 if(initial)load(initial,root.at); // Validate legacy/future economy envelopes before touching them.
 let expected=root.gameplay?.[hero]??null;
 if(expected!==null)validateGameplay(expected,hero);
 let expectedSerialized=JSON.stringify(expected),revision=expected?.revision??0;
 const attach=(root:any,state:any)=>{
  if(JSON.stringify(root.gameplay?.[hero]??null)!==expectedSerialized)throw Error('Gameplay changed in another tab or was reset. Reload to continue safely.');
  if(root.version!==1)throw Error('Unsupported economy save. Original retained.');
  const next={version:1,revision:revision+1,hero,state};validateGameplay(next,hero);
  root.gameplay={...root.gameplay,[hero]:next};return next;
 };
 return {initial:expected?.state??null,
  save(state:any){const raw=storage.getItem(KEY),root=raw?JSON.parse(raw):fresh();const next=attach(root,state);root.revision++;storage.setItem(KEY,JSON.stringify(root));expectedSerialized=JSON.stringify(next);revision=next.revision;},
  // Called by inventory under the economy lock; acknowledge only AFTER its write.
  prepare(root:any,state:any){const next=attach(root,state);return ()=>{expectedSerialized=JSON.stringify(next);revision=next.revision;};},
 };
}
let inventoryCapture:((root:any)=>(()=>void))|null=null;
export const setInventoryGameplayCapture=(f:typeof inventoryCapture)=>inventoryCapture=f;
export const prepareInventoryGameplay=(root:any)=>inventoryCapture?.(root)??(()=>{});

// Collision updates may make an old foot position invalid. Recover locally,
// never by starting a new run or moving to an unrelated spawn point.
export function nearestResumePosition(at:{u:number;v:number},place:(p:{u:number;v:number})=>boolean){
 if(place(at))return at;
 for(let radius=.125;radius<=4;radius+=.125)for(let i=0;i<32;i++){
  const angle=i*Math.PI/16,next={u:at.u+Math.cos(angle)*radius,v:at.v+Math.sin(angle)*radius};
  if(place(next))return next;
 }
 throw Error('Saved position has no nearby walkable ground. Original gameplay retained; restore a valid backup.');
}
