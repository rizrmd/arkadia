import {KEY,fresh} from './economy';
import {SKILL_UNLOCK_KEYS} from './skill-unlocks';
// Explicit allowlist: never clear storage, preferences, hero choice, layout or identity.
export const PROGRESSION_KEYS=[KEY,...Object.values(SKILL_UNLOCK_KEYS),'arkodia.stronghold.hero','arkodia-snow-expedition-v1','arkodia-expedition-v1'] as const;
export const RESET_EXPLANATION='This permanently erases this browser’s saved Stronghold resources (gold, mana and souls), stored income, inventory and consumable counts, buildings and upgrades, Warden unlock, training, skill and weapon upgrades, affixes, run rewards and completed expeditions; your saved Stronghold position; Frostpass checkpoint, collected caches and defeated patrols; and expedition world seed, explored chunks, visited and cleared locations, position, jobs, materials and XP; and permanent active skill unlocks and loadouts for both heroes. Your saved gameplay for both heroes (level, HP, XP, gold, skill ranks, enemies, uncollected souls, active effects, cooldowns, gate condition and elapsed play time) will also be erased. This cannot be undone. Settings, chosen hero, minimap layout and player name are kept. Other devices and co-op server data are not reset.';
export async function resetProgression(){
 if(!navigator.locks)throw Error('Reset is unavailable because this browser cannot safely lock the save.');
 await navigator.locks.request(KEY,()=>{
  // Replacing the economy under its existing transaction lock prevents an in-flight write restoring the old save.
  localStorage.setItem(KEY,JSON.stringify(fresh()));
  for(const key of PROGRESSION_KEYS)if(key!==KEY)localStorage.removeItem(key);
 });
}
