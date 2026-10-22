import {Container} from 'pixi.js';
import {ChooseHero} from './choose-hero';
import {isHero,isHeroReset,saveHero,type HeroId} from './heroes';

// Hero selection over the live world (choose-hero.ts): a new tab opens on it (a reload in the same tab keeps the pick),
// with the last pick on this device selected; the hero's name in the HUD reopens it at any time. Begin Journey swaps
// the hero in place, keeping its spot, health and room; Back keeps the current hero.
const SESSION_KEY='arkadia.hero.picked';

export function createHeroPicker(uiStage:Container,o:{current:()=>HeroId;choose:(id:HeroId)=>void}){
 const holder=new Container();
 holder.zIndex=70;
 holder.visible=false;
 uiStage.addChild(holder);

 let viewPromise:Promise<ChooseHero>|undefined,view:ChooseHero|undefined;
 let done:(()=>void)|null=null;
 const ensureView=()=>viewPromise??=ChooseHero.load(o.current()).then(v=>{
  v.onConfirm=id=>pick(id);
  v.onBack=()=>pick(o.current());
  holder.addChild(v);view=v;
  return v;
 });
 // Warm the screen's assets in the background.
 void ensureView().catch(console.error);

 const layout=async()=>{const v=await ensureView();await v.layout(innerWidth,innerHeight);};
 window.addEventListener('resize',()=>{if(holder.visible)void layout().catch(console.error);});

 function hide(){
  holder.visible=false;
  const d=done;done=null;d?.();
 }
 function pick(id:HeroId){
  try{sessionStorage.setItem(SESSION_KEY,id);}catch{}
  saveHero(id);
  if(id!==o.current())o.choose(id);
  hide();
 }
 // While open every key belongs to the screen: keys pressed while choosing must not walk the hero.
 const onKey=(e:KeyboardEvent)=>{
  if(!holder.visible||!view)return;
  e.stopPropagation();
  if(view.key(e))e.preventDefault();
 };
 window.addEventListener('keydown',onKey,{capture:true});
 window.addEventListener('keyup',onKey,{capture:true});

 async function open(){
  if(holder.visible)return;
  const v=await ensureView();
  v.select(o.current());
  await layout();
  holder.visible=true;
  return new Promise<void>(r=>{done=r;});
 }

 return {
  open,
  isOpen:()=>holder.visible,
  view:()=>viewPromise,
  // A new tab asks once; a reload in the same tab (or a ?hero=<id> link) plays on; ?hero=reset asks again.
  start(){
   if(isHeroReset())return open();
   let picked='';try{picked=sessionStorage.getItem(SESSION_KEY)||'';}catch{}
   const q=new URLSearchParams(location.search);
   return picked||isHero(q.get('hero'))||(navigator.webdriver&&!q.has('pick'))?Promise.resolve():open();
  },
 };
}
