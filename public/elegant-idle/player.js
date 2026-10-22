const $=id=>document.getElementById(id);
const state={frame:0,direction:3,playing:!matchMedia('(prefers-reduced-motion: reduce)').matches,speed:1,ready:false,seen:{ember:[],rift:[]}};
window.previewState=state;
const images={},views=[];let manifest,last=performance.now(),elapsed=0;
function render(){
 if(!state.ready)return;
 for(const {canvas,hero,row} of views){const ctx=canvas.getContext('2d'),r=row??state.direction;ctx.clearRect(0,0,384,384);ctx.drawImage(images[hero],state.frame*384,r*384,384,384,0,0,384,384);if($('guides').checked){ctx.strokeStyle='#85baac90';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,360.5);ctx.lineTo(384,360.5);ctx.stroke();ctx.beginPath();ctx.moveTo(192.5,354);ctx.lineTo(192.5,367);ctx.stroke();}const key=r*8+state.frame;if(!state.seen[hero].includes(key))state.seen[hero].push(key);}
 $('frame').value=state.frame;$('counter').textContent=`${state.frame+1} / 8`;$('play').textContent=state.playing?'Pause':'Play';
 document.querySelectorAll('[data-direction]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.direction===state.direction)));
 document.querySelectorAll('.heading').forEach(n=>n.textContent=manifest.directions[state.direction]);
 state.renderedFrame=state.frame;state.renderedDirection=state.direction;
}
function pause(){state.playing=false;elapsed=0;render()}
$('play').onclick=()=>{state.playing=!state.playing;elapsed=0;last=performance.now();render()};
$('next').onclick=()=>{pause();state.frame=(state.frame+1)%8;render()};$('prev').onclick=()=>{pause();state.frame=(state.frame+7)%8;render()};
$('frame').oninput=e=>{const frame=+e.target.value;pause();state.frame=frame;render()};$('speed').onchange=e=>{state.speed=+e.target.value;elapsed=0};
$('guides').onchange=render;$('background').onchange=e=>document.querySelectorAll('.stage').forEach(n=>n.className='stage '+e.target.value);
function view(hero,parent,row){const canvas=document.createElement('canvas');canvas.width=canvas.height=384;canvas.setAttribute('aria-label',`${manifest.characters[hero].name} ${row===undefined?'selected direction':manifest.directions[row]} idle animation`);parent.append(canvas);views.push({canvas,hero,row});}
async function init(){
 try{
  const response=await fetch('manifest.json');if(!response.ok)throw Error('Manifest could not be loaded');manifest=await response.json();
  await Promise.all(Object.entries(manifest.characters).map(async([hero,entry])=>{const img=new Image;img.src=entry.sheet;await img.decode();if(img.naturalWidth!==3072||img.naturalHeight!==3072)throw Error('Unexpected sheet dimensions');images[hero]=img;}));
  manifest.directions.forEach((dir,row)=>{const b=document.createElement('button');b.textContent=dir;b.dataset.direction=row;b.onclick=()=>{state.direction=row;render()};$('directions').append(b)});
  for(const [hero,entry] of Object.entries(manifest.characters)){
   const article=document.createElement('article'),stage=document.createElement('div');stage.className='stage';article.append(stage);view(hero,stage);const caption=document.createElement('div');caption.className='caption';caption.innerHTML=`<h2>${entry.name}</h2><p><span class="heading"></span> · Eight-frame idle · ${hero==='ember'?'Furnace Gauntlet':'Crystal Forearm Emitter'}</p>`;article.append(caption);$('heroes').append(article);
   manifest.directions.forEach((dir,row)=>{const tile=document.createElement('button');tile.className='thumb';tile.style.padding='0';tile.setAttribute('aria-label',`${entry.name} ${dir}`);tile.innerHTML=`<span>${hero==='ember'?'EMBER':'RIFT'} · ${dir}</span>`;const stage=document.createElement('div');stage.className='stage';tile.append(stage);view(hero,stage,row);tile.onclick=()=>{state.direction=row;render()};$('all-directions').append(tile)});
  }
  state.ready=true;render();
 }catch(error){$('error').hidden=false;$('error').textContent=error.message+'. Reload to retry.';state.error=error.message;}
}
function tick(now){const dt=Math.min(100,now-last);last=now;if(state.ready&&state.playing&&!document.hidden){elapsed+=dt*state.speed;while(elapsed>=200){elapsed-=200;state.frame=(state.frame+1)%8}render()}requestAnimationFrame(tick)}
init();requestAnimationFrame(tick);
