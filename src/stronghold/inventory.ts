import './inventory.css';
import {setGamePaused} from '../app/frame-scheduler';
import {ITEM_IDS,ITEMS,INVENTORY_SLOTS,type ItemId} from './items';
import {inventorySnapshot,useItem,addItems,removeItems,type ItemEffect} from './inventory-store';
type Options={renderPause?:(paused:boolean)=>void;solo:boolean;canOpen:()=>boolean;bounds:()=>{x:number;y:number;width:number;height:number};reason:(id:ItemId)=>string;apply:(id:ItemId)=>ItemEffect};
export function createInventory(o:Options){
 const bag=document.createElement('button');bag.className='inventory-bag';bag.setAttribute('aria-label','Open Inventory');bag.title='Inventory (I)';
 bag.innerHTML='<svg viewBox="0 0 48 48" aria-hidden="true"><path d="m18 6 6 2 6-2-3 10c8 6 14 11 12 21-2 9-28 9-30 0-2-10 4-15 12-21Z" fill="#a77939" stroke="#edca7a" stroke-width="2"/><path d="M18 17q6 4 12 0M24 22v13m-4-9h7m-7 6h7" fill="none" stroke="#ffe2a2" stroke-width="2"/></svg>';
 const overlay=document.createElement('div');overlay.className='inventory-overlay';overlay.hidden=true;
 overlay.innerHTML='<section class="inventory-panel" role="dialog" aria-modal="true" aria-labelledby="inventory-title"><header><h2 id="inventory-title">Inventory</h2><button class="inventory-close" aria-label="Close Inventory">×</button></header><div class="inventory-body"><div class="inventory-grid" role="group" aria-label="Inventory slots"></div><section class="inventory-details" aria-labelledby="inventory-item-name"><img alt=""><div><h3 id="inventory-item-name"></h3><p class="inventory-description"></p><p class="inventory-count"></p></div><button class="inventory-use">Use</button><p class="inventory-status" role="status" aria-live="polite"></p></section></div><footer>Consumables <span class="inventory-capacity"></span><span class="inventory-hint">I / Esc to close</span></footer></section>';
 document.body.append(bag,overlay);
 const grid=overlay.querySelector<HTMLElement>('.inventory-grid')!,use=overlay.querySelector<HTMLButtonElement>('.inventory-use')!,status=overlay.querySelector<HTMLElement>('.inventory-status')!;
 let open=false,busy=false,selected:ItemId='health-potion',previous:HTMLElement|null=null;
 const slots=Array.from({length:INVENTORY_SLOTS},(_,i)=>{
  const el=document.createElement(i<2?'button':'div');el.className='inventory-slot';
  if(i<2){const id=ITEM_IDS[i];el.dataset.item=id;el.innerHTML=`<img src="${ITEMS[id].icon}" alt=""><span></span>`;el.onclick=()=>{selected=id;status.textContent='';refresh();};}
  else{el.setAttribute('aria-hidden','true');el.textContent='✧';}
  grid.append(el);return el;
 });
 function refresh(){
  try{
   const counts=inventorySnapshot(),item=ITEMS[selected];
   ITEM_IDS.forEach((id,i)=>{const slot=slots[i];slot.querySelector('span')!.textContent=String(counts[id]);slot.setAttribute('aria-label',`${ITEMS[id].name}, ${counts[id]} remaining`);slot.setAttribute('aria-pressed',String(selected===id));slot.classList.toggle('is-empty',counts[id]===0);});
   const img=overlay.querySelector<HTMLImageElement>('.inventory-details>img')!;img.src=item.icon;
   overlay.querySelector('h3')!.textContent=item.name;
   overlay.querySelector('.inventory-description')!.textContent=item.description;
   overlay.querySelector('.inventory-count')!.textContent=`Owned: ${counts[selected]} / 99`;
   overlay.querySelector('.inventory-capacity')!.textContent=`${ITEM_IDS.filter(id=>counts[id]>0).length} / ${INVENTORY_SLOTS} slots`;
   const reason=!o.solo?'Consumables are available in solo play.':counts[selected]===0?'No items remaining.':o.reason(selected);
   use.disabled=busy||!!reason;use.textContent=busy?'Using…':'Use';use.title=reason;
   if(reason&&!busy)status.textContent=reason;
  }catch(e){status.textContent=e instanceof Error?e.message:'Inventory unavailable.';use.disabled=true;}
 }
 function close(){if(busy)return;open=false;overlay.hidden=true;if(o.solo){setGamePaused(false);o.renderPause?.(false);}previous?.focus();}
 function show(){if(open||!o.canOpen())return;previous=document.activeElement as HTMLElement;open=true;status.textContent='';overlay.hidden=false;if(o.solo){setGamePaused(true);o.renderPause?.(true);}refresh();overlay.querySelector<HTMLButtonElement>('.inventory-close')!.focus();}
 bag.onclick=show;overlay.querySelector<HTMLButtonElement>('.inventory-close')!.onclick=close;
 overlay.onclick=e=>{if(e.target===overlay)close();};
 use.onclick=async()=>{
  if(busy||use.disabled)return;busy=true;refresh();
  try{await useItem(selected,()=>{const reason=o.reason(selected);if(reason)throw Error(reason);return o.apply(selected);});status.textContent=selected==='health-potion'?'Health restored.':'Returned to Stronghold.';}
  catch(e){status.textContent=e instanceof Error?e.message:'Item could not be used.';}
  finally{busy=false;refresh();}
 };
 document.addEventListener('keydown',e=>{
  const input=(e.target as HTMLElement)?.closest('input,textarea,select,[contenteditable=true]');
  if(!open){if(!input&&!e.repeat&&e.code==='KeyI'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();show();}return;}
  e.stopImmediatePropagation();
  if(e.key==='Escape'||e.code==='KeyI'){e.preventDefault();close();}
  if(e.key==='Tab'){
   const focusable=[...overlay.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')],first=focusable[0],last=focusable.at(-1)!;
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
 },true);
 function position(){
  // Settings owns the rightmost minimap utility slot. Follow its actual screen rectangle.
  const gear=document.querySelector('.settings-gear')?.getBoundingClientRect(),b=o.bounds();
  bag.style.left=`${Math.max(8,Math.min(innerWidth-54,(gear?.x??b.x+b.width-46)-54))}px`;
  bag.style.top=`${Math.max(8,Math.min(innerHeight-54,gear?.y??b.y+b.height+8))}px`;
 }
 (window as any).__INVENTORY__={snapshot:inventorySnapshot,add:addItems,remove:removeItems};
 position();const timer=setInterval(()=>{position();if(open&&!busy)refresh();},250);
 window.addEventListener('storage',refresh);
 return {isOpen:()=>open,close,open:show,destroy(){clearInterval(timer);window.removeEventListener('storage',refresh);bag.remove();overlay.remove();}};
}
