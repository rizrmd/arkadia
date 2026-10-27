import '../storage-rename';
import {loadingScreen,trackBootCode,type Progress} from './loading-progress';
// Arkodia is one page: the server answers every page path with index.html and this router picks the view.
// The Stronghold is the game; any other path (including the retired /stronghold.html) lands on it.
type View={mount(root:HTMLElement,progress:Progress):Promise<void>};
// /fx-lab previews every hero's skill FX (src/fx/lab.ts).
const routes:Record<string,()=>Promise<View>>={'/':()=>import('../stronghold/main'),'/fx-lab':()=>import('../fx/lab'),'/fx-lab/':()=>import('../fx/lab'),'/dev':()=>import('./dev'),'/dev/':()=>import('./dev')};
const path=location.pathname in routes?location.pathname:'/';
if(path!==location.pathname)history.replaceState(history.state,'',path+location.search+location.hash);
const screen=loadingScreen();
void (async()=>{
 const isDev=path==='/dev'||path==='/dev/';
 const stopCodeProgress=isDev?()=>{}:trackBootCode();
 try{
  // The catalog owns its Pixi canvas and needs no game fonts, HUD or world assets.
  if(isDev){
   const view=await routes[path]();
   await view.mount(document.querySelector('#app')!,screen.progress);
   screen.done();
   return;
  }
  screen.progress(1,100,'Loading game code');
  // Start both dependency graphs together, then prepare graphics and interface
  // assets as soon as the engine arrives instead of waiting for all gameplay code.
  const engine=import('./loader');
  const view=routes[path]();
  const ready=engine.then(({ensurePixiRuntime})=>{stopCodeProgress();return ensurePixiRuntime(document.querySelector('#app')!);});
  const [loadedView]=await Promise.all([view,ready]);
  await loadedView.mount(document.querySelector('#app')!,screen.progress);
  screen.done();
 }
 catch(e){console.error('Unable to load Arkodia.',e);screen.fail('The Stronghold could not load. Check your connection and try again.');}
 finally{stopCodeProgress();}
})();
