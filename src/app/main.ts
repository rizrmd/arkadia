import {loadingScreen,type Progress} from './loader';
// Arkadia is one page: the server answers every page path with index.html and this router picks the view.
// The Stronghold is the only view today; any other path (including the retired /stronghold.html) lands on it.
type View={mount(root:HTMLElement,progress:Progress):Promise<void>};
const routes:Record<string,()=>Promise<View>>={'/':()=>import('../stronghold/main')};
const path=location.pathname in routes?location.pathname:'/';
if(path!==location.pathname)history.replaceState(history.state,'',path+location.search+location.hash);
const screen=loadingScreen();
void (async()=>{
 try{screen.progress(0,1,'Loading the game');const view=await routes[path]();await view.mount(document.querySelector('#app')!,screen.progress);screen.done();}
 catch(e){console.error('Unable to load Arkadia.',e);screen.fail('The Stronghold could not load. Check your connection and try again.');}
})();
