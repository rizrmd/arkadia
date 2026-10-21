const $=s=>document.querySelector(s);
try{
const manifest=await(await fetch('manifest.json')).json(),characters=Object.values(manifest.characters),images={},canvases={};
for(const m of characters){const section=document.createElement('section');section.innerHTML=`<h2>${m.id==='ashfang'?'Ashfang':'Mire Imp'}</h2><p>Default attack: ${m.defaultAttack}</p><canvas width="480" height="360" aria-label="${m.id} animation"></canvas><p><a href="${m.image}">Atlas</a> · <a href="previews/${m.id}-attack.webp">Animated attack</a></p>`;$('#cards').append(section);canvases[m.id]=section.querySelector('canvas');const image=new Image();image.src=m.image+'?v='+m.revision;await image.decode();images[m.id]=image;}
for(const key of Object.keys(characters[0].clips))$('#clip').add(new Option(key==='attack'?'Attack (Bite / Claw Swipe)':key,key));
let clip='idle',playing=true,start=performance.now(),offset=0,last=0;const seen=new Set(),phases=new Set();
function reset(){start=performance.now();offset=0;seen.clear();phases.clear();$('#scrub').max=characters[0].clips[clip].frames.length-1;}
$('#clip').onchange=()=>{clip=$('#clip').value;reset()};$('#replay').onclick=()=>{playing=true;$('#play').textContent='Pause';reset()};
$('#play').onclick=()=>{playing=!playing;if(playing)start=performance.now();else offset=last;$('#play').textContent=playing?'Pause':'Play'};
$('#scrub').oninput=()=>{playing=false;$('#play').textContent='Play';offset=Number($('#scrub').value)/characters[0].clips[clip].fps;};
for(const key of ['speed','transition'])$('#'+key).onchange=reset;
function draw(now){const m=characters[0],spec=m.clips[clip];let t=playing?offset+Math.max(0,now-start)/1000*Number($('#speed').value):offset;last=t;let phase='action',active=clip,local=t;
if($('#transition').checked){const before=.8,duration=spec.frames.length/spec.fps,after=.8,total=before+duration+after;if(clip!=='die')t%=total;if(t<before){active='idle';phase='idle before';local=t}else if(t<before+duration){local=t-before}else if(clip==='die'){local=duration;phase='death hold'}else{active='idle';phase='idle after';local=t-before-duration}}
const a=m.clips[active],n=Math.floor(local*a.fps),index=a.loop?n%a.frames.length:Math.min(a.frames.length-1,n);phases.add(phase);if(active===clip)seen.add(index);
const mirrored=$('#view').value==='mirror'&&!/Up|Down/.test(active);
for(const meta of characters){const canvas=canvases[meta.id],ctx=canvas.getContext('2d'),f=meta.frames[meta.clips[active].frames[index]],p=meta.cell.pivot;ctx.clearRect(0,0,canvas.width,canvas.height);let x=240;if($('#travel').checked&&active.startsWith('move'))x=100+(t*75)%280;const y=300,scale=2.5;ctx.strokeStyle='#9caa8c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(480,y);ctx.stroke();ctx.save();ctx.translate(x,y);ctx.scale(mirrored?-scale:scale,scale);ctx.drawImage(images[meta.id],f.x,f.y,f.w,f.h,-p.x,-p.y,f.w,f.h);ctx.restore();ctx.strokeStyle='#ffcb68';ctx.beginPath();ctx.moveTo(x-7,y);ctx.lineTo(x+7,y);ctx.moveTo(x,y-7);ctx.lineTo(x,y+7);ctx.stroke();}
if(playing)$('#scrub').value=index;$('#frame').textContent=`${index+1} / ${a.frames.length}`;$('#status').textContent=`${active} · ${a.fps} fps · ${phase}${!a.loop&&index===a.frames.length-1?' · final pose held':''}${mirrored?' · mirrored':''}`;
window.enemyPreview.state={clip,active,index,phase,seen:[...seen],phases:[...phases],mirrored,playing};requestAnimationFrame(draw);}
window.enemyPreview={manifest,state:{},setClip(name){$('#clip').value=name;clip=name;playing=true;$('#play').textContent='Pause';reset()}};window.enemyPreviewReady=true;requestAnimationFrame(draw);
}catch(e){$('#status').textContent='Unable to load assets: '+e.message;throw e}
