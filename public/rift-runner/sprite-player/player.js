// Arkadia sprite player: plays one row of a grid sprite sheet (rows = headings, columns = frames).
// Built to sit in an iframe. Configure with query parameters:
//   manifest=sheets/rift-runner-idle.js     sheet description (default); paths inside resolve against it. A .js description
//                                          calls spritePlayerSheet({...}) and also loads in sandboxed frames; .json needs CORS there
//   hero=ember-warden|rift-runner           built-in hero idle sheet shortcut (ember / ember-warden / rift / rift-runner)
//   sheet=URL&cell=384[,384]&cols=8&rows=8&pivot=192,360&fps=5&labels=N,NE,E,SE,S,SW,W,NW   a sheet without a manifest
//   row=S|4  fps=5  frame=0  bg=dark|light|checker|snow  guides=1  all=1  autoplay=0  loop=0 (play once)
//   zoom=1.5   start zoomed (0.5–4); drag pans when zoomed, Ctrl+wheel / +, −, 0 zoom and reset
//   controls=full|min|simple|none   simple = only Play/Pause, Loop/Once and zoom, for embeds
// Parent pages can drive it with postMessage({type:'sprite-player',action:'play'|'pause'|'row'|'frame'|'fps',value}).
(()=>{
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),dpr=()=>Math.min(window.devicePixelRatio||1,3);
const player=$('player'),stage=$('stage'),canvas=$('canvas'),ctx=canvas.getContext('2d'),status=$('status');
const ZOOMS=[0.5,0.75,1,1.25,1.5,2,3,4];
const state={ready:false,playing:true,loop:true,zoom:1,pan:[0,0],row:0,frame:0,fps:5,all:false,guides:false,bg:'dark',source:null,drawn:null};
let sheet,images={},last=0,elapsed=0,raf=0;
window.spritePlayer={state,get sheet(){return sheet}};

const fail=message=>{status.textContent=message;status.classList.add('error');state.error=message;};
const list=(v,fn=Number)=>v==null||v===''?null:String(v).split(',').map(s=>fn(s.trim()));
const HERO_SHEETS={ember:'sheets/ember-warden-idle.js','ember-warden':'sheets/ember-warden-idle.js',rift:'sheets/rift-runner-idle.js','rift-runner':'sheets/rift-runner-idle.js'};
async function loadSheet(){
 if(params.has('sheet')){
  const cell=list(params.get('cell'))||[256],cols=+params.get('cols')||1,rows=+params.get('rows')||1;
  return {name:params.get('name')||'Sprite sheet',sheet:new URL(params.get('sheet'),location.href).href,cell:[cell[0],cell[1]??cell[0]],columns:cols,rows,
   pivot:list(params.get('pivot')),fps:+params.get('fps')||8,rowLabels:list(params.get('labels'),String)};
 }
 const hero=(params.get('hero')||'').toLowerCase();
 const url=new URL(params.get('manifest')||HERO_SHEETS[hero]||'sheets/rift-runner-idle.js',location.href);let m;
 if(url.pathname.endsWith('.js'))m=await new Promise((resolve,reject)=>{const script=document.createElement('script');window.spritePlayerSheet=resolve;
  script.onerror=()=>reject(Error('Sheet description could not be loaded'));script.src=url;document.head.append(script);});
 else{const response=await fetch(url);if(!response.ok)throw Error(`Sheet description could not be loaded (${response.status})`);m=await response.json();}
 for(const k of ['sheet','sheetHalf'])if(m[k])m[k]=new URL(m[k],url).href;
 return m;
}
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image;img.decoding='async';img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Sprite sheet image could not be loaded'));img.src=src;});}
const frames=()=>sheet.frames||sheet.columns,label=r=>sheet.rowLabels?.[r]??`Row ${r+1}`;

// Use the half-size sheet while a cell is drawn at half size or smaller; fetch the full sheet only when it is needed.
function pickImage(cellDevicePx){
 const wantFull=!sheet.sheetHalf||cellDevicePx>sheet.cell[0]*0.55;
 if(wantFull&&!images.full&&!images.loadingFull){images.loadingFull=loadImage(sheet.sheet).then(img=>{images.full=img;draw();}).catch(e=>images.half||fail(e.message));}
 return wantFull&&images.full?['full',images.full]:images.half?['half',images.half]:['full',images.full];
}
function drawCell(img,scaleOfSheet,row,frame,x,y,w,h){
 const [cw,ch]=sheet.cell,sw=cw*scaleOfSheet,sh=ch*scaleOfSheet;
 ctx.drawImage(img,frame*sw,row*sh,sw,sh,x,y,w,h);
 if(state.guides&&sheet.pivot){
  const px=Math.round(x+sheet.pivot[0]/cw*w)+.5,py=Math.round(y+sheet.pivot[1]/ch*h)+.5,s=Math.max(4,w*.03);
  ctx.strokeStyle='rgba(255,196,92,.9)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,py);ctx.lineTo(x+w,py);ctx.moveTo(px,py-s);ctx.lineTo(px,py+s);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.18)';ctx.strokeRect(Math.round(x)+.5,Math.round(y)+.5,Math.round(w)-1,Math.round(h)-1);
 }
}
function draw(){
 if(!state.ready)return;
 const W=canvas.width,H=canvas.height,[cw,ch]=sheet.cell;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W,H);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 // Zoom about the stage centre, then pan; the fitted layout below is unchanged.
 ctx.setTransform(state.zoom,0,0,state.zoom,W/2*(1-state.zoom)+state.pan[0],H/2*(1-state.zoom)+state.pan[1]);
 if(state.all&&sheet.rows>1){
  // Pick the column count that gives the largest cells for this aspect ratio.
  let best=null;for(let c=1;c<=sheet.rows;c++){const r=Math.ceil(sheet.rows/c),s=Math.min(W/(c*cw),H/(r*ch));if(!best||s>best.s)best={c,r,s};}
  const {c,r,s}=best,ox=(W-c*cw*s)/2,oy=(H-r*ch*s)/2,[source,img]=pickImage(cw*s*state.zoom);
  ctx.font=`600 ${Math.round(12*dpr())}px system-ui,sans-serif`;ctx.textBaseline='top';
  for(let i=0;i<sheet.rows;i++){const x=ox+(i%c)*cw*s,y=oy+Math.floor(i/c)*ch*s;drawCell(img,source==='half'?.5:1,i,state.frame,x,y,cw*s,ch*s);
   ctx.fillStyle=i===state.row?'#5fc9b5':state.bg==='light'||state.bg==='snow'?'#35444a':'#c4d3cf';ctx.fillText(label(i),x+6*dpr(),y+6*dpr());}
  state.source=source;
 }else{
  const s=Math.min(W/cw,H/ch),w=cw*s,h=ch*s,[source,img]=pickImage(w*state.zoom);
  drawCell(img,source==='half'?.5:1,state.row,state.frame,(W-w)/2,(H-h)/2,w,h);state.source=source;
 }
 ctx.setTransform(1,0,0,1,0,0);
 state.drawn={row:state.row,frame:state.frame,all:state.all,zoom:state.zoom};
 $('zoom-level').textContent=`${Math.round(state.zoom*100)}%`;$('zoom-out').disabled=state.zoom<=ZOOMS[0];$('zoom-in').disabled=state.zoom>=ZOOMS.at(-1);
 $('zoom-reset').disabled=state.zoom===1&&!state.pan[0]&&!state.pan[1];stage.classList.toggle('pannable',state.zoom>1);
 $('frame').value=state.frame;$('counter').textContent=`${state.frame+1} / ${frames()}`;$('play').textContent=state.playing?'Pause':'Play';$('loop').setAttribute('aria-pressed',String(state.loop));$('once').setAttribute('aria-pressed',String(!state.loop));
 $("badge").textContent=state.all?"":`${label(state.row)} · ${state.frame+1}/${frames()}`;
 canvas.setAttribute('aria-label',`${sheet.name}, ${state.all?'all headings':label(state.row)}, frame ${state.frame+1} of ${frames()}`);
 document.querySelectorAll('#headings button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===state.row)));
}
function tick(now){
 raf=0;if(!state.playing||document.hidden)return;
 elapsed+=Math.min(now-last,250);last=now;const step=1000/state.fps;
 if(elapsed>=step){const n=Math.floor(elapsed/step);elapsed-=n*step;
  // Once: stop on the last frame instead of wrapping.
  if(!state.loop&&state.frame+n>=frames()-1){state.frame=frames()-1;state.playing=false;draw();return;}
  state.frame=(state.frame+n)%frames();draw();}
 raf=requestAnimationFrame(tick);
}
function setPlaying(on){if(on&&!state.loop&&state.frame===frames()-1)state.frame=0;state.playing=on;elapsed=0;last=performance.now();if(on&&!raf&&state.ready)raf=requestAnimationFrame(tick);draw();}
function setFrame(f){state.playing=false;state.frame=((f%frames())+frames())%frames();draw();}
function setRow(r){const i=typeof r==='string'&&isNaN(r)?(sheet.rowLabels||[]).indexOf(r.toUpperCase()):+r;if(i>=0&&i<sheet.rows){state.row=i;draw();}}
// Keep at least part of the sprite on screen: pan is limited to the zoomed overflow.
function clampPan(){const W=canvas.width,H=canvas.height,mx=Math.max(0,W*(state.zoom-1)/2+W*.25),my=Math.max(0,H*(state.zoom-1)/2+H*.25);
 state.pan=[Math.max(-mx,Math.min(mx,state.pan[0])),Math.max(-my,Math.min(my,state.pan[1]))];}
function setZoom(z){const next=Math.max(ZOOMS[0],Math.min(ZOOMS.at(-1),z)),k=next/state.zoom;state.pan=[state.pan[0]*k,state.pan[1]*k];state.zoom=next;clampPan();draw();}
const stepZoom=dir=>setZoom(dir>0?ZOOMS.find(z=>z>state.zoom+1e-6)??ZOOMS.at(-1):[...ZOOMS].reverse().find(z=>z<state.zoom-1e-6)??ZOOMS[0]);
function resetZoom(){state.zoom=1;state.pan=[0,0];draw();}
function resize(){const w=Math.max(1,Math.round(stage.clientWidth*dpr())),h=Math.max(1,Math.round(stage.clientHeight*dpr()));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}draw();}

