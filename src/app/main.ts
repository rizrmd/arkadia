import '../storage-rename';
import {loadingScreen,type Progress} from './loader';
// Arkodia is one page: the server answers every page path with index.html and this router picks the view.
// The Stronghold is the game; any other path (including the retired /stronghold.html) lands on it.
type View={mount(root:HTMLElement,progress:Progress):Promise<void>};
// /fx-lab previews every hero's skill FX (src/fx/lab.ts).
const routes:Record<string,()=>Promise<View>>={'/':()=>import('../stronghold/main'),'/fx-lab':()=>import('../fx/lab'),'/fx-lab/':()=>import('../fx/lab'),'/skill-player':()=>import('../fx/lab'),'/skill-player/':()=>import('../fx/lab')};
const path=location.pathname in routes?location.pathname:'/';
if(path!==location.pathname)history.replaceState(history.state,'',path+location.search+location.hash);
const screen=loadingScreen();
void (async()=>{
 try{screen.progress(0,1,'Loading the game');const view=await routes[path]();await view.mount(document.querySelector('#app')!,screen.progress);screen.done();}
 catch(e){console.error('Unable to load Arkodia.',e);screen.fail('The Stronghold could not load. Check your connection and try again.');}
})();
