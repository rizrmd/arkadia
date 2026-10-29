import type {VfxExportedEffect} from 'nixie-fx/export';

// Keep every authored emitter and gameplay cue, but bound per-instance simulation
// on low-spec phones. The global budget only rejects secondary effects; essential
// skill/level-up bursts otherwise bypass it and can exceed it several times over.
export function limitLowCostEffect(effect:VfxExportedEffect){
 for(const e of effect.emitters??[]){
  e.maxParticles=Math.max(1,Math.min(24,e.maxParticles||24));
  const spawn=e.spawn;
  const limit=(n:number)=>Math.min(24,Math.max(1,Math.ceil(n*.5)));
  if(!spawn)continue;
  if(typeof spawn.rate==='number'&&spawn.rate>1)spawn.rate=limit(spawn.rate);
  if(spawn.rateValue)for(const k of ['value','min','max'] as const){
   const n=spawn.rateValue[k];if(typeof n==='number'&&n>1)spawn.rateValue[k]=limit(n);
  }
  for(const b of spawn.bursts??[])if(b.count>1)b.count=limit(b.count);
 }
}
