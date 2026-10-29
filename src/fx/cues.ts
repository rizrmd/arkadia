import type {FxHandle,FxStage} from './stage';
// Skill FX cues: what each hero plays at each moment of a skill. Combat code only names the moment — "flame-fan.cast",
// "rift-trap.detonate", "hit.crit" — and the cue's layers say which NixieFX effects play where. Heroes are profiles
// (heroes/*.ts) that extend another profile (default: "shared"), so a new hero only lists what it does differently
// and inherits everything else; a hero can also re-skin a shared skill (the Ember Warden's molten Seismic Slam).
//
// Cue keys: "<skill>.<phase>" with phase cast | bolt | impact | telegraph | detonate, plus attack.swing,
// hit.normal | hit.crit | hit.incoming | hit.fire | hit.arcane | hit.seismic, heal, level-up, combo.dual, combo.trinity.
export type CueLayer={
 /** NixieFX effect: its file under vfx/effects without .json. A key ending in ".ground" lies flat on the snow. */
 effect:string;
 /** Anchor point: the cue's origin (caster, projectile, AoE centre) or its target. Default origin. */
 at?:'origin'|'target';
 /** Tiles along the aim from the anchor point. */
 forward?:number;
 /** Lift above the ground, in tile units. */
 h?:number;
 /** Turn the effect's +X onto the aim (default true). "random" spins it to a random heading. */
 aim?:boolean|'random';
 /** 'radius': scale by the cue's radius over baseRadius (area skills grow with rank); a number is a fixed scale. */
 scale?:'radius'|number;
 delayMs?:number;
 /** Ride along with the cue's follow() point (an aura on the caster) instead of staying where it started. */
 follow?:boolean;
};
export type Cue={layers:CueLayer[];baseRadius?:number};
export type HeroFx={id:string;extends?:string;cues:Record<string,Cue|CueLayer[]>};
export type CueContext={u:number;v:number;yaw?:number;target?:{u:number;v:number};radius?:number;follow?:()=>{u:number;v:number};seed?:number};

const profiles=new Map<string,HeroFx>();
export function defineHeroFx(p:HeroFx){profiles.set(p.id,p);return p;}
export function heroFxProfiles(){return [...profiles.values()];}
// The cue a hero plays for a key: its own, else its parent's, ending at "shared".
export function resolveCue(hero:string,key:string):{cue:Cue;from:string}|undefined{
 const seen=new Set<string>();let p=profiles.get(hero)??profiles.get('shared');
 while(p&&!seen.has(p.id)){seen.add(p.id);const c=p.cues[key];if(c)return {cue:Array.isArray(c)?{layers:c}:c,from:p.id};p=profiles.get(p.extends??(p.id==='shared'?'':'shared'));}
 return undefined;
}
export function cueKeys(hero:string){const keys=new Set<string>(),seen=new Set<string>();let p=profiles.get(hero);
 while(p&&!seen.has(p.id)){seen.add(p.id);for(const k of Object.keys(p.cues))keys.add(k);p=profiles.get(p.extends??(p.id==='shared'?'':'shared'));}return [...keys].sort();}

export function playCue(stage:FxStage,hero:string,key:string,ctx:CueContext):FxHandle[]{
 const found=resolveCue(hero,key);if(!found)return [];
 const {cue}=found,out:FxHandle[]=[],yaw=ctx.yaw??0;
 for(const l of cue.layers){
  const base=l.at==='target'&&ctx.target?ctx.target:ctx,f=l.forward??0;
  const scale=l.scale==='radius'?(ctx.radius??cue.baseRadius??1)/(cue.baseRadius??1):l.scale??1;
  const heading=l.aim==='random'?Math.random()*Math.PI*2:l.aim===false?0:yaw;
  const u=base.u+Math.cos(yaw)*f,v=base.v+Math.sin(yaw)*f,off={du:u-base.u,dv:v-base.v};
  const follow=l.follow&&ctx.follow?()=>{const p=ctx.follow!();return {u:p.u+off.du,v:p.v+off.dv};}:undefined;
  const h=stage.play(l.effect,{u,v,h:l.h??0,yaw:heading,scale,seed:ctx.seed,follow},l.delayMs??0);
  if(h)out.push(h);
 }
 return out;
}
