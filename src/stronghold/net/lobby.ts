import type {Net,JoinError} from './client';
// Co-op rooms in the HUD: a chip under the clock shows the room and how many heroes are in it; its panel copies
// the invite link, lists the party and joins or creates a room with a guest name (no accounts). Playing alone is
// a room with one player; if the server cannot be reached the Stronghold falls back to the offline solo game.
// An invite link (?room=CODE) asks for a name first; reloading a tab that already joined goes straight back in.
const NAME_KEY='arkadia.coop.name',ROOM_KEY='arkadia.coop.room';
const store={get:(s:Storage,k:string)=>{try{return s.getItem(k)||'';}catch{return '';}},set:(s:Storage,k:string,v:string)=>{try{s.setItem(k,v);}catch{}}};
export const normalizeCode=(c:string|null)=>(c||'').toUpperCase().replace(/[\s-]/g,'').slice(0,8);
const guestName=()=>'Guest '+String(Math.floor(1000+Math.random()*9000));
export function createLobby(root:HTMLElement,net:Net){
 const el=document.createElement('section');el.id='coop';el.setAttribute('aria-label','Co-op room');
 el.innerHTML=`<button type="button" class="coop-chip" aria-expanded="false" aria-controls="coop-panel"><span class="coop-dot" aria-hidden="true"></span><span class="coop-label">Co-op</span><span class="coop-code"></span><span class="coop-count"></span></button>
 <div class="coop-panel" id="coop-panel" hidden>
  <p class="coop-title"></p>
  <div class="coop-room">
   <div class="coop-head"><span>Room</span><strong class="coop-room-code"></strong><span class="coop-ping"></span></div>
   <button type="button" class="coop-copy">Copy invite link</button>
   <ul class="coop-players" aria-label="Heroes in this room"></ul>
  </div>
  <form class="coop-join" autocomplete="off">
   <label>Your name<input name="name" maxlength="16" autocomplete="nickname" spellcheck="false" required></label>
   <label>Room code<input name="code" maxlength="7" placeholder="ABCDE" autocapitalize="characters" spellcheck="false"></label>
   <div class="coop-actions"><button type="submit" class="coop-primary">Join room</button><button type="button" class="coop-create">Create room</button></div>
   <p class="coop-error" role="alert"></p>
  </form>
  <button type="button" class="coop-offline">Play offline</button>
 </div>
 <div class="coop-toasts" aria-live="polite"></div>`;
 root.append(el);
 const q=<T extends Element>(s:string)=>el.querySelector(s) as T,chip=q<HTMLButtonElement>('.coop-chip'),panel=q<HTMLElement>('.coop-panel'),form=q<HTMLFormElement>('.coop-join');
 const nameInput=form.elements.namedItem('name') as HTMLInputElement,codeInput=form.elements.namedItem('code') as HTMLInputElement,errorLine=q<HTMLElement>('.coop-error');
 const open=(v:boolean)=>{panel.hidden=!v;chip.setAttribute('aria-expanded',String(v));};
 chip.onclick=()=>open(panel.hidden===true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){open(false);chip.focus();}});
 let roster=new Map<string,string>(),title='';
 const invite=()=>`${location.origin}/?room=${net.room()}`;
 function toast(text:string){const t=document.createElement('p');t.textContent=text;q('.coop-toasts').append(t);setTimeout(()=>t.remove(),3200);}
 function render(){
  const s=net.status(),online=net.active();el.dataset.status=s;
  q('.coop-code').textContent=online?net.room():'';
  q('.coop-count').textContent=online?`${net.latest()?.players.length??1}/4`:s==='connecting'?'Connecting…':'Offline';
  q('.coop-title').textContent=title||(online?'Heroes in this room share one world: the same revenants, gate and clock.':s==='connecting'?'Connecting to the co-op server…':'Offline — solo play on this device. Join or create a room to play together.');
  q<HTMLElement>('.coop-room').hidden=!online;q('.coop-room-code').textContent=net.room();
  q('.coop-ping').textContent=online&&net.rtt()?`${Math.round(net.rtt())} ms`:s==='reconnecting'?'Reconnecting…':'';
  q('.coop-offline').textContent=online?'Leave room · play offline':'Play offline';q<HTMLElement>('.coop-offline').hidden=!online;
  const list=q<HTMLUListElement>('.coop-players'),players=net.latest()?.players??[],key=players.map(p=>p.id+p.name+Math.ceil(p.hp)).join();
  if(list.dataset.key!==key){list.dataset.key=key;list.replaceChildren(...players.map(p=>{const li=document.createElement('li');const n=document.createElement('span');n.textContent=p.name;const hp=document.createElement('small');hp.textContent=p.st==='die'?'Down':`${Math.ceil(p.hp)} / ${p.max}`;li.append(n,hp);if(p.id===net.you())li.dataset.you='true';return li;}));}
  for(const b of el.querySelectorAll<HTMLButtonElement>('.coop-actions button'))b.disabled=s==='connecting';
 }
 // Join and leave notices from the roster in each snapshot.
 net.onSnapshot(s=>{
  const next=new Map(s.players.map(p=>[p.id,p.name]));
  if(roster.size)for(const [id,n] of next)if(!roster.has(id)&&id!==net.you())toast(`${n} joined the room`);
  for(const [id,n] of roster)if(!next.has(id))toast(`${n} left the room`);
  roster=next;
  if(s.tick%10===0)render();
 });
 net.onStatus(()=>{if(!net.active())roster=new Map();render();});
 setInterval(render,1000);
 async function join(code:string,name:string){
  errorLine.textContent='';title='';store.set(localStorage,NAME_KEY,name);render();
  try{
   const w=await net.join(code,name);roster=new Map();store.set(sessionStorage,ROOM_KEY,w.room);
   // The address bar is the invite link, and a reload rejoins this room.
   const u=new URL(location.href);u.searchParams.set('room',w.room);u.searchParams.delete('offline');history.replaceState(history.state,'',u.pathname+u.search+u.hash);
   codeInput.value='';open(false);render();return true;
  }catch(e){errorLine.textContent=(e as JoinError).message;open(true);render();return false;}
 }
 form.onsubmit=e=>{e.preventDefault();const name=nameInput.value.trim();if(!name){nameInput.focus();return;}void join(normalizeCode(codeInput.value),name);};
 q<HTMLButtonElement>('.coop-create').onclick=()=>{const name=nameInput.value.trim()||guestName();nameInput.value=name;void join('',name);};
 q<HTMLButtonElement>('.coop-offline').onclick=()=>{net.leave();store.set(sessionStorage,ROOM_KEY,'');const u=new URL(location.href);u.searchParams.delete('room');history.replaceState(history.state,'',u.pathname+u.search+u.hash);render();};
 q<HTMLButtonElement>('.coop-copy').onclick=async()=>{
  const link=invite(),b=q<HTMLButtonElement>('.coop-copy');
  try{if(navigator.share&&matchMedia('(pointer:coarse)').matches)await navigator.share({title:'Join my Arkadia Stronghold',url:link});else{await navigator.clipboard.writeText(link);b.textContent='Link copied';setTimeout(()=>b.textContent='Copy invite link',1800);}}
  catch{prompt('Invite link',link);}
 };
 nameInput.value=store.get(localStorage,NAME_KEY);render();
 return {
  // Start before the world has loaded: a solo room (or a tab rejoining its room) connects at once. An invite
  // link waits for prompt() once the world is on screen, so the guest can pick a name.
  start(){
   const code=normalizeCode(new URLSearchParams(location.search).get('room')),name=store.get(localStorage,NAME_KEY);
   if(code&&!(name&&store.get(sessionStorage,ROOM_KEY)===code))return code;
   void join(code,name||guestName());return '';
  },
  prompt(code:string){
   title=`You're invited to room ${code}. Choose a name to join.`;codeInput.value=code;open(true);render();nameInput.focus();nameInput.select();
  },
  render
 };
}
