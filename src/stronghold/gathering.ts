import {Assets,Container,Graphics,Rectangle,Sprite,Text,Texture} from 'pixi.js';
import {environment,asset,manageHarvestableTreeCollision,ORIGIN} from '../environment/model';
import {FRONTIER_PROPS,FRONTIER_ATLAS} from '../world/frontier';
import {rectColumns} from '../world/frontier';
import {tilePoint,COURT} from './terrain';
import {unproject} from '../isometric';
import {METERS_PER_TILE,GATE,inSafeZone} from './safe-zone';
import {cliffTile,liftAtTile} from '../world/relief';
import {KEY,load} from './economy';
import {prepareInventoryGameplay,setGatheringCapture} from './gameplay-save';
import {readInventory} from './items';
import {advanceClock,CHOP_METERS,TREE_RULES,WILDLIFE_RULES,treeKind,readGathering,readResources,harvest,hunt,collect,respawnTree,respawnAnimal,type Gathering,type Resources,type Point,type TreeKind,type Species} from './gathering-rules';
export type GatherStep={alive:boolean;steering:boolean;busy:boolean};
type Options={worldStage:Container;uiStage:Container;day:number;hero:()=>{x:number;y:number};blocked:(x:number,y:number)=>boolean;changed:()=>void;hudBottom:()=>number};
type Tree={id:string;kind:TreeKind;anchor:Point;width:number;height:number;pivot:[number,number];texture:Texture;image:HTMLImageElement;sprite:Sprite};
const distance=(a:Point,b:Point)=>Math.hypot(a.u-b.u,a.v-b.v)*METERS_PER_TILE;
export async function createGathering(o:Options){
 manageHarvestableTreeCollision();
 const initial=load(localStorage.getItem(KEY));let state=readGathering(initial.gathering,o.day),resources=readResources(initial.resources),error='';
 const trees:Tree[]=[],layer=new Container({label:'Harvestable trees'}),animalsLayer=new Container({label:'Huntable wildlife'});layer.sortableChildren=true;layer.zIndex=10.67;animalsLayer.zIndex=19;animalsLayer.sortableChildren=true;o.worldStage.addChild(layer,animalsLayer);
 const hud=new Container({label:'Wood and Food resources'});hud.zIndex=12;o.uiStage.addChild(hud);
 const status=new Text({text:'',style:{fontFamily:'Georgia',fontSize:13,fill:0xffe3a0,wordWrap:true,wordWrapWidth:270}});status.position.set(12,64);
 const bg=new Graphics().roundRect(0,0,252,55,8).fill({color:0x171e21,alpha:.94}).stroke({color:0xb59a61,width:1});
 const wood=new Text({text:'',style:{fontFamily:'Georgia',fontSize:15,fill:0xf1dfb4}}),food=new Text({text:'',style:{fontFamily:'Georgia',fontSize:15,fill:0xf1dfb4}});wood.position.set(36,7);food.position.set(161,7);
 const icons=new Graphics().roundRect(9,15,22,9,3).fill(0x94613e).ellipse(12,19,4,5).fill(0xc89b62).stroke({color:0x61422b,width:1}).ellipse(12,19,2,3).stroke({color:0x765335,width:1});
 // Meat silhouette with a white bone; the same icon is used on loot.
 function meat(g:Graphics,x=0,y=0,s=1){g.circle(x+21*s,y+17*s,3*s).circle(x+23*s,y+14*s,3*s).fill(0xf4ead8).moveTo(x+15*s,y+12*s).lineTo(x+21*s,y+16*s).stroke({color:0xf4ead8,width:4*s}).ellipse(x+10*s,y+9*s,9*s,7*s).fill(0xa83e42).stroke({color:0xe79278,width:s});}
 meat(icons,131,5);const tool=new Text({text:'Axe • automatic chopping within 5 ft',style:{fontFamily:'Georgia',fontSize:11,fill:0xc5bdac}});tool.position.set(9,36);hud.addChild(bg,icons,wood,food,tool,status);
 const progress=new Graphics();progress.y=58;hud.addChild(progress);
 let active:string|null=null,chopMs=0,retry=0,animationMs=0,lastUi='',sceneVersion=0,axeOwned=readInventory(initial.inventory).axe>0;
 const heroTile=()=>{const p=o.hero(),t=unproject(p.x-COURT.x,p.y-COURT.y);return {u:t.x,v:t.y};};
 function persist(){
  const root=load(localStorage.getItem(KEY));root.resources=structuredClone(resources);root.gathering=structuredClone(state);
  const acknowledge=prepareInventoryGameplay(root);root.revision++;localStorage.setItem(KEY,JSON.stringify(root));acknowledge();
 }
 function commit(change:()=>boolean){const old=structuredClone(state),oldR=structuredClone(resources);try{if(!change())return false;persist();return true;}catch(e){state=old;resources=oldR;error=(e as Error).message;active=null;chopMs=0;return false;}}
 setGatheringCapture(root=>{if(error)throw Error('Gathering save failed: '+error);root.gathering=structuredClone(state);root.resources=structuredClone(resources);});
 async function addTree(id:string,kind:TreeKind,anchor:Point,texture:Texture,width:number,height:number,pivot:[number,number],flip=false){
  const canvas=document.createElement('canvas');canvas.width=texture.frame.width;canvas.height=texture.frame.height;const c=canvas.getContext('2d')!;c.drawImage(texture.source.resource as CanvasImageSource,texture.frame.x,texture.frame.y,texture.frame.width,texture.frame.height,0,0,canvas.width,canvas.height);
  const image=new Image();image.src=canvas.toDataURL();await image.decode();
  const sprite=new Sprite(texture);sprite.anchor.set(...pivot);sprite.width=width;sprite.height=height;if(flip)sprite.scale.x*=-1;layer.addChild(sprite);
  trees.push({id,kind,anchor,texture,width,height,pivot,image,sprite});state.trees[id]??={...anchor,cycle:0,readyDay:state.day,down:false};
 }
 {const atlas=await Assets.load<Texture>(FRONTIER_ATLAS);for(const p of FRONTIER_PROPS){const kind=treeKind(p.asset);if(kind)await addTree(p.key,kind,{u:p.u,v:p.v},new Texture({source:atlas.source,frame:new Rectangle(...p.frame)}),p.width,p.height,p.pivot,p.flip);}}
 for(const p of environment().objects){const kind=treeKind(p.asset);if(!kind)continue;const a=asset(p.asset),base=await Assets.load<Texture>(a.file),tex=a.frame?new Texture({source:base.source,frame:new Rectangle(...a.frame as [number,number,number,number])}):base;await addTree('map:'+environment().revision+':'+p.id,kind,{u:p.u-ORIGIN.u,v:p.v-ORIGIN.v},tex,a.width,a.height,a.pivot as [number,number]);}
 // Wildlife slots are stable per map. At most one pending animal/loot per slot;
 // missed days do not accumulate an exploitable backlog.
 const prefix='wild:'+environment().revision+':';
 const specs=Object.entries(WILDLIFE_RULES).map(([species])=>({id:prefix+species,species:species as Species}));
 function clear(p:Point){const w=tilePoint(p.u,p.v);return !inSafeZone(p)&&!o.blocked(w.x,w.y)&&liftAtTile(p.u,p.v)===0;}
 function animalPoint(species:Species):Point|null{
  const pond=environment().objects.find(p=>p.asset.startsWith('pond-'));
  const anchor=species==='crocodile'&&pond?{u:pond.u-ORIGIN.u,v:pond.v-ORIGIN.v}:{u:GATE.u+(species==='deer'?4:-3),v:GATE.v+5};
  for(let n=0;n<80;n++){const a=n*.7,r=1+n*.12,p={u:anchor.u+Math.cos(a)*r,v:anchor.v+Math.sin(a)*r};if(clear(p)&&trees.every(t=>state.trees[t.id].down||distance(p,state.trees[t.id])>2))return p;}return null;
 }
 for(const spec of specs)if(!state.animals[spec.id]){const p=animalPoint(spec.species);if(p)state.animals[spec.id]={...p,cycle:0,readyDay:state.day,status:'alive'};}
 const atlasTex=await Assets.load<Texture>('/wildlife/gathering-atlas.webp');
 const clipNames=['deer-walk','deer-run','crocodile-crawl','crocodile-swim'];
 const clipDurations=[1600,800,2400,2000];
 const frames=clipNames.map((_,row)=>Array.from({length:16},(_,i)=>new Texture({source:atlasTex.source,frame:new Rectangle(i*128,row*128,128,128)})));
 const animalViews=specs.map((spec,i)=>{const sprite=new Sprite(frames[i===0?0:2][0]),loot=new Container(),g=new Graphics();meat(g,-16,-18,1.2);loot.addChild(g);const label=new Text({text:`${WILDLIFE_RULES[spec.species].food} Food`,style:{fontFamily:'Georgia',fontSize:12,fill:0xffdfad,stroke:{color:0x151c21,width:3}}});label.anchor.set(.5);label.y=-27;loot.addChild(label);sprite.anchor.set(.5,.82);animalsLayer.addChild(sprite,loot);return {...spec,sprite,loot};});
 let scene:any[]=[];
 function refreshScene(){
  scene=trees.filter(t=>!state.trees[t.id].down).map(t=>{const p=state.trees[t.id],w=tilePoint(p.u,p.v);return {layer:'world',id:'gather:'+t.id,x:w.x+t.width*(.5-t.pivot[0]),y:w.y,width:t.width,height:t.height,foot:t.pivot[1],shear:0,vertical:1,depth:w.y,opacity:1,file:'gather:'+t.id,selected:false,occluder:undefined,image:t.image,gatherColumns:rectColumns(p.u,p.v,1,[-.12,-.12,.12,.12]).map(c=>({...c,height:t.height*.8}))};});sceneVersion++;
  o.changed();
 }
 function updateUi(){
  const counts=JSON.stringify([resources.wood,resources.food,active,error]);if(counts!==lastUi){lastUi=counts;wood.text=resources.wood.toLocaleString('en-US')+' Wood';food.text=resources.food.toLocaleString('en-US')+' Food';}
  const hasAxe=axeOwned;
  tool.text=hasAxe?'Axe • automatic chopping within 5 ft':'Axe required to chop trees';
  status.text=error?'Save failed. Reload after freeing storage.':active?`Chopping • ${(chopMs/1000).toFixed(1)} / ${TREE_RULES[trees.find(t=>t.id===active)!.kind].ms/1000}s`:'';
  progress.clear();if(active){const rule=TREE_RULES[trees.find(t=>t.id===active)!.kind];progress.roundRect(0,0,252,4,2).fill(0x3b3e39).roundRect(0,0,252*Math.min(1,chopMs/rule.ms),4,2).fill(0xd8bd7d);}
  hud.position.set(Math.max(8,innerWidth-264),o.hudBottom()+8);hud.scale.set(Math.min(1,(innerWidth-16)/252));
 }
 function target(reachTiles:number){const p=heroTile();return specs.map(s=>({...s,a:state.animals[s.id]})).filter(s=>s.a?.status==='alive'&&distance(p,s.a)<=reachTiles*METERS_PER_TILE&&!cliffTile(p.u,p.v,s.a.u,s.a.v)).sort((a,b)=>distance(p,a.a)-distance(p,b.a))[0]??null;}
 function impact(reachTiles:number){const t=target(reachTiles);if(t&&commit(()=>hunt(state,t.id,t.species)))return true;return false;}
 function step(dt:number,context:GatherStep){
  if(error)return;advanceClock(state,dt);animationMs+=dt;retry+=dt;const p=heroTile();
  if(retry>=1000){retry=0;axeOwned=readInventory(load(localStorage.getItem(KEY)).inventory).axe>0;let changed=false;commit(()=>{
   for(const t of trees)changed=respawnTree(state,t.id,t.anchor,METERS_PER_TILE,q=>{if(!clear(q))return false;return trees.every(other=>other.id===t.id||state.trees[other.id].down||distance(q,state.trees[other.id])>2);},Math.random)||changed;
   for(const spec of specs){const a=state.animals[spec.id];if(a?.status==='waiting'&&state.day>=a.readyDay){const q=animalPoint(spec.species);if(q)changed=respawnAnimal(state,spec.id,q)||changed;}}
   return changed;
  });if(changed)refreshScene();}
  if(context.alive){for(const s of specs){const a=state.animals[s.id];if(a?.status==='loot'&&distance(p,a)<=CHOP_METERS&&!cliffTile(p.u,p.v,a.u,a.v))commit(()=>collect(state,resources,s.id,s.species));}}
  const axe=readInventory(JSON.parse(localStorage.getItem(KEY)||'{}').inventory).axe>0;axeOwned=axe;
  const near=context.alive&&!context.steering&&!context.busy&&axe?trees.filter(t=>!state.trees[t.id].down&&distance(p,state.trees[t.id])<=CHOP_METERS&&!cliffTile(p.u,p.v,state.trees[t.id].u,state.trees[t.id].v)).sort((a,b)=>distance(p,state.trees[a.id])-distance(p,state.trees[b.id]))[0]:undefined;
  if(near?.id!==active){active=near?.id??null;chopMs=0;}
  if(near){chopMs+=dt;if(chopMs>=TREE_RULES[near.kind].ms){if(commit(()=>harvest(state,resources,near.id,near.kind)))refreshScene();active=null;chopMs=0;}}
  updateUi();
 }
 let origin={x:0,y:0,scale:1};
 function place(x:number,y:number,scale:number){origin={x,y,scale};render();}
 function render(){
  const {x,y,scale}=origin;
  for(const t of trees){const a=state.trees[t.id],p=tilePoint(a.u,a.v);t.sprite.visible=!a.down&&x+(p.x+t.width)*scale>0&&x+(p.x-t.width)*scale<innerWidth&&y+p.y*scale>0&&y+(p.y-t.height)*scale<innerHeight;t.sprite.position.set(x+p.x*scale,y+p.y*scale);t.sprite.width=t.width*scale;t.sprite.height=t.height*scale;t.sprite.zIndex=p.y;}
  const clips=specs.map(s=>s.species==='deer'?(distance(heroTile(),state.animals[s.id]??GATE)<6?'deer-run':'deer-walk'):(environment().objects.some(p=>p.asset.startsWith('pond-')&&distance({u:p.u-ORIGIN.u,v:p.v-ORIGIN.v},state.animals[s.id]??GATE)<5)?'crocodile-swim':'crocodile-crawl'));
  for(const v of animalViews){const a=state.animals[v.id];const clip=clipNames.indexOf(clips[v.species==='deer'?0:1]);v.sprite.texture=frames[clip][Math.floor(animationMs/clipDurations[clip]*16)%16];v.sprite.visible=a?.status==='alive';v.loot.visible=a?.status==='loot';if(!a)continue;const p=tilePoint(a.u,a.v);v.sprite.position.set(x+p.x*scale,y+p.y*scale);v.sprite.width=v.sprite.height=(v.species==='deer'?125:155)*scale;v.loot.position.copyFrom(v.sprite.position);v.loot.scale.set(scale);v.sprite.zIndex=p.y;}
 }
 const api={step,target,impact,place,render,day:()=>state.day,scene:()=>scene,version:()=>sceneVersion,chopping:()=>!!active,snapshot:()=>({resources:structuredClone(resources),state:structuredClone(state),active,chopMs,error,trees:trees.map(t=>({id:t.id,kind:t.kind,anchor:t.anchor,...state.trees[t.id]})),animals:specs.map(s=>({...s,...state.animals[s.id]})),ui:{x:hud.x,y:hud.y,width:252,height:90}})};
 refreshScene();updateUi();(window as any).__GATHERING__=api;return api;
}
export type GatheringController=Awaited<ReturnType<typeof createGathering>>;
