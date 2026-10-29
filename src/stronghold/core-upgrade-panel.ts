import {wireBuildingAction} from './building-panel-action';
import {BUILDING_CONTEXT_RADIUS,buildingPanelScale,buildingEligibility,type BuildingFunds} from './building-panel-policy';
import {registerBuildingInteraction} from './building-interactions';
import {Assets,Container,Graphics,Rectangle,Sprite,Texture} from 'pixi.js';
import {MsdfText} from '../typography/text';
import {CORE_CENTER} from './core-placement';
import coreArt from './core-art.json';

// Published Stronghold Core recipe: direct baseline calculation, never rounded compounding.
import {coreUpgradeRecipe} from './building-recipes';
export {coreUpgradeRecipe} from './building-recipes';
export function coreUpgradeHeader(level:number){
 coreUpgradeRecipe(level);
 return level===1?'campfire':`core-${String(coreArt.levels[level-1].milestone).padStart(2,'0')}`;
}
export const nearCore=(x:number,y:number)=>Math.hypot(x-CORE_CENTER.x,(y-CORE_CENTER.y)*2)<=BUILDING_CONTEXT_RADIUS;
export function createCoreUpgradePanel(stage:Container,level:number,online:()=>boolean,redraw:()=>void,funds:()=>BuildingFunds=()=>({gold:0,wood:0})){
 let opened=false,near=false;
 const root=stage.addChild(new Container({label:'Stronghold Core upgrade',eventMode:'passive'}));root.zIndex=45;
 const hammer=root.addChild(new Container({label:'View Core upgrade',eventMode:'static',cursor:'pointer'}));
 hammer.hitArea=new Rectangle(-26,-26,52,52);
 const panel=root.addChild(new Container({label:'Core upgrade details',eventMode:'static'}));
 const interaction=registerBuildingInteraction(stage,root,hammer,()=>opened,panel,()=>{opened=false;refresh();});
 const refresh=()=>{panel.visible=opened;interaction.sync();redraw();};
 root.visible=false;
 const width=540,height=478;
 panel.hitArea=new Rectangle(0,0,width,height);
 let header=coreUpgradeHeader(level);
 const assets=['core-01','core-05','core-10','core-15','core-20','core-25','core-30','frame','charcoal','hammer',header,'header','gold','wood','clock','tick','divider','button','button-disabled','button-pressed'];
 let ready=false;
 const textures=new Map<string,Texture>();
 const sprite=(parent:Container,name:string,x:number,y:number,w:number,h:number)=>{
  const art=parent.addChild(new Sprite(textures.get(name)));art.position.set(x,y);art.width=w;art.height=h;return art;
 };
 const text=(s:string,x:number,y:number,size=16,color=0xf5e8cd,max=348,center=false)=>{
  const t=panel.addChild(new MsdfText({font:'body',size,letterSpacing:0,fill:color},s,{lineHeight:size*1.3,fill:color}));
  t.eventMode='none';
  if(t.advance>max)t.scale.x=max/t.advance;
  t.position.set(x-(center?Math.min(t.advance,max)/2:0),y-8);return t;
 };
 const rowText=(s:string,x:number,cy:number,size:number,color:number,max:number,right=false)=>{
  const t=text(s,x,0,size,color,max);t.y=cy-t.inkCenterY();if(right)t.x=x-t.width;return t;
 };
 let eligibilityText:MsdfText|undefined,eligibilityKey='';
 let recipe=coreUpgradeRecipe(level);
 const build=()=>{
  for(const child of panel.removeChildren())child.destroy();for(const child of hammer.removeChildren())child.destroy();
  level=funds().coreLevel??level;header=coreUpgradeHeader(level);recipe=coreUpgradeRecipe(level);
  // All decorative art is supplied bitmap imagery. Only invisible hit areas and the hairline column separator use geometry.
  sprite(hammer,'hammer',-29,-26,65,52);
  sprite(panel,'charcoal',7,30,526,379);
  sprite(panel,'frame',0,0,width,458);
  sprite(panel,header,35,48,95,76);
  text('STRONGHOLD CORE',153,60,27,0xf5eee0,350);
  text('×',511,49,19,0xe8c27b,18);
  const close=panel.addChild(new Container({label:'Close Core upgrade',eventMode:'static',cursor:'pointer'}));
  close.hitArea=new Rectangle(497,34,36,42);close.on('pointertap',e=>{e.stopPropagation();opened=false;refresh();});
  sprite(panel,'divider',25,134,490,12);
  const heading=(s:string,x:number,y:number)=>{sprite(panel,'header',x,y,222,27);rowText(s,x+11,y+13.5,16,0xdac7a6,200);};
  if(recipe){
   text(`Level ${level}  -  Level ${recipe.level}`,333,96,25,0xf3cc77,342,true);
   heading('REQUIREMENTS',24,147);heading('RESOURCE COST',288,147);
   panel.addChild(new Graphics().moveTo(270,150).lineTo(270,306).stroke({color:0x84643c,width:.7}));
   const rows=[`Core level ${level}`];
   rows.forEach((s,i)=>{const y=187+i*30;if(i===0)sprite(panel,'tick',34,y-1,21,18);else text('•',36,y,20,0xc7ae79,20);text(s,65,y,18,0xf5e8cd,192);});
   sprite(panel,'gold',301,187,31,30);sprite(panel,'wood',298,224,36,30);
   rowText('Gold',345,202,20,0xf5e8cd,65);rowText(recipe.gold.toLocaleString('en-US'),512,202,20,0xf4cb6d,90,true);
   rowText('Wood',345,239,20,0xf5e8cd,65);rowText(recipe.wood.toLocaleString('en-US'),512,239,20,0xf4cb6d,90,true);
   heading('UPGRADE TIME',288,255);
   sprite(panel,'clock',301,292,27,27);rowText(`${recipe.minutes.toLocaleString('en-US')} min`,345,305.5,20,0xf5e8cd,160);
   const button=sprite(panel,buildingEligibility(recipe,[{satisfied:true}],funds(),'core').operationAvailable?'button':'button-disabled',123,338,294,54);wireBuildingAction(button,'core',recipe,[{satisfied:true}],funds,redraw);
   rowText('UPGRADE',270,365,25,0xddd1b7,245);const buttonText=panel.children[panel.children.length-1];buttonText.x=270-buttonText.width/2;
   eligibilityText=text(buildingEligibility(recipe,[{satisfied:true}],funds(),'core').reason,270,460,12,0xcbbd9e,475,true);
  }else{
   text('Level 30 · Maximum level',333,97,23,0xe8c27b,340,true);
   text('No further Core upgrade.',270,200,20,0xf5e8cd,450,true);
  }
 };
 const loaded=Promise.all(assets.map(async name=>{textures.set(name,await Assets.load<Texture>(`/core-upgrade/kit-v2/${name}.png`));})).then(()=>{if(root.destroyed)return;build();ready=true;refresh();});
 // Avoid partial decorative approximations while the small bitmap kit loads.
 void loaded.catch(error=>console.error('Core upgrade artwork could not load',error));
 panel.on('pointerdown',e=>e.stopPropagation());panel.on('pointertap',e=>e.stopPropagation());
 hammer.on('pointerdown',e=>e.stopPropagation());hammer.on('pointertap',e=>{e.stopPropagation();if(!hammer.visible||hammer.eventMode==='none')return;opened=!opened;refresh();});
 const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'&&opened){opened=false;refresh();}};
 addEventListener('keydown',onKey);root.once('destroyed',()=>removeEventListener('keydown',onKey));
 return {place(x:number,y:number,scale:number,w:number,h:number,hx:number,hy:number){
  const nextKey=JSON.stringify(funds());
  if(ready&&eligibilityKey!==nextKey){eligibilityKey=nextKey;build();}
  if(eligibilityText&&eligibilityKey!==nextKey){eligibilityKey=nextKey;eligibilityText.text=buildingEligibility(recipe,[{satisfied:true}],funds(),'core').reason;eligibilityText.scale.x=Math.min(1,475/Math.max(1,eligibilityText.advance));eligibilityText.x=270-Math.min(475,eligibilityText.advance)/2;redraw();}
  near=nearCore(hx,hy)&&!online();root.visible=near&&ready;if(!near)opened=false;
  panel.visible=opened;interaction.sync();
  const ax=x+CORE_CENTER.x*scale,ay=y+(CORE_CENTER.y-80)*scale;
  hammer.position.set(ax,ay);
  const s=buildingPanelScale(w,h,478);panel.scale.set(s);
  panel.position.set(Math.max(12,Math.min(w-540*s-12,ax-270*s)),Math.max(65,Math.min(h-478*s-12,ay-478*s)));
 },loaded,snapshot:()=>({eligibility:buildingEligibility(recipe,[{satisfied:true}],funds(),'core'),interaction:interaction.snapshot(),ready,near,open:opened,level,header,recipe,requirements:recipe?[`Core level ${level}`]:[],operationAvailable:buildingEligibility(recipe,[{satisfied:true}],funds(),'core').operationAvailable})};
}
