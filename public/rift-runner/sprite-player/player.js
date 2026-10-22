// Arkadia sprite player: plays one row of a grid sprite sheet (rows = headings, columns = frames).
// Built to sit in an iframe. Configure with query parameters:
//   manifest=sheets/rift-runner-idle.json   sheet description (default); paths inside resolve against it
//   sheet=URL&cell=384[,384]&cols=8&rows=8&pivot=192,360&fps=5&labels=N,NE,E,SE,S,SW,W,NW   a sheet without a manifest
//   row=S|4  fps=5  frame=0  bg=dark|light|checker|snow  guides=1  all=1  autoplay=0  controls=full|min|none
// Parent pages can drive it with postMessage({type:'sprite-player',action:'play'|'pause'|'row'|'frame'|'fps',value}).
(()=>{
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),dpr=()=>Math.min(window.devicePixelRatio||1,3);
const player=$('player'),stage=$('stage'),canvas=$('canvas'),ctx=canvas.getContext('2d'),status=$('status');
const state={ready:false,playing:true,row:0,frame:0,fps:5,all:false,guides:false,bg:'dark',source:null,drawn:null};
let sheet,images={},last=0,elapsed=0,raf=0;
window.spritePlayer={state,get sheet(){return sheet}};

const fail=message=>{status.textContent=message;status.classList.add('error');state.error=message;};
const list=(v,fn=Number)=>v==null||v===''?null:String(v).split(',').map(s=>fn(s.trim()));
async function loadSheet(){
 if(params.has('sheet')){
  const cell=list(params.get('cell'))||[256],cols=+params.get('cols')||1,rows=+params.get('rows')||1;
  return {name:params.get('name')||'Sprite sheet',sheet:new URL(params.get('sheet'),location.href).href,cell:[cell[0],cell[1]??cell[0]],columns:cols,rows,
   pivot:list(params.get('pivot')),fps:+params.get('fps')||8,rowLabels:list(params.get('labels'),String)};
 }
 const url=new URL(params.get('manifest')||'sheets/rift-runner-idle.json',location.href),response=await fetch(url);
 if(!response.ok)throw Error(`Sheet description could not be loaded (${response.status})`);
 const m=await response.json();
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
 const W=canvas.width,H=canvas.height,[cw,ch]=sheet.cell;ctx.clearRect(0,0,W,H);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 if(state.all&&sheet.rows>1){
  // Pick the column count that gives the largest cells for this aspect ratio.
  let best=null;for(let c=1;c<=sheet.rows;c++){const r=Math.ceil(sheet.rows/c),s=Math.min(W/(c*cw),H/(r*ch));if(!best||s>best.s)best={c,r,s};}
  const {c,r,s}=best,ox=(W-c*cw*s)/2,oy=(H-r*ch*s)/2,[source,img]=pickImage(cw*s);
  ctx.font=`600 ${Math.round(12*dpr())}px system-ui,sans-serif`;ctx.textBaseline='top';
  for(let i=0;i<sheet.rows;i++){const x=ox+(i%c)*cw*s,y=oy+Math.floor(i/c)*ch*s;drawCell(img,source==='half'?.5:1,i,state.frame,x,y,cw*s,ch*s);
   ctx.fillStyle=i===state.row?'#5fc9b5':state.bg==='light'||state.bg==='snow'?'#35444a':'#c4d3cf';ctx.fillText(label(i),x+6*dpr(),y+6*dpr());}
  state.source=source;
 }else{
  const s=Math.min(W/cw,H/ch),w=cw*s,h=ch*s,[source,img]=pickImage(w);
  drawCell(img,source==='half'?.5:1,state.row,state.frame,(W-w)/2,(H-h)/2,w,h);state.source=source;
 }
 state.drawn={row:state.row,frame:state.frame,all:state.all};
 $('frame').value=state.frame;$('counter').textContent=`${state.frame+1} / ${frames()}`;$('play').textContent=state.playing?'Pause':'Play';
 $("badge").textContent=state.all?"":`${label(state.row)} · ${state.frame+1}/${frames()}`;
 canvas.setAttribute('aria-label',`${sheet.name}, ${state.all?'all headings':label(state.row)}, frame ${state.frame+1} of ${frames()}`);
 document.querySelectorAll('#headings button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===state.row)));
}
function tick(now){
 raf=0;if(!state.playing||document.hidden)return;
 elapsed+=Math.min(now-last,250);last=now;const step=1000/state.fps;
 if(elapsed>=step){const n=Math.floor(elapsed/step);elapsed-=n*step;state.frame=(state.frame+n)%frames();draw();}
 raf=requestAnimationFrame(tick);
}
function setPlaying(on){state.playing=on;elapsed=0;last=performance.now();if(on&&!raf&&state.ready)raf=requestAnimationFrame(tick);draw();}
function setFrame(f){state.playing=false;state.frame=((f%frames())+frames())%frames();draw();}
function setRow(r){const i=typeof r==='string'&&isNaN(r)?(sheet.rowLabels||[]).indexOf(r.toUpperCase()):+r;if(i>=0&&i<sheet.rows){state.row=i;draw();}}
function resize(){const w=Math.max(1,Math.round(stage.clientWidth*dpr())),h=Math.max(1,Math.round(stage.clientHeight*dpr()));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}draw();}

function bind(){
 $('play').onclick=()=>setPlaying(!state.playing);$('prev').onclick=()=>setFrame(state.frame-1);$('next').onclick=()=>setFrame(state.frame+1);
 $('frame').oninput=e=>setFrame(+e.target.value);$('fps').onchange=e=>{state.fps=+e.target.value;elapsed=0;draw();};
 $('bg').onchange=e=>{state.bg=player.dataset.bg=e.target.value;draw();};$('guides').onchange=e=>{state.guides=e.target.checked;draw();};$('all').onchange=e=>{state.all=e.target.checked;draw();};
 document.addEventListener('keydown',e=>{
  if(e.target.closest?.(e.key===' '?'button,select,input':'select,input[type=range]'))return;
  if(e.key===' '){e.preventDefault();setPlaying(!state.playing);}
  else if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();setFrame(state.frame+(e.key==='ArrowRight'?1:-1));}
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
  state.playing=params.get('autoplay')!=='0'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
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
