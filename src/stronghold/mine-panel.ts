import {wireBuildingAction} from './building-panel-action';
import {BUILDING_CONTEXT_RADIUS,buildingPanelScale,buildingEligibility,type BuildingFunds} from './building-panel-policy';
import {registerBuildingInteraction} from './building-interactions';
import {Assets,Container,Rectangle,Sprite,Texture} from 'pixi.js';
import {MsdfText} from '../typography/text';
import {CORE_CENTER} from './core-placement';

import {mineRecipe} from './building-recipes';
export {mineRecipe} from './building-recipes';
export function minePanelState(completedLevel:number,completedCore:number){
 const recipe=mineRecipe(completedLevel);
 if(!Number.isInteger(completedCore)||completedCore<1||completedCore>30)throw Error('Invalid completed Stronghold Core level');
 return {completedLevel,recipe,requirements:recipe?[{label:`Stronghold Core level ${recipe.level}`,satisfied:completedCore>=recipe.level}]:[],operationAvailable:false};
}
// Read-only optional completed-level metadata; never infer a completed level from an active timer.
export function savedMineLevel(raw:unknown){
 const value=(raw as {mine?:{completedLevel?:unknown}}|null)?.mine?.completedLevel;
 if(value===undefined)return 0;
 if(!Number.isInteger(value)||Number(value)<0||Number(value)>30)throw Error('Invalid Mine save. Original retained.');
 return Number(value);
}
export function createMinePanel(stage:Container,read:()=>{level:number;core:number},online:()=>boolean,redraw:()=>void,funds:()=>BuildingFunds=()=>({gold:0,wood:0})){
 let opened=false,near=false,ready=false,key='',preview:number|null=null;
 const root=stage.addChild(new Container({label:'Mine build and upgrade',eventMode:'passive'}));root.zIndex=46;
 const hammer=root.addChild(new Container({label:'View Mine',eventMode:'static',cursor:'pointer'}));hammer.hitArea=new Rectangle(-26,-26,52,52);
 const panel=root.addChild(new Container({label:'Mine details',eventMode:'static'}));panel.hitArea=new Rectangle(0,0,540,478);
 const interaction=registerBuildingInteraction(stage,root,hammer,()=>opened,panel,()=>{opened=false;refresh();});
 const refresh=()=>{panel.visible=opened;interaction.sync();redraw();};
 root.visible=false;
 const textures=new Map<string,Texture>(),names=['frame','charcoal','hammer','header','gold','wood','clock','tick','divider','button-disabled','button','mine'];
 const sprite=(parent:Container,name:string,x:number,y:number,w:number,h:number)=>{const s=parent.addChild(new Sprite(textures.get(name)));s.position.set(x,y);s.width=w;s.height=h;return s;};
 const label=(parent:Container,s:string,x:number,y:number,size=18,color=0xf5e8cd,max=470,center=false)=>{
  const t=parent.addChild(new MsdfText({font:'body',size,letterSpacing:0,fill:color},s,{lineHeight:size*1.3,fill:color}));t.eventMode='none';t.scale.x=Math.min(1,max/Math.max(1,t.advance));t.position.set(x-(center?Math.min(t.advance,max)/2:0),y-8);return t;
 };
 const row=(parent:Container,s:string,x:number,cy:number,size=18,color=0xf5e8cd,max=195,right=false)=>{const t=label(parent,s,x,0,size,color,max);t.y=cy-t.inkCenterY();if(right)t.x=x-t.width;return t;};
 const close=()=>{opened=false;refresh();};
 const build=()=>{
  for(const child of panel.removeChildren())child.destroy();
  const actual=read(),level=preview===null?actual.level:preview-1,core=actual.core,state=minePanelState(level,core),r=state.recipe;key=`${actual.level}:${core}:${preview}:${funds().gold}:${funds().wood}:${funds().queueUntil??0}`;
  sprite(panel,'charcoal',7,29,526,379);sprite(panel,'frame',0,0,540,458);sprite(panel,'mine',37,53,90,68);
  label(panel,'MINE',155,60,29,0xf5eee0,345);
  label(panel,r?(level===0?'Build Level 1':`Level ${level}  -  Level ${r.level}`):'Level 30 · Maximum level',333,96,24,0xf3cc77,342,true);
  label(panel,'X',511,49,17,0xe8c27b,18);
  const x=panel.addChild(new Container({label:'Close Mine panel',eventMode:'static',cursor:'pointer'}));x.hitArea=new Rectangle(497,34,36,42);x.on('pointertap',e=>{e.stopPropagation();close();});
  sprite(panel,'divider',25,134,490,12);
  label(panel,preview===null?'Current operation':'Target preview',45,255,14,0xdac7a6,205);
  const current=r?.level??30;
  const target=(delta:number)=>{preview=Math.max(1,Math.min(30,current+delta));build();refresh();};
  for(const [sign,x,delta] of [['PREV',40,-1],['NEXT',208,1]] as const){
   label(panel,sign,x,284,11,0xf3cc77,42);
   const b=panel.addChild(new Container({label:delta<0?'Previous target level':'Next target level',eventMode:'static',cursor:'pointer'}));b.hitArea=new Rectangle(x-8,266,40,40);b.on('pointertap',e=>{e.stopPropagation();target(delta);});
  }
  label(panel,`Level ${current}`,137,285,17,0xf5e8cd,120,true);
  const reset=panel.addChild(new Container({label:'Show current operation',eventMode:'static',cursor:'pointer'}));reset.hitArea=new Rectangle(45,302,200,20);reset.on('pointertap',e=>{e.stopPropagation();preview=null;build();refresh();});label(panel,preview===null?'Browse target levels':'Return to current',143,310,11,0xcbbd9e,190,true);
  const heading=(s:string,x:number,y:number)=>{sprite(panel,'header',x,y,222,27);row(panel,s,x+11,y+13.5,16,0xdac7a6,200);};
  if(r){
   heading('REQUIREMENTS',24,147);heading('RESOURCE COST',288,147);
   if(state.requirements[0].satisfied)sprite(panel,'tick',32,193,21,18);else row(panel,'×',35,202,20,0xe29b82,22);
   row(panel,'Stronghold Core',62,202);row(panel,`level ${r.level}`,62,226,18,state.requirements[0].satisfied?0xbadc85:0xe29b82);
   sprite(panel,'gold',301,187,31,30);sprite(panel,'wood',298,224,36,30);
   row(panel,'Gold',345,202,20,0xf5e8cd,65);row(panel,r.gold.toLocaleString('en-US'),512,202,20,0xf4cb6d,90,true);
   row(panel,'Wood',345,239,20,0xf5e8cd,65);row(panel,r.wood.toLocaleString('en-US'),512,239,20,0xf4cb6d,90,true);
   heading(r.operation==='Build'?'BUILD TIME':'UPGRADE TIME',288,255);sprite(panel,'clock',301,292,27,27);row(panel,`${r.minutes.toLocaleString('en-US')} min`,345,305.5,20,0xf5e8cd,160);
   const action=sprite(panel,buildingEligibility(r,state.requirements,funds(),'mine',preview===null).operationAvailable?'button':'button-disabled',123,338,294,54);wireBuildingAction(action,'mine',r,state.requirements,funds,redraw,preview===null);
   const bt=row(panel,r.operation.toUpperCase(),270,365,24,0xddd1b7,245);bt.x=270-bt.width/2;
   label(panel,buildingEligibility(r,state.requirements,funds(),'mine',preview===null).reason,270,460,12,0xcbbd9e,475,true);
  }else label(panel,'Maximum level reached.',270,210,22,0xf5e8cd,450,true);
 };
 const loaded=Promise.all(names.map(async n=>textures.set(n,await Assets.load<Texture>(n==='mine'?'/mine-panels/kit/mine.png':`/core-upgrade/kit-v2/${n}.png`)))).then(()=>{
  if(root.destroyed)return;sprite(hammer,'hammer',-29,-26,65,52);sprite(hammer,'mine',-17,-14,37,28);label(hammer,'Mine',0,37,12,0xf5e8cd,115,true);build();ready=true;refresh();
 });void loaded.catch(e=>console.error('Mine panel artwork failed',e));
 panel.on('pointerdown',e=>e.stopPropagation());panel.on('pointertap',e=>e.stopPropagation());hammer.on('pointerdown',e=>e.stopPropagation());hammer.on('pointertap',e=>{e.stopPropagation();if(!hammer.visible||hammer.eventMode==='none')return;opened=!opened;refresh();});
 const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'&&opened)close();};addEventListener('keydown',onKey);root.once('destroyed',()=>removeEventListener('keydown',onKey));
 return {loaded,place(x:number,y:number,scale:number,w:number,h:number,hx:number,hy:number){
  // Unbuilt Mine is discoverable beside the Core's base-planning interaction.
  near=Math.hypot(hx-CORE_CENTER.x,(hy-CORE_CENTER.y)*2)<=BUILDING_CONTEXT_RADIUS&&!online();root.visible=near&&ready;if(!near)opened=false;
  if(ready){const s=read();if(key!==`${s.level}:${s.core}:${preview}:${funds().gold}:${funds().wood}:${funds().queueUntil??0}`){build();redraw();}}panel.visible=opened;interaction.sync();
  const ax=x+CORE_CENTER.x*scale,ay=y+(CORE_CENTER.y-80)*scale;hammer.position.set(Math.max(40,Math.min(w-40,ax-82)),Math.max(65,Math.min(h-60,ay+64)));
  const s=buildingPanelScale(w,h,478);panel.scale.set(s);panel.position.set(Math.max(12,Math.min(w-540*s-12,ax-270*s)),Math.max(65,Math.min(h-478*s-12,ay-478*s)));
 },snapshot:()=>({eligibility:buildingEligibility(mineRecipe(preview===null?read().level:preview-1),minePanelState(preview===null?read().level:preview-1,read().core).requirements,funds(),'mine',preview===null),interaction:interaction.snapshot(),ready,near,open:opened,previewTarget:preview,actualCompletedLevel:read().level,...minePanelState(preview===null?read().level:preview-1,read().core),operationAvailable:buildingEligibility(mineRecipe(preview===null?read().level:preview-1),minePanelState(preview===null?read().level:preview-1,read().core).requirements,funds(),'mine',preview===null).operationAvailable}),destroy(){removeEventListener('keydown',onKey);root.destroy({children:true});}};
}
