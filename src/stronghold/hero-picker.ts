import {Container,Graphics} from 'pixi.js';
import {HeroSelect} from '../typography/hero-select';
import {isHero,isHeroReset,saveHero,type HeroId} from './heroes';

const SESSION_KEY='arkadia.hero.picked';
const HERO_ORDER:HeroId[]=['ember-warden','rift-runner'];

export function createHeroPicker(uiStage:Container,o:{current:()=>HeroId;choose:(id:HeroId)=>void}){
 const holder=new Container();
 holder.zIndex=70;
 holder.visible=false;
 holder.eventMode='static';
 uiStage.addChild(holder);

 const backdrop=holder.addChild(new Graphics());
 backdrop.eventMode='static';

 let viewPromise:Promise<HeroSelect>|undefined;
 let viewRef:HeroSelect|undefined;
 let done:(()=>void)|null=null;

 const ensureView=async()=>{
  if(viewPromise)return viewPromise;
  viewPromise=HeroSelect.load('/choosing-hero/v1/','/typography/v2/hero/logo@3x.png',{},o.current()).then(v=>{
   viewRef=v;
   v.onConfirm=(id)=>pick(id);
   v.onBack=()=>pick(o.current());
   holder.addChild(v);
   layout();
   return v;
  });
  return viewPromise;
 };

 // Warm the HeroSelect assets in the background
 void ensureView().catch(console.error);

 function layout(){
  if(!holder.visible)return;
  const w=innerWidth,h=innerHeight;
  backdrop.clear().rect(0,0,w,h).fill({color:0x0c1116,alpha:0.96});
  viewRef?.layout(w,h);
 }
 window.addEventListener('resize',layout);

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

 window.addEventListener('keydown',e=>{
  if(!holder.visible)return;
  if(e.key==='Escape'){
   e.preventDefault();
   e.stopPropagation();
   pick(o.current());
   return;
  }
  if(e.key==='Enter'){
   e.preventDefault();
   e.stopPropagation();
   pick(viewRef?.hero??o.current());
   return;
  }
  const step=e.key==='ArrowRight'||e.key==='ArrowDown'?1:e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:0;
  if(step&&viewRef){
   e.preventDefault();
   e.stopPropagation();
   const idx=HERO_ORDER.indexOf(viewRef.hero);
   const next=HERO_ORDER[(idx+step+HERO_ORDER.length)%HERO_ORDER.length];
   viewRef.select(next);
  }
 },{capture:true});

 async function open(){
  if(holder.visible)return;
  const v=await ensureView();
  v.select(o.current());
  holder.visible=true;
  layout();
  return new Promise<void>(r=>{done=r;});
 }

 return {
  open,
  isOpen:()=>holder.visible,
  start(){
   if(isHeroReset())return open();
   let picked='';try{picked=sessionStorage.getItem(SESSION_KEY)||'';}catch{}
   const q=new URLSearchParams(location.search);
   return picked||isHero(q.get('hero'))||(navigator.webdriver&&!q.has('pick'))?Promise.resolve():open();
  },
 };
}
