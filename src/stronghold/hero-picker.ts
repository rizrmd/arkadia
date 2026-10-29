import {Container} from 'pixi.js';
import {ChooseHero} from './choose-hero';
import {heroChosen,isHero,isHeroReset,saveHero,type HeroId} from './heroes';

// Choose Your Hero (choose-hero.ts), once per device: the first visit opens on it before gameplay starts (main.ts holds
// the hero and the revenants until `picked`), and Begin Journey is the only way out: no Back, Escape does nothing, and
// the HUD does not reopen it. The pick is saved on the device, so later visits and new tabs go straight to the game.
// ?hero=reset forgets the pick and asks again; a ?hero=<id> link plays that hero for the visit without asking.
export function createHeroPicker(uiStage:Container,o:{current:()=>HeroId;choose:(id:HeroId)=>void;renderer?:any}){
 const holder=new Container();
 holder.zIndex=70;
 holder.visible=false;
 uiStage.addChild(holder);

 const q=new URLSearchParams(location.search);
 // Automated browsers play on unless ?pick (or ?hero=reset) asks for the screen.
 const automated=typeof navigator!=='undefined'&&navigator.webdriver&&!q.has('pick');
 const needed=isHeroReset()||!heroChosen()&&!isHero(q.get('hero'))&&!automated;
 let resolvePicked=()=>{};
 const picked=needed?new Promise<void>(r=>{resolvePicked=r;}):Promise.resolve();

 let viewPromise:Promise<ChooseHero>|undefined,view:ChooseHero|undefined;
 const ensureView=()=>viewPromise??=ChooseHero.load(o.current()).then(async v=>{
  v.onConfirm=id=>pick(id);
  await v.layout(innerWidth,innerHeight);
  v.warmGpu(o.renderer);
  holder.addChild(v);view=v;
  return v;
 });
 // Only the first visit needs the screen: load it while the world loads.
 if(needed)void ensureView().catch(console.error);

 const layout=async()=>{const v=await ensureView();await v.layout(innerWidth,innerHeight);v.warmGpu(o.renderer);};
 window.addEventListener('resize',()=>{if(holder.visible)void layout().catch(console.error);});

 function pick(id:HeroId){
  if(!holder.visible)return;
  saveHero(id);
  if(id!==o.current())o.choose(id);
  holder.visible=false;
  view?.stopFx();
  resolvePicked();
 }
 // While open every key belongs to the screen: keys pressed while choosing must not walk the hero.
 const onKey=(e:KeyboardEvent)=>{
  if(!holder.visible||!view)return;
  e.stopPropagation();
  if(view.key(e))e.preventDefault();
 };
 window.addEventListener('keydown',onKey,{capture:true});
 window.addEventListener('keyup',onKey,{capture:true});

 return {
  isOpen:()=>holder.visible,
  view:()=>viewPromise,
  // Resolves once the hero is chosen (at once when this visit does not ask).
  picked,
  needed,
  // Shows the screen on a first visit; resolves once it is on screen, so the loading screen lifts onto it.
  async start(){
   if(!needed||holder.visible)return;
   try{
    const v=await ensureView();
    v.select(o.current());
    await layout();
    holder.visible=true;
   }catch(e){
    // The screen failed to load: play on with the current hero rather than strand the first visit (asks again next time).
    console.error(e);resolvePicked();
   }
  },
 };
}
