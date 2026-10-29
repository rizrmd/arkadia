import type {Container} from 'pixi.js';

// One open building panel owns the interaction surface for its UI stage.
// Keep external badges out of both rendering and hit testing until every panel closes.
type Entry={root:Container;badge:Container;isOpen:()=>boolean;panel:Container;close:()=>void};
const groups=new WeakMap<Container,Set<Entry>>();
export function registerBuildingInteraction(stage:Container,root:Container,badge:Container,isOpen:()=>boolean,panel:Container,close:()=>void){
 let entries=groups.get(stage);if(!entries){entries=new Set();groups.set(stage,entries);}
 const entry={root,badge,isOpen,panel,close};entries.add(entry);
 // Capture outside gestures before Pixi and native world listeners. Consume their whole sequence.
 const closingPointers=new Set<number>();
 const down=(e:PointerEvent)=>{
  if(!root.visible||!isOpen())return;
  const canvas=e.target as HTMLCanvasElement;if(canvas.tagName!=='CANVAS')return;
  const rect=canvas.getBoundingClientRect(),bounds=panel.getBounds();
  // Pixi global bounds use logical canvas pixels (CSS dimensions in this runtime).
  const px=e.clientX-rect.left,py=e.clientY-rect.top;
  if(px>=bounds.minX&&px<=bounds.maxX&&py>=bounds.minY&&py<=bounds.maxY)return;
  closingPointers.add(e.pointerId);e.preventDefault();e.stopImmediatePropagation();
 };
 const consume=(e:PointerEvent)=>{if(!closingPointers.has(e.pointerId))return;e.preventDefault();e.stopImmediatePropagation();if(e.type==='pointerup'||e.type==='pointercancel'){closingPointers.delete(e.pointerId);close();}};
 addEventListener('pointerdown',down,true);for(const type of ['pointermove','pointerup','pointercancel'])addEventListener(type,consume as EventListener,true);
 root.once('destroyed',()=>{removeEventListener('pointerdown',down,true);for(const type of ['pointermove','pointerup','pointercancel'])removeEventListener(type,consume as EventListener,true);});
 const sync=()=>{
  const modal=[...entries!].find(item=>!item.root.destroyed&&item.root.visible&&item.isOpen());
  for(const item of entries!){if(item.root.destroyed)continue;const enabled=!modal&&item.root.visible;
   item.badge.visible=enabled;item.badge.renderable=enabled;item.badge.eventMode=enabled?'static':'none';item.badge.interactiveChildren=enabled;
  }
 };
 root.once('destroyed',()=>{entries!.delete(entry);sync();});
 return {sync,snapshot:()=>({badgeVisible:badge.visible&&root.visible,badgeEnabled:badge.eventMode==='static'&&badge.interactiveChildren&&root.visible})};
}

export const buildingPanelOpen=(stage:Container)=>[...(groups.get(stage)??[])].some(e=>e.root.visible&&!e.root.destroyed&&e.isOpen());
