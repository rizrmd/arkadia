import {Assets,Container,Graphics,NineSliceSprite,Rectangle,Sprite,Text,type Texture,type FederatedPointerEvent} from 'pixi.js';
import {createHudActionButton,hudActionPosition} from './hud-action-button';
import {setGamePaused} from '../app/frame-scheduler';
import {ITEM_IDS,ITEMS,INVENTORY_SLOTS,type ItemId} from './items';
import {inventorySnapshot,useItem,addItems,removeItems,type ItemEffect} from './inventory-store';
type Options={stage:Container;renderPause?:(paused:boolean)=>void;redraw:()=>void;releaseInput:()=>void;solo:boolean;canOpen:()=>boolean;bounds:()=>{x:number;y:number;width:number;height:number};reason:(id:ItemId)=>string;apply:(id:ItemId)=>ItemEffect};
export function createInventory(o:Options){
 let open=false,busy=false,destroyed=false,selected:ItemId='health-potion',message='',focus=0,keyboard=false,previous:HTMLElement|null=null;
 const bag=createHudActionButton(o.stage,'/inventory/v2/bag.webp','Open Inventory',show);
 const overlay=new Container({label:'Inventory',eventMode:'static'});overlay.zIndex=100;overlay.visible=false;o.stage.addChild(overlay);
 const textures=new Map<string,Texture>();
 const paths=['panel','slot','button',].map(x=>`/inventory/v2/${x}.webp`).concat(ITEM_IDS.map(id=>ITEMS[id].icon));
 void Promise.all(paths.map(async path=>textures.set(path,await Assets.load(path)))).then(()=>{if(!destroyed)refresh();}).catch(()=>{message='Inventory artwork unavailable.';refresh();});
 function text(parent:Container,value:string,x:number,y:number,size=16,width=200,color=0xf4ead3){const t=new Text({text:value,style:{fontFamily:'Georgia',fontSize:size,fill:color,wordWrap:true,wordWrapWidth:width,breakWords:true,lineHeight:Math.ceil(size*1.3)}});t.position.set(x,y);parent.addChild(t);return t;}
 function art(parent:Container,path:string,x:number,y:number,w:number,h:number,slice=false){const texture=textures.get(path);if(!texture)return;const s=slice?new NineSliceSprite({texture,leftWidth:64,rightWidth:64,topHeight:64,bottomHeight:64}):new Sprite(texture);s.position.set(x,y);s.width=w;s.height=h;s.eventMode='none';parent.addChild(s);return s;}
 function box(parent:Container,x:number,y:number,w:number,h:number,color=0x0c0e0f){return parent.addChild(new Graphics().rect(x,y,w,h).fill(color));}
 function target(parent:Container,label:string,x:number,y:number,w:number,h:number,action:()=>void,index:number,enabled=true){
  const c=new Container({label,eventMode:'static',cursor:enabled?'pointer':'default'});c.position.set(x,y);c.hitArea=new Rectangle(0,0,w,h);parent.addChild(c);
  c.on('pointerdown',(e:FederatedPointerEvent)=>{e.stopPropagation();keyboard=false;focus=index;});
  c.on('pointertap',(e:FederatedPointerEvent)=>{e.stopPropagation();if(enabled&&!busy)action();});
  if(keyboard&&focus===index)c.addChild(new Graphics().roundRect(-2,-2,w+4,h+4,4).stroke({color:0x7bedff,width:3}));
  return c;
 }
 function reason(){const count=inventorySnapshot()[selected];return !o.solo?'Consumables are available in solo play.':!count?'No items remaining.':o.reason(selected);}
 let lastState='';
 function refresh(force=true){
  if(destroyed||!open)return;
  const state=JSON.stringify([innerWidth,innerHeight,inventorySnapshot(),selected,busy,message,reason()]);
  if(!force&&state===lastState)return;lastState=state;
  overlay.removeChildren().forEach(c=>c.destroy({children:true}));
  const vw=innerWidth,vh=innerHeight,compact=vw<700,short=vh<500;
  const w=Math.min(vw-24,compact&&!short?368:720),h=short?Math.min(vh-20,356):compact?516:440;
  const x=Math.round((vw-w)/2),y=Math.round((vh-h)/2);
  overlay.hitArea=new Rectangle(0,0,vw,vh);
  const shade=box(overlay,0,0,vw,vh,0x000000);shade.alpha=.65;shade.eventMode='static';shade.on('pointertap',close);
  const panel=new Container({label:'Inventory panel',eventMode:'static'});panel.position.set(x,y);panel.hitArea=new Rectangle(0,0,w,h);panel.on('pointertap',e=>e.stopPropagation());overlay.addChild(panel);
  box(panel,0,0,w,h);art(panel,'/inventory/v2/panel.webp',0,0,w,h,true);
  const title=text(panel,'Inventory',0,16,short?24:28,w);title.x=(w-title.width)/2;
  const closeButton=target(panel,'Close Inventory',w-60,10,44,44,close,0);art(closeButton,'/inventory/v2/slot.webp',0,0,44,44);text(closeButton,'×',12,0,32,44);
  const counts=inventorySnapshot(),horizontal=!compact||short;
  const gridW=horizontal?(short?Math.min(260,w*.44):360):w-40;
  const gap=8,slot=Math.min(short?52:80,(gridW-24)/4),gridX=20,gridY=short?64:70;
  for(let i=0;i<INVENTORY_SLOTS;i++){
   const id=ITEM_IDS[i],sx=gridX+(i%4)*(slot+gap),sy=gridY+Math.floor(i/4)*(slot+gap);
   const cell=id?target(panel,ITEMS[id].name,sx,sy,slot,slot,()=>{selected=id;message='';refresh();},i+1):new Container();
   if(!id){cell.position.set(sx,sy);panel.addChild(cell);}art(cell,'/inventory/v2/slot.webp',0,0,slot,slot);
   if(id){if(selected===id)cell.addChild(new Graphics().roundRect(2,2,slot-4,slot-4,4).stroke({color:0xffda80,width:2}));const image=art(cell,ITEMS[id].icon,7,7,slot-14,slot-14);if(image)image.alpha=counts[id]?1:.3;const count=text(cell,String(counts[id]),0,slot-25,18,slot);count.x=slot-count.width-8;}
  }
  const dx=horizontal?gridW+34:20,dy=horizontal?64:gridY+2*(slot+gap)+8,dw=w-dx-20,dh=h-dy-40;
  box(panel,dx,dy,dw,dh);art(panel,'/inventory/v2/panel.webp',dx,dy,dw,dh,true);
  const item=ITEMS[selected],icon=short?58:horizontal?96:64;
  art(panel,item.icon,dx+(horizontal?(dw-icon)/2:12),dy+12,icon,icon);
  const tx=horizontal?dx+22:dx+88,ty=horizontal?dy+icon+16:dy+12,tw=horizontal?dw-44:dw-110;
  const name=text(panel,item.name,tx,ty,short?16:18,tw);
  const desc=text(panel,item.description,tx,ty+name.height+6,short?12:13,tw);
  text(panel,`Owned: ${counts[selected]} / 99`,tx,desc.y+desc.height+6,12,tw,0xc2b69d);
  const blocked=reason(),enabled=!busy&&!blocked;
  const button=target(panel,'Use',dx+18,dy+dh-88,dw-36,44,()=>void activate(),ITEM_IDS.length+1,enabled);art(button,'/inventory/v2/button.webp',0,0,dw-36,44);button.alpha=enabled?1:.5;const caption=text(button,busy?'Using…':'Use',0,7,22,dw-36);caption.x=(dw-36-caption.width)/2;
  text(panel,message||blocked,dx+22,dy+dh-38,12,dw-44,0xe2c793);
  text(panel,`Items   ${ITEM_IDS.filter(id=>counts[id]>0).length} / ${INVENTORY_SLOTS} slots`,28,h-38,12,w-56,0xbaad91);
  o.redraw();
 }
 async function activate(){if(busy||reason())return;busy=true;refresh();try{await useItem(selected,()=>{const why=o.reason(selected);if(why)throw Error(why);return o.apply(selected);});message=selected==='health-potion'?'Health restored.':'Returned to Stronghold.';}catch(e){message=e instanceof Error?e.message:'Item could not be used.';}finally{busy=false;refresh();}}
 function close(){if(busy||!open)return;open=false;overlay.visible=false;if(o.solo){setGamePaused(false);o.renderPause?.(false);}previous?.focus();o.redraw();}
 function show(){if(open||!o.canOpen())return;previous=document.activeElement as HTMLElement;previous?.blur();o.releaseInput();open=true;focus=0;message='';overlay.visible=true;if(o.solo){setGamePaused(true);o.renderPause?.(true);}refresh();}
 function key(e:KeyboardEvent){
  const input=(e.target as HTMLElement)?.closest?.('input,textarea,select,[contenteditable=true]');
  if(!open){if(!input&&!e.repeat&&e.code==='KeyI'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();show();}return;}
  e.stopImmediatePropagation();e.preventDefault();if(e.repeat||busy)return;
  if(e.key==='Escape'||e.code==='KeyI'){close();return;}
  keyboard=true;
  if(e.key==='Tab'){const order=Array.from({length:ITEM_IDS.length+(reason()?1:2)},(_,i)=>i);focus=order[(order.indexOf(focus)+(e.shiftKey?-1:1)+order.length)%order.length];}
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){selected=ITEM_IDS[(ITEM_IDS.indexOf(selected)+(e.key==='ArrowRight'?1:ITEM_IDS.length-1))%ITEM_IDS.length];focus=ITEM_IDS.indexOf(selected)+1;message='';}
  if(e.key==='Enter'||e.key===' '){if(focus===0)close();else if(focus===ITEM_IDS.length+1)void activate();else{selected=ITEM_IDS[focus-1];message='';}}
  refresh();
 }
 document.addEventListener('keydown',key,true);
 function position(){const {x,y}=hudActionPosition(o.bounds(),true);bag.position(x,y);}
 const debug={snapshot:inventorySnapshot,add:addItems,remove:removeItems,renderer:'pixi',overlay,bag:bag.button,isOpen:()=>open};
 (window as any).__INVENTORY__=debug;
 position();const timer=setInterval(()=>{position();if(open&&!busy)refresh(false);},250);
 const changed=()=>refresh();window.addEventListener('storage',changed);window.addEventListener('resize',changed);
 return {isOpen:()=>open,close,open:show,destroy(){destroyed=true;clearInterval(timer);document.removeEventListener('keydown',key,true);window.removeEventListener('storage',changed);window.removeEventListener('resize',changed);if(open&&o.solo){setGamePaused(false);o.renderPause?.(false);}bag.destroy();overlay.destroy({children:true});if((window as any).__INVENTORY__===debug)delete (window as any).__INVENTORY__;}};
}
