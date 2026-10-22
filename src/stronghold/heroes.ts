// The heroes a player can pick at the start (hero-picker.ts). Each is a six-view atlas packed by
// scripts/pack-heroes.mjs into the character manifest; both fight with the same auto-attack for now, so the choice
// is the look, and co-op rooms show every player's pick (net/client.ts sends it, the server echoes it as `h`).
export const HEROES=[
 {id:'rift-runner',name:'Rift Runner',role:'Ranged scout',blurb:'A nimble hooded runner with a crystal emitter. Built for moving and shooting.'},
 {id:'ember-warden',name:'Ember Warden',role:'Close-range fire',blurb:'A frontier firekeeper with a bronze gauntlet who sweeps packs with flame.'}
] as const;
export type HeroId=(typeof HEROES)[number]['id'];
export const DEFAULT_HERO:HeroId='rift-runner';
export const isHero=(id:unknown):id is HeroId=>HEROES.some(h=>h.id===id);
export const heroInfo=(id:HeroId)=>HEROES.find(h=>h.id===id)!;
const KEY='arkadia.hero';
// ?hero=ember-warden picks for this visit (and skips the picker); otherwise the last pick on this device.
export function savedHero():HeroId{
 const q=new URLSearchParams(location.search).get('hero');if(isHero(q))return q;
 try{const s=localStorage.getItem(KEY);if(isHero(s))return s;}catch{}
 return DEFAULT_HERO;
}
export function saveHero(id:HeroId){try{localStorage.setItem(KEY,id);}catch{}}
// The character manifest, fetched once for the hero, the party and the revenants.
const BASE='/assets/characters/';
let manifest:Promise<{characters:Record<string,any>}>|null=null;
export const characters=async()=>(await (manifest??=fetch(BASE+'manifest.json').then(r=>{if(!r.ok)throw Error('Character manifest missing');return r.json();}))).characters;
export const atlasUrl=(m:{image:string;revision?:string})=>BASE+m.image+(m.revision?`?v=${encodeURIComponent(m.revision)}`:'');
export const portraitUrl=(id:HeroId)=>`${BASE}portraits/${id}.webp?v=${id==='ember-warden'?'painted-v4':'1'}`;
