import {Assets,Container,Rectangle,Sprite,Texture} from 'pixi.js';
import type {FrameSet} from '../typography/frames';
import {MsdfText} from '../typography/text';
import type {Arena} from './arena';
import {equipmentUrl,type EquipmentMeta} from './sprites';

// Equipment panel and Arena HUD rendered in Pixi v8 with MSDF typography and @3x bronze frames.
const NAMES:Record<string,string>={
 sword:'Short sword',axe:'Axe',spear:'Spear',staff:'Relic staff',
 helm:'Ivory helm',armor:'Plate armour',cloak:'Cobalt cloak',shield:'Shield',
 potion:'Amber potion',backpack:'Backpack',map:'Expedition map','soul-shard':'Soul shard'
};
const WORN=['sword','helm','armor','cloak'];
const BAG=['potion','shield','axe','spear','staff','backpack','map','soul-shard'];
const SIZE=46;

export async function mountEquipment(uiStage:Container,frames:FrameSet,meta:EquipmentMeta,arena:Arena){
 let potions=3;
 const atlasTex=await Assets.load<Texture>(equipmentUrl(meta));
 const panel=uiStage.addChild(new Container());
 panel.position.set(16,96);
 panel.addChild(frames.frame('panel-bronze',264,336));

 const wornLabel=panel.addChild(new MsdfText('panel-label','EQUIPPED (PAINTED)',{size:11.5}));
 wornLabel.place(20,30);
 const bagLabel=panel.addChild(new MsdfText('panel-label','BAG',{size:11.5}));
 bagLabel.place(20,112);
 const detailText=panel.addChild(new MsdfText('panel-muted','Select an item to inspect',{size:12.5,lineHeight:16,wrapWidth:224}));
 detailText.place(20,256);

 const counts=new Map<string,MsdfText>();
 const addSlot=(id:string,x:number,y:number)=>{
  const it=meta.items.find(i=>i.id===id)!;
  const slot=panel.addChild(new Container());
  slot.position.set(x,y);
  slot.eventMode='static';
  slot.cursor='pointer';
  slot.hitArea=new Rectangle(0,0,SIZE,SIZE);
  slot.addChild(frames.frame('keycap',SIZE,SIZE));

  const subTex=new Texture({
   source:atlasTex.source,
   frame:new Rectangle(it.x,it.y,meta.icon,meta.icon),
  });
  const iconSprite=slot.addChild(new Sprite(subTex));
  iconSprite.position.set(4,4);
  iconSprite.width=SIZE-8;
  iconSprite.height=SIZE-8;

  const badge=slot.addChild(new MsdfText('hud-badge','',{size:12}));
  badge.place(SIZE-6,SIZE-6,1);
  counts.set(id,badge);

  slot.on('pointerover',()=>{
   detailText.text=`${NAMES[id]} · ${it.source.w}×${it.source.h}${WORN.includes(id)?' · painted on hero':id==='potion'?' · restore 35 HP':''}`;
   detailText.place(20,256);
  });
  if(id==='potion'){
   slot.on('pointertap',()=>{
    const h=arena.hero;
    if(!potions||!h.alive||h.hp>=100)return;
    potions--;h.hp=Math.min(100,h.hp+35);
    badge.text=String(potions);badge.place(SIZE-6,SIZE-6,1);
    slot.alpha=potions?1:0.45;
   });
  }
 };

 WORN.forEach((id,i)=>addSlot(id,20+i*56,42));
 BAG.forEach((id,i)=>addSlot(id,20+(i%4)*56,124+Math.floor(i/4)*56));
 const potionBadge=counts.get('potion');
 if(potionBadge){potionBadge.text=String(potions);potionBadge.place(SIZE-6,SIZE-6,1);}

 let shown=-1;
 return ()=>{
  if(arena.kills!==shown){
   shown=arena.kills;
   const shard=counts.get('soul-shard');
   if(shard){shard.text=String(shown);shard.place(SIZE-6,SIZE-6,1);}
  }
 };
}

export function hud(uiStage:Container,frames:FrameSet,arena:Arena){
 const box=uiStage.addChild(new Container());
 box.position.set(16,16);
 box.addChild(frames.frame('pill-wide',360,64));
 const label=box.addChild(new MsdfText('panel-body','',{size:15}));
 label.place(22,28);
 const hpFrame=box.addChild(frames.frame('hp-frame',316,20));
 hpFrame.position.set(22,36);
 const hpFill=box.addChild(new Container());
 hpFill.position.set(26,40);
 hpFill.addChild(frames.frame('hp-fill',308,12));

 let last='';
 return ()=>{
  const s=arena.snapshot(),text=`${s.hero.state.toUpperCase()} · HP ${Math.ceil(s.hero.hp)} · ${s.alive}/${s.enemies} Foes · ${s.kills} Slain`;
  if(text===last)return;
  last=text;
  label.text=text;label.place(22,28);
  (hpFill.children[0] as Container).width=Math.max(8,Math.round(308*Math.max(0,s.hero.hp)/100));
 };
}
