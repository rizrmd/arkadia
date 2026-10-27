/** Approved timing only. null means balance is pending, never zero-damage balance. */
export const BURN_SOIL = Object.freeze({durationMs:1000,tickMs:200,ticks:5,minLevel:3,damagePerTick:null as number|null});
export function burnSoilState(level:number,elapsedMs:number){
 const enabled=level>=BURN_SOIL.minLevel;
 return {enabled,active:enabled&&elapsedMs>=0&&elapsedMs<1000,
  ticks:enabled?Math.max(0,Math.min(5,Math.floor((elapsedMs+1e-7)/200))):0,
  damagePerTick:BURN_SOIL.damagePerTick,balancePending:BURN_SOIL.damagePerTick===null};
}
/** Catch up every crossed deadline, including the fifth tick before expiry. */
export function createBurnSoilClock(level:number,onTick:(atMs:number,damage:number|null)=>void,initial={elapsed:0,emitted:0}){
 let elapsed=initial.elapsed,emitted=initial.emitted;
 return {advance(dtMs:number){if(!Number.isFinite(dtMs)||dtMs<0)return;elapsed+=dtMs;
  const due=burnSoilState(level,elapsed).ticks;
  while(emitted<due)onTick(++emitted*200,BURN_SOIL.damagePerTick);
 },get elapsedMs(){return elapsed;},get emitted(){return emitted;},get complete(){return level<3||elapsed>=1000;}};
}
