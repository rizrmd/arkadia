import fs from 'node:fs';import {ParticleEffectRunner} from 'nixie-fx';import {normalizePixiVfxEffect} from 'nixie-fx/pixi';
const fx=normalizePixiVfxEffect(JSON.parse(fs.readFileSync('vfx/out/vfx/effects/ember-warden/flame-fan.bolt.json','utf8')));
for(const start of [0,5]){
const r=new ParticleEffectRunner(fx);r.reset(fx,[0,0,0],start,1);
let t=start;for(let i=0;i<15;i++){t+=1/60;r.setPosition([i*.1,0,0]);r.update(1/60,t);}
console.log('start',start,r.states.map((s,i)=>fx.emitters[i].name+':'+s.activeCount).join(' '));
}
console.log(fx.emitters.map(e=>[e.name,e.spawn.rate,e.spawn.rateValue.mode,e.spawn.rateValue.value,e.duration,e.loop,e.timeline.start]));
