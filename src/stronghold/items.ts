export const ITEM_IDS=['health-potion','stronghold-scroll','axe'] as const;
export type ItemId=typeof ITEM_IDS[number];
export type Inventory=Record<ItemId,number>;
export const STACK_LIMIT=99;
export const INVENTORY_SLOTS=8;
export const ITEMS:Record<ItemId,{name:string;description:string;icon:string}>={
 'axe':{name:'Axe',description:'Starter tool. Automatically chops a tree within 5 feet. Kept permanently; no manual Use needed.',icon:'/inventory/axe.svg'},
 'health-potion':{name:'Health Potion',description:'Restores 40% of maximum health. Cannot be used at full health.',icon:'/inventory/v2/health-potion.webp'},
 'stronghold-scroll':{name:'Stronghold Teleport Scroll',description:'Return to the Stronghold. Consumed only after a successful teleport.',icon:'/inventory/v2/stronghold-scroll.webp'}
};
export const starterInventory=():Inventory=>({'health-potion':5,'stronghold-scroll':2,'axe':1});
export function readInventory(value:unknown):Inventory{
 if(value===undefined)return starterInventory();
 const raw=value&&typeof value==='object'?value as Record<string,unknown>:{};
 return Object.fromEntries(ITEM_IDS.map(id=>[id,id==='axe'&&raw[id]===undefined?1:typeof raw[id]==='number'&&Number.isFinite(raw[id])?Math.max(0,Math.min(STACK_LIMIT,Math.floor(raw[id] as number))):0])) as Inventory;
}
export function changeItems(bag:Inventory,id:ItemId,delta:number){
 if(!ITEM_IDS.includes(id)||!Number.isSafeInteger(delta))throw Error('Invalid item change.');
 const next=bag[id]+delta;
 if(next<0)throw Error('No items remaining.');
 if(next>STACK_LIMIT)throw Error('Stack is full (99 maximum).');
 bag[id]=next;
}
