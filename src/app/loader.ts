// Drives the loading screen that index.html paints before any script runs.
// A view reports progress as done/total steps; the bar never moves backwards.
export type Progress=(done:number,total:number,label:string)=>void;
export function loadingScreen(){
 const screen=document.querySelector<HTMLElement>('#loading-screen')!,q=<T extends Element>(s:string)=>screen.querySelector(s) as T;
 const fill=q<HTMLElement>('.loading-fill'),label=q<HTMLElement>('.loading-label'),percent=q<HTMLElement>('.loading-percent');
 // Artwork still in flight after a failure keeps reporting; it must not overwrite the error.
 let shown=0,failed=false;
 const progress:Progress=(done,total,text)=>{if(failed)return;
  shown=Math.max(shown,Math.round(100*Math.min(1,done/Math.max(1,total))));
  fill.style.transform=`scaleX(${shown/100})`;screen.setAttribute('aria-valuenow',String(shown));label.textContent=text;percent.textContent=shown+'%';
 };
 return {progress,
  done(){progress(1,1,'Ready');screen.dataset.state='done';setTimeout(()=>screen.remove(),600);},
  // Failed loads keep the screen up with the reason and a reload, instead of leaving a blank world.
  fail(message:string){failed=true;screen.dataset.state='error';label.textContent=message;percent.textContent='';
   const retry=document.createElement('button');retry.type='button';retry.className='loading-retry';retry.textContent='Try again';retry.onclick=()=>location.reload();q('.loading-card').append(retry);}};
}
// Artwork downloads count received bytes, so the bar moves with the transfer instead of with finished files:
// a few large textures arriving last no longer hold it near the end. Each URL is fetched once; a view asks
// for the same image again (the hero and revenant atlases) and shares the download.
type Download={received:number;size?:number};
const downloads=new Map<string,Download>(),images=new Map<string,Promise<HTMLImageElement>>(),listeners=new Set<()=>void>(),sizes=new Map<string,number>();
// The build lists every public image's byte size in /asset-sizes.json (vite.config.ts), so the total is exact
// before any download has answered. Without it, Content-Length headers fill the sizes in as they arrive.
export async function expectSizes(){try{for(const [file,size] of Object.entries(await (await fetch('/asset-sizes.json')).json() as Record<string,number>))sizes.set(file,size);}catch(e){console.warn('No asset sizes; the loading bar estimates them.',e);}}
// Files whose length is not known yet count as the average known file until their headers arrive.
export function downloadedBytes(){
 const all=[...downloads.values()],known=all.filter(d=>d.size!==undefined),guess=known.length?known.reduce((a,d)=>a+d.size!,0)/known.length:256e3;
 return {received:all.reduce((a,d)=>a+d.received,0),expected:all.reduce((a,d)=>a+Math.max(d.received,d.size??guess),0)};
}
export function onDownload(listener:()=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};}
const changed=()=>listeners.forEach(l=>l());
export function loadImage(url:string){
 let image=images.get(url);if(image)return image;
 const d:Download={received:0,size:sizes.get(url.split('?')[0])};downloads.set(url,d);changed();
 image=(async()=>{
  const response=await fetch(url);if(!response.ok)throw new Error(`${url} answered ${response.status}`);
  // A compressed body streams more bytes than its Content-Length, so only an identity length is trusted.
  const length=Number(response.headers.get('content-length')),encoded=(response.headers.get('content-encoding')||'identity')!=='identity';
  if(length>0&&!encoded&&d.size!==length){d.size=length;changed();}
  const chunks:BlobPart[]=[],reader=response.body?.getReader();
  if(reader)for(let r=await reader.read();!r.done;r=await reader.read()){chunks.push(r.value);d.received+=r.value.byteLength;changed();}
  else{const all=await response.arrayBuffer();chunks.push(all);d.received=all.byteLength;}
  d.size=d.received;changed();
  const source=URL.createObjectURL(new Blob(chunks,{type:response.headers.get('content-type')||''})),result=new Image();
  try{result.src=source;await result.decode();}finally{URL.revokeObjectURL(source);}
  return result;
 })();
 images.set(url,image);return image;
}
