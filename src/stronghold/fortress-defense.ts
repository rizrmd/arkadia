import {setDefenseBlocker} from './navigation';
import {Assets,Container,Graphics,Sprite,type Texture} from 'pixi.js';
import {KEY,load} from './economy';
import {allowedDefense,DEFENSE_SITE,DEFENSE_COMBAT,defenseTarget,type Defense} from './building-branches';
import type {HeroId} from './heroes';
import {tilePoint} from './terrain';
// Purely solo: authoritative co-op simulation has no construction protocol.
export function createFortressDefense<T extends {x:number;y:number;alive:boolean;damage:(n:number)=>boolean}>(o:{stage:Container;hero:()=>HeroId;online:()=>boolean;foes:()=>readonly T[];killed:(f:T)=>void}){
 const tower=o.stage.addChild(new Sprite());tower.label='Level 1 faction defense';tower.eventMode='none';tower.anchor.set(.5,860/900);tower.visible=false;
 const bolt=o.stage.addChild(new Graphics());bolt.eventMode='none';
 let defense:Defense|undefined,cooldown=0,flash=0,target:{x:number;y:number}|null=null,origin={x:0,y:0,scale:1},raw:string|null=null,lastHero:HeroId|undefined;
 let shots=0,totalDamage=0;
 setDefenseBlocker((u,v)=>!o.online()&&!!defense&&Math.abs(u-DEFENSE_SITE.u)<.67&&Math.abs(v-DEFENSE_SITE.v)<.67);
 const textures=new Map<Defense,Texture>();
 for(const id of ['watchtower','arcane-tower'] as const)void Assets.load<Texture>('/buildings/starter-stronghold/'+(id==='arcane-tower'?'runetower':id)+'-01.png').then(t=>{textures.set(id,t);place();}).catch(console.error);
 function sync(){const next=localStorage.getItem(KEY);if(next===raw&&lastHero===o.hero())return;raw=next;lastHero=o.hero();const id=load(next).careerDefenses?.[o.hero()];defense=allowedDefense(o.hero(),id)?id:undefined;}
 function place(){
  const p=tilePoint(DEFENSE_SITE.u,DEFENSE_SITE.v),k=origin.scale,t=defense&&textures.get(defense);
  tower.visible=!!t&&!o.online();if(t){tower.texture=t;tower.width=170*k;tower.height=170*t.height/t.width*k;tower.position.set(origin.x+p.x*k,origin.y+p.y*k);tower.zIndex=30;}
  bolt.clear();if(flash>0&&target&&defense){const q=tilePoint(target.x,target.y);bolt.moveTo(origin.x+p.x*k,origin.y+(p.y-115)*k).lineTo(origin.x+q.x*k,origin.y+q.y*k).stroke({color:defense==='arcane-tower'?0x8de8ff:0xffdb90,width:3*k,alpha:flash/180});bolt.zIndex=40;}
 }
 return {step(dt:number){
  if(o.online()){tower.visible=false;bolt.clear();return;}
  sync();flash=Math.max(0,flash-dt);cooldown=Math.max(0,cooldown-dt);
  if(defense&&cooldown===0){const f=defenseTarget(o.foes());if(f){target={x:f.x,y:f.y};flash=180;cooldown=DEFENSE_COMBAT.interval;shots++;totalDamage+=DEFENSE_COMBAT.damage;if(f.damage(DEFENSE_COMBAT.damage))o.killed(f);}}
  place();
 },place(x=origin.x,y=origin.y,scale=origin.scale){origin={x,y,scale};sync();place();},saveState:()=>({cooldown}),restoreState:(s:{cooldown:number}|undefined)=>{cooldown=s?.cooldown??0;},snapshot:()=>({defense,site:DEFENSE_SITE,shots,totalDamage,cooldown,...DEFENSE_COMBAT})};
}
