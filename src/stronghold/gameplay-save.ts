import {KEY,fresh} from './economy';
import {cards,HERO_ACTIVE_POOL} from './progression';
import type {HeroId} from './heroes';
export const GAMEPLAY_LOCK='arkodia.gameplay.owner.v1';
export const GAMEPLAY_ERROR='Gameplay could not be saved. Play is paused; free browser storage and reload. Your original save is retained.';
export type GameplayRecord={version:1;revision:number;hero:HeroId;state:any};
type Store=Pick<Storage,'getItem'|'setItem'>;
// This lock spans the playable page, including synchronous pagehide saves. Other tabs
// wait before creating a hero or writing position. Economy operations keep their own lock.
export async function ownGameplay(){
 if(!navigator.locks)throw Error('This browser needs Web Locks to safely resume gameplay.');
 await new Promise<void>((resolve,reject)=>{
  navigator.locks.request(GAMEPLAY_LOCK,async()=>{
   let release!:()=>void;const held=new Promise<void>(r=>release=r);
   addEventListener('pagehide',()=>release(),{once:true});resolve();await held;
  }).catch(reject);
 });
 addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
}
function finiteTree(value:any,depth=0):boolean{
 if(depth>20)return false;
 if(typeof value==='number')return Number.isFinite(value)&&Math.abs(value)<1e15;
 if(value===undefined||value===null||typeof value==='boolean')return true;
 if(typeof value==='string')return value.length<10000;
 if(Array.isArray(value))return value.length<=2000&&value.every(v=>finiteTree(v,depth+1));
 return typeof value==='object'&&Object.keys(value).length<300&&Object.entries(value).every(([k,v])=>!['__proto__','constructor','prototype'].includes(k)&&finiteTree(v,depth+1));
}
export function validateGameplay(record:any,hero:HeroId):asserts record is GameplayRecord{
 const s=record?.state,p=s?.run;
 const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
 const fighter=(f:any)=>f&&['idle','move','attack','hit','die'].includes(f.state)&&['t','facing','stride','hp','cooldown','flash','deadFor','immune','x','y'].every(k=>number(f[k]))&&['back','vertical','impactDone'].every(k=>typeof f[k]==='boolean');
 if(record?.version!==1||record.hero!==hero||!Number.isSafeInteger(record.revision)||record.revision<1||!finiteTree(record)||!p||!Number.isSafeInteger(p.level)||p.level<1||!Number.isFinite(p.xp)||p.xp<0||!Number.isFinite(p.gold)||p.gold<0||!Array.isArray(p.slots)||p.slots.length>3||!p.skills||!Array.isArray(p.offers)||!s.hero||!['idle','move','attack','hit','die'].includes(s.hero.state)||!Number.isFinite(s.maxHp)||s.maxHp<=0||!Array.isArray(s.foes)||s.foes.length>64||!Array.isArray(s.souls)||!s.effects||!s.world)throw Error('Invalid or unsupported gameplay save. Original retained; restore a valid backup or reset progression in Settings.');
 if(!fighter(s.hero)||s.foes.some((f:any)=>!fighter(f)||!number(f.level)||!number(f.maxHp)||!f.home)||!number(s.position?.x)||!number(s.position?.y)||['baseHp','kills','spawnTimer','seed','elapsedMs','levelUpPulseMs','regenAccum','soulId'].some(k=>!number(s[k]))||!Number.isSafeInteger(p.pending)||p.pending<0||!Number.isSafeInteger(p.stars)||p.stars<0||Object.entries(p.skills).some(([id,rank])=>!cards[id]||!Number.isSafeInteger(rank)||(rank as number)<0)||p.slots.some((id:string)=>!HERO_ACTIVE_POOL[hero].includes(id as any)||!p.skills[id])||p.offers.some((id:string)=>!cards[id])||!Array.isArray(s.effects.projectiles)||!Array.isArray(s.effects.aoes)||!Array.isArray(s.effects.burnSoils)||!s.effects.cooldowns||!number(s.world.clockBase)||!s.world.doors||!s.world.gateHealth)throw Error('Incomplete gameplay save. Original retained.');
}
// Gameplay is nested in the existing economy envelope, so consumable effects and
// inventory counts can commit in ONE localStorage write. Legacy fields are kept.
export function gameplayStore(storage:Store,hero:HeroId){
 const initial=storage.getItem(KEY),root=initial?JSON.parse(initial):fresh();
 let expected=root.gameplay?.[hero]??null;
 if(expected!==null)validateGameplay(expected,hero);
 let expectedSerialized=JSON.stringify(expected),revision=expected?.revision??0;
 const attach=(root:any,state:any)=>{
  if(JSON.stringify(root.gameplay?.[hero]??null)!==expectedSerialized)throw Error('Gameplay changed in another tab or was reset. Reload to continue safely.');
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
