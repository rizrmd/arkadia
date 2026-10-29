import {prepareInventoryGameplay,withEconomyLock} from './gameplay-save';
import {KEY,load} from './economy';
import {transact} from './store';
import {readInventory,changeItems,type ItemId} from './items';
export type ItemEffect={undo:()=>void};
// The same Web Lock as all Stronghold writes keeps counts safe across tabs and reset.
export function inventorySnapshot(){return readInventory(load(localStorage.getItem(KEY)).inventory);}
export async function addItems(id:ItemId,count=1){
 if(!Number.isSafeInteger(count)||count<=0)throw Error('Count must be a positive whole number.');
 return transact(s=>{s.inventory=readInventory(s.inventory);changeItems(s.inventory,id,count);});
}
export async function removeItems(id:ItemId,count=1){
 if(!Number.isSafeInteger(count)||count<=0)throw Error('Count must be a positive whole number.');
 return transact(s=>{s.inventory=readInventory(s.inventory);changeItems(s.inventory,id,-count);});
}
let using=false;
export async function useItem(id:ItemId,effect:()=>ItemEffect):Promise<void>{
 if(using)throw Error('An item is already being used.');
 if(!navigator.locks)throw Error('This browser needs Web Locks to use items safely.');
 using=true;
 try{await withEconomyLock(()=>{
  const s=load(localStorage.getItem(KEY));s.inventory=readInventory(s.inventory);
  changeItems(s.inventory,id,-1);
  // Effects are synchronous and recheck gameplay conditions while holding the save lock.
  // A rejected teleport throws before committing. Undo restores gameplay if saving fails.
  const applied=effect();
  try{const acknowledge=prepareInventoryGameplay(s);s.revision++;localStorage.setItem(KEY,JSON.stringify(s));acknowledge();}catch(error){applied.undo();throw error;}
 });}finally{using=false;}
}
