const $=id=>document.getElementById(id);
const names={N:'NORTH',NE:'NORTH EAST',E:'EAST',SE:'SOUTH EAST',S:'SOUTH',SW:'SOUTH WEST',W:'WEST',NW:'NORTH WEST'};
const descriptions=['A grounded neutral stance.','Forward lean, opposite arm and leg drive.','A broad flame fan from the right gauntlet.','A low dash with an ember trail.','An ember seal placed close to the ground.','A warm furnace aura drawn inward.','Impact recoil and a broken stance.','A settled terminal pose.'];
let manifest,direction='SE',playing=false,frame=0,last=0,ready=false;
const images=new Map;
async function preload(path){if(images.has(path))return images.get(path);const im=new Image;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Image timed out: '+path)),20000);im.onload=()=>{clearTimeout(timer);resolve()};im.onerror=()=>{clearTimeout(timer);reject(Error('Could not load '+path))};im.src=path});images.set(path,im);return im}
function draw(){if(!ready)return;const image=playing?manifest.run.find(c=>c.direction===direction).frames[frame].image:manifest.turnaround.find(c=>c.direction===direction).image;$('hero').src=image;$('hero').alt=`Ember Warden ${playing?'run study':'turnaround'} facing ${names[direction].toLowerCase()}`;$('heading').textContent=names[direction];for(const b of $('directions').children)b.setAttribute('aria-pressed',String(b.dataset.direction===direction))}
function selectDirection(d){if(!names[d])return;direction=d;frame=0;draw()}
async function initialize(){
 $('retry').hidden=true;$('status').textContent='Loading painted character…';
 try{
  const response=await fetch('manifest.json',{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Manifest '+response.status);manifest=await response.json();
  await Promise.all(manifest.turnaround.map(c=>preload(c.image)));
  $('directions').replaceChildren();
  for(const d of manifest.directions){const b=document.createElement('button');b.type='button';b.textContent=d;b.dataset.direction=d;b.setAttribute('aria-label','Face '+names[d].toLowerCase());b.addEventListener('click',()=>selectDirection(d));$('directions').append(b)}
  $('poses').replaceChildren();
  for(let i=0;i<manifest.poses.length;i++){const p=manifest.poses[i],b=document.createElement('button');b.type='button';b.className='pose-card';const im=document.createElement('img');im.src=p.image;im.alt=p.action+' painted key pose';im.loading='lazy';im.width=384;im.height=384;const title=document.createElement('strong');title.textContent=p.action;const note=document.createElement('small');note.textContent=descriptions[i];b.append(im,title,note);b.addEventListener('click',()=>{$('detail-art').src=p.image;$('detail-art').alt=im.alt;$('detail-title').textContent=p.action;$('detail-description').textContent=descriptions[i]+' This is a painted key pose.';$('detail').showModal()});$('poses').append(b)}
  ready=true;draw();$('status').textContent='Painted art loaded · 8 directions · 4 skills · 8 action key poses';window.emberArtReady=true;
 }catch(e){$('status').textContent='Could not load the character: '+e.message;$('retry').hidden=false;window.emberArtReady=false}
}
$('motion').addEventListener('click',async()=>{
 if(!ready)return;
 if(!playing){$('motion').disabled=true;$('motion-note').textContent='Loading run study…';try{for(const c of manifest.run)await Promise.all(c.frames.map(f=>preload(f.image)));playing=true;last=0}catch(e){$('motion-note').textContent=e.message;return}finally{$('motion').disabled=false}}
 else playing=false;
 $('motion').setAttribute('aria-pressed',String(playing));$('motion').textContent=playing?'Pause run study':'Play run study';$('motion-note').textContent=playing?'Four-frame motion study · gait and headings still need production cleanup':'Eight painted views · right-arm furnace gauntlet';frame=0;draw();
});
$('surface').addEventListener('click',()=>{const snow=$('stage').classList.toggle('snow');$('surface').setAttribute('aria-pressed',String(snow));$('surface').textContent=snow?'Dark background':'Snow background'});
$('close-detail').addEventListener('click',()=>$('detail').close());
$('detail').addEventListener('click',e=>{if(e.target===$('detail')){const r=$('detail').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('detail').close()}});
$('retry').addEventListener('click',initialize);
function animate(now){if(playing&&!document.hidden&&now-last>=125){frame=(frame+1)%4;last=now;draw()}requestAnimationFrame(animate)}
window.emberArt={selectDirection,get state(){return {direction,playing,frame,ready}},get manifest(){return manifest}};
await initialize();requestAnimationFrame(animate);
