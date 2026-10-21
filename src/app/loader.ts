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