function bind(){
 $('play').onclick=()=>setPlaying(!state.playing);$('prev').onclick=()=>setFrame(state.frame-1);$('next').onclick=()=>setFrame(state.frame+1);
 $('zoom-in').onclick=()=>stepZoom(1);$('zoom-out').onclick=()=>stepZoom(-1);$('zoom-reset').onclick=resetZoom;stage.ondblclick=resetZoom;
 stage.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();stepZoom(e.deltaY<0?1:-1);},{passive:false});
 let drag=null;
 stage.addEventListener('pointerdown',e=>{if(state.zoom<=1)return;drag={x:e.clientX,y:e.clientY,pan:[...state.pan]};stage.setPointerCapture?.(e.pointerId);stage.classList.add('dragging');});
 stage.addEventListener('pointermove',e=>{if(!drag)return;state.pan=[drag.pan[0]+(e.clientX-drag.x)*dpr(),drag.pan[1]+(e.clientY-drag.y)*dpr()];clampPan();draw();});
 for(const t of ['pointerup','pointercancel'])stage.addEventListener(t,()=>{drag=null;stage.classList.remove('dragging');});
 $('loop').onclick=()=>{state.loop=true;draw();};$('once').onclick=()=>{state.loop=false;draw();};
 $('frame').oninput=e=>setFrame(+e.target.value);$('fps').onchange=e=>{state.fps=+e.target.value;elapsed=0;draw();};
 $('bg').onchange=e=>{state.bg=player.dataset.bg=e.target.value;draw();};$('guides').onchange=e=>{state.guides=e.target.checked;draw();};$('all').onchange=e=>{state.all=e.target.checked;draw();};
 document.addEventListener('keydown',e=>{
  if(e.target.closest?.(e.key===' '?'button,select,input':'select,input[type=range]'))return;
  if(e.key===' '){e.preventDefault();setPlaying(!state.playing);}
  else if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();setFrame(state.frame+(e.key==='ArrowRight'?1:-1));}
  else if(e.key==='+'||e.key==='=')stepZoom(1);else if(e.key==='-'||e.key==='_')stepZoom(-1);else if(e.key==='0')resetZoom();
  else if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();setRow((state.row+(e.key==='ArrowDown'?1:sheet.rows-1))%sheet.rows);}
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.playing)setPlaying(true);});
 new ResizeObserver(resize).observe(stage);
 window.addEventListener('message',e=>{const d=e.data;if(!d||d.type!=='sprite-player')return;
  if(d.action==='play')setPlaying(true);else if(d.action==='pause')setPlaying(false);else if(d.action==='row')setRow(d.value);else if(d.action==='frame')setFrame(+d.value);
  else if(d.action==='fps'&&+d.value>0){state.fps=+d.value;$('fps').value=String(state.fps);draw();}});
}
async function init(){
 try{
  sheet=await loadSheet();
  if(!sheet.sheet||!(sheet.cell?.[0]>0)||!(sheet.columns>0)||!(sheet.rows>0))throw Error('Sheet description needs sheet, cell, columns and rows');
  const first=await loadImage(sheet.sheetHalf||sheet.sheet);images[sheet.sheetHalf?'half':'full']=first;
  const scale=sheet.sheetHalf?.5:1;
  if(Math.round(first.naturalWidth/scale)<sheet.cell[0]*sheet.columns||Math.round(first.naturalHeight/scale)<sheet.cell[1]*sheet.rows)throw Error('Sprite sheet is smaller than its cell grid');
  document.title=`${sheet.name} — Sprite Player`;
  state.fps=+params.get('fps')||sheet.fps||8;state.row=sheet.defaultRow??0;
  state.guides=params.get('guides')==='1';state.all=params.get('all')==='1';state.bg=player.dataset.bg=['dark','light','checker','snow'].includes(params.get('bg'))?params.get('bg'):'dark';
  state.loop=params.get('loop')!=='0';if(+params.get('zoom')>0)state.zoom=Math.max(ZOOMS[0],Math.min(ZOOMS.at(-1),+params.get('zoom')));state.playing=params.get('autoplay')!=='0'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  player.dataset.controls=params.get('controls')||'full';
  if(sheet.rows>1)for(let r=0;r<sheet.rows;r++){const b=document.createElement('button');b.type='button';b.textContent=label(r);b.onclick=()=>setRow(r);$('headings').append(b);}
  else $('headings').hidden=true;
  const rates=[...new Set([2,4,5,6,8,10,12,15,24,state.fps])].sort((a,b)=>a-b);$('fps').innerHTML=rates.map(f=>`<option value="${f}">${f}</option>`).join('');$('fps').value=String(state.fps);
  $('frame').max=frames()-1;$('bg').value=state.bg;$('guides').checked=state.guides;$('all').checked=state.all;
  bind();state.ready=true;status.textContent='';
  if(params.has('row'))setRow(params.get('row'));if(params.has('frame'))state.frame=Math.min(frames()-1,Math.max(0,+params.get('frame')||0));
  resize();setPlaying(state.playing);
  parent!==window&&parent.postMessage({type:'sprite-player',event:'ready',name:sheet.name},'*');
 }catch(e){fail(e.message||String(e));}
}
init();
})();
