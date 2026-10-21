// Mobile browsers keep a Stronghold tab alive for hours, so a release never reaches it (a phone
// kept drawing the old striped sun shadows two hours after their fix shipped). When the tab returns
// to view, compare our entry bundle with the one the server lists now and reload on a mismatch.
// Progress and the pinned hour live in localStorage, so the reload loses nothing.
const CHECK_MS=5*60*1000;
const entry=(src:string|null|undefined)=>src?new URL(src,location.href).pathname:null;
export function reloadOnNewBuild(){
 if(!import.meta.env.PROD)return;
 const ours=entry(document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]')?.getAttribute('src'));if(!ours)return;
 let last=Date.now();
 async function check(){
  if(document.hidden||Date.now()-last<CHECK_MS)return;last=Date.now();
  try{const html=await (await fetch(location.pathname,{cache:'no-store'})).text(),theirs=entry(/<script[^>]+type="module"[^>]+src="([^"]*\/assets\/[^"]+\.js)"/.exec(html)?.[1]);if(theirs&&theirs!==ours)location.reload();}catch{}
 }
 document.addEventListener('visibilitychange',check);addEventListener('pageshow',e=>{if(e.persisted){last=0;check();}});
}
