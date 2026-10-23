import {Container,Rectangle} from 'pixi.js';
import type {FrameSet} from '../../typography/frames';
import type {Hud} from '../../typography/hud';
import {MsdfText} from '../../typography/text';
import type {Net,JoinError} from './client';
import {DEFAULT_HERO,heroInfo,isHero} from '../heroes';

const NAME_KEY='arkadia.coop.name',ROOM_KEY='arkadia.coop.room';
const store={get:(s:Storage,k:string)=>{try{return s.getItem(k)||'';}catch{return '';}},set:(s:Storage,k:string,v:string)=>{try{s.setItem(k,v);}catch{}}};
export const normalizeCode=(c:string|null)=>(c||'').toUpperCase().replace(/[\s-]/g,'').slice(0,8);
const guestName=()=>'Guest '+String(Math.floor(1000+Math.random()*9000));

const PANEL_W=346,PANEL_H=430;

// Unavoidable DOM exception (Acceptance #1): a single hidden native <input> so mobile soft keyboards
// can open and type a player name or co-op room code while the visual input box renders in Pixi + MsdfText.
function getKeyboardProxy():HTMLInputElement{
 let input=document.getElementById('coop-keyboard-proxy') as HTMLInputElement|null;
 if(!input){
  input=document.createElement('input');
  input.id='coop-keyboard-proxy';
  input.type='text';
  input.autocomplete='off';
  input.spellcheck=false;
  input.setAttribute('aria-hidden','true');
  input.tabIndex=-1;
  input.style.cssText='position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;border:0;padding:0';
  (document.getElementById('app')??document.body).appendChild(input);
 }
 return input;
}

export function createLobby(uiStage:Container,frames:FrameSet,net:Net){
 const proxy=getKeyboardProxy();
 let hudRef:Hud|undefined;
 let activeField:'name'|'code'|null=null;
 let nameVal=store.get(localStorage,NAME_KEY)||guestName();
 let codeVal='';
 let errorText='';
 let copyLabel='Copy Invite Link';
 let titleOverride='';
 let roster=new Map<string,string>();

 const panel=new Container();
 panel.zIndex=45;
 panel.visible=false;
 panel.eventMode='static';
 panel.hitArea=new Rectangle(0,0,PANEL_W,PANEL_H);
 uiStage.addChild(panel);

 const toastLayer=new Container();
 toastLayer.zIndex=46;
 uiStage.addChild(toastLayer);

 panel.addChild(frames.frame('panel-bronze',PANEL_W,PANEL_H));

 const headerLabel=panel.addChild(new MsdfText('panel-label','CO-OP STRONGHOLD ROOM',{size:12.5}));
 headerLabel.place(26,36);
 const pingLabel=panel.addChild(new MsdfText('panel-muted','',{size:12.5}));
 pingLabel.place(PANEL_W-26,36,1);

 const statusNote=panel.addChild(new MsdfText('panel-muted','',{size:13.5,lineHeight:18,align:'left',wrapWidth:PANEL_W-52}));
 statusNote.place(26,58);

 // Room info + copy button + player list
 const roomBox=panel.addChild(new Container());
 roomBox.position.set(26,102);
 const roomCodeTitle=roomBox.addChild(new MsdfText('panel-title','ROOM —',{size:15}));
 roomCodeTitle.place(0,16);

 const copyBtn=roomBox.addChild(new Container());
 copyBtn.position.set(148,-4);
 copyBtn.eventMode='static';
 copyBtn.cursor='pointer';
 copyBtn.hitArea=new Rectangle(0,0,146,30);
 copyBtn.addChild(frames.frame('button-bronze',146,30));
 const copyTxt=copyBtn.addChild(new MsdfText('panel-body',copyLabel,{size:13}));
 copyTxt.place(73,19,0.5);

 const playersBox=roomBox.addChild(new Container());
 playersBox.position.set(0,32);

 // Input fields: Your Name & Room Code
 const formBox=panel.addChild(new Container());
 formBox.position.set(26,218);

 const nameLbl=formBox.addChild(new MsdfText('panel-label','YOUR NAME',{size:11.5}));
 nameLbl.place(0,12);
 const nameInputBox=formBox.addChild(new Container());
 nameInputBox.position.set(0,18);
 nameInputBox.eventMode='static';
 nameInputBox.cursor='text';
 nameInputBox.hitArea=new Rectangle(0,0,294,36);
 nameInputBox.addChild(frames.frame('input-frame',294,36));
 const nameValueTxt=nameInputBox.addChild(new MsdfText('panel-body',nameVal,{size:15}));
 nameValueTxt.place(12,23);

 const codeLbl=formBox.addChild(new MsdfText('panel-label','ROOM CODE',{size:11.5}));
 codeLbl.place(0,70);
 const codeInputBox=formBox.addChild(new Container());
 codeInputBox.position.set(0,76);
 codeInputBox.eventMode='static';
 codeInputBox.cursor='text';
 codeInputBox.hitArea=new Rectangle(0,0,294,36);
 codeInputBox.addChild(frames.frame('input-frame',294,36));
 const codeValueTxt=codeInputBox.addChild(new MsdfText('panel-body','',{size:15}));
 codeValueTxt.place(12,23);

 const focusField=(field:'name'|'code')=>{
  activeField=field;
  proxy.maxLength=field==='name'?16:7;
  proxy.value=field==='name'?nameVal:codeVal;
  proxy.focus();
  render();
 };
 nameInputBox.on('pointertap',()=>focusField('name'));
 codeInputBox.on('pointertap',()=>focusField('code'));

 proxy.addEventListener('input',()=>{
  if(activeField==='name'){
   nameVal=proxy.value.slice(0,16);
  }else if(activeField==='code'){
   codeVal=normalizeCode(proxy.value);
   proxy.value=codeVal;
  }
  render();
 });
 proxy.addEventListener('keydown',e=>{
  if(e.key==='Enter'){
   e.preventDefault();
   const n=nameVal.trim()||guestName();
   nameVal=n;
   void join(normalizeCode(codeVal),n);
  }else if(e.key==='Escape'){
   e.preventDefault();
   open(false);
  }
 });

 // Action buttons: Join Room & Create Room
 const joinBtn=formBox.addChild(new Container());
 joinBtn.position.set(0,122);
 joinBtn.eventMode='static';
 joinBtn.cursor='pointer';
 joinBtn.hitArea=new Rectangle(0,0,142,36);
 joinBtn.addChild(frames.frame('button-bronze',142,36));
 const joinTxt=joinBtn.addChild(new MsdfText('panel-title','Join Room',{size:13.5}));
 joinTxt.place(71,23,0.5);
 joinBtn.on('pointertap',()=>{
  const n=nameVal.trim()||guestName();
  nameVal=n;
  void join(normalizeCode(codeVal),n);
 });

 const createBtn=formBox.addChild(new Container());
 createBtn.position.set(152,122);
 createBtn.eventMode='static';
 createBtn.cursor='pointer';
 createBtn.hitArea=new Rectangle(0,0,142,36);
 createBtn.addChild(frames.frame('button-bronze',142,36));
 const createTxt=createBtn.addChild(new MsdfText('panel-title','Create Room',{size:13.5}));
 createTxt.place(71,23,0.5);
 createBtn.on('pointertap',()=>{
  const n=nameVal.trim()||guestName();
  nameVal=n;
  void join('',n);
 });

 // Offline / Leave Room button
 const offlineBtn=formBox.addChild(new Container());
 offlineBtn.position.set(0,164);
 offlineBtn.eventMode='static';
 offlineBtn.cursor='pointer';
 offlineBtn.hitArea=new Rectangle(0,0,294,30);
 offlineBtn.addChild(frames.frame('button-bronze',294,30));
 const offlineTxt=offlineBtn.addChild(new MsdfText('panel-muted','Leave Room · Play Offline',{size:13}));
 offlineTxt.place(147,19,0.5);
 offlineBtn.on('pointertap',()=>{
  net.leave();
  store.set(sessionStorage,ROOM_KEY,'');
  const u=new URL(location.href);u.searchParams.delete('room');
  history.replaceState(history.state,'',u.pathname+u.search+u.hash);
  render();
 });

 const errorNode=panel.addChild(new MsdfText('panel-error','',{size:13}));
 errorNode.place(26,PANEL_H-14);

 const invite=()=>`${location.origin}/?room=${net.room()}`;
 copyBtn.on('pointertap',async()=>{
  const link=invite();
  try{
   if(navigator.share&&matchMedia('(pointer:coarse)').matches){
    await navigator.share({title:'Join my Arkadia Stronghold',url:link});
   }else{
    await navigator.clipboard.writeText(link);
    copyLabel='Link Copied';
    render();
    setTimeout(()=>{copyLabel='Copy Invite Link';render();},1800);
   }
  }catch{
   prompt('Invite link',link);
  }
 });

 function toast(text:string){
  const item=toastLayer.addChild(new Container());
  const w=Math.max(180,text.length*8+36);
  item.addChild(frames.frame('pill',w,38));
  const t=item.addChild(new MsdfText('panel-body',text,{size:14.5}));
  t.place(w/2,24,0.5);
  layout();
  setTimeout(()=>{
   item.destroy({children:true});
   layout();
  },3200);
 }

 function layout(){
  const anchor=hudRef?hudRef.topRightPopoverAnchor(3):{x:innerWidth-16,y:210,scale:1};
  const s=Math.min(1,Math.max(0.78,(innerWidth-16)/PANEL_W));
  panel.scale.set(s);
  panel.position.set(Math.max(8,anchor.x-PANEL_W*s),anchor.y);
  let ty=anchor.y+(panel.visible?PANEL_H*s+8:0);
  for(const child of toastLayer.children){
   const c=child as Container;
   c.position.set(Math.max(8,anchor.x-c.width),ty);
   ty+=44;
  }
 }
 window.addEventListener('resize',layout);

 function open(v:boolean){
  panel.visible=v;
  if(!v){
   activeField=null;
   proxy.blur();
  }else{
   layout();
  }
  render();
 }

 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&panel.visible){
   e.preventDefault();
   open(false);
  }
 });

 let lastPlayersKey='',lastChipStr='';
 function render(){
  const s=net.status(),online=net.active();
  const countStr=online?`${net.latest()?.players.length??1}/4`:s==='connecting'?'…':'Solo';
  const chipStr=online?`${net.room()} · ${countStr}`:`Co-op · ${countStr}`;
  if(chipStr!==lastChipStr){
   lastChipStr=chipStr;
   hudRef?.setCoop(chipStr);
  }
  if(!panel.visible)return;

  pingLabel.text=online&&net.rtt()?`${Math.round(net.rtt())} ms`:s==='reconnecting'?'Reconnecting…':'';
  pingLabel.place(PANEL_W-26,36,1);

  statusNote.text=titleOverride||(online
   ?'Heroes in this room share one world: revenants, gate and clock.'
   :s==='connecting'?'Connecting to the co-op server…':'Offline — solo play. Join or create a room to play together.');
  statusNote.place(26,58);

  roomBox.visible=online;
  if(online){
   roomCodeTitle.text=`ROOM ${net.room()}`;
   roomCodeTitle.place(0,16);
   copyTxt.text=copyLabel;
   copyTxt.place(73,19,0.5);
  }

  const players=net.latest()?.players??[];
  const pKey=players.map(p=>`${p.id}:${p.name}:${p.h}:${Math.ceil(p.hp)}:${p.st}`).join('|');
  if(pKey!==lastPlayersKey){
   lastPlayersKey=pKey;
   playersBox.removeChildren().forEach(c=>c.destroy({children:true}));
   players.slice(0,4).forEach((p,idx)=>{
    const rowY=idx*20;
    const hName=heroInfo(isHero(p.h)?p.h:DEFAULT_HERO).name;
    const left=playersBox.addChild(new MsdfText('panel-body',`${p.name} · ${hName}`,{size:13.5}));
    left.place(0,rowY+12);
    const hpStr=p.st==='die'?'Down':`${Math.ceil(p.hp)}/${p.max} HP`;
    const right=playersBox.addChild(new MsdfText('panel-muted',hpStr,{size:12.5}));
    right.place(294,rowY+12,1);
   });
  }

  const nameCursor=activeField==='name'?'|':'';
  nameValueTxt.text=(nameVal||'Enter name')+nameCursor;
  nameValueTxt.place(12,23);

  const codeCursor=activeField==='code'?'|':'';
  codeValueTxt.text=(codeVal||(activeField==='code'?'':'ABCDE'))+codeCursor;
  codeValueTxt.alpha=codeVal||activeField==='code'?1:0.55;
  codeValueTxt.place(12,23);

  offlineBtn.visible=online;
  errorNode.text=errorText;
  errorNode.place(26,PANEL_H-14);
 }

 net.onSnapshot(s=>{
  if(s.players.length!==roster.size||s.players.some(p=>roster.get(p.id)!==p.name)){
   const next=new Map(s.players.map(p=>[p.id,p.name]));
   if(roster.size)for(const [id,n] of next)if(!roster.has(id)&&id!==net.you())toast(`${n} joined the room`);
   for(const [id,n] of roster)if(!next.has(id))toast(`${n} left the room`);
   roster=next;
   render();
  }else if(panel.visible&&s.tick%10===0){
   render();
  }
 });
 net.onStatus(()=>{if(!net.active())roster=new Map();lastChipStr='';render();});
 setInterval(()=>{if(panel.visible)render();},1000);

 async function join(code:string,name:string){
  errorText='';titleOverride='';store.set(localStorage,NAME_KEY,name);render();
  try{
   const w=await net.join(code,name);roster=new Map();store.set(sessionStorage,ROOM_KEY,w.room);
   const u=new URL(location.href);u.searchParams.set('room',w.room);u.searchParams.delete('offline');history.replaceState(history.state,'',u.pathname+u.search+u.hash);
   codeVal='';open(false);render();return true;
  }catch(e){
   errorText=(e as JoinError).message;open(true);render();return false;
  }
 }

 render();
 return {
  bindHud(hud:Hud){hudRef=hud;lastChipStr='';render();layout();},
  open,
  toggle(){open(!panel.visible);},
  isOpen:()=>panel.visible,
  start(){
   const code=normalizeCode(new URLSearchParams(location.search).get('room')),name=store.get(localStorage,NAME_KEY);
   if(code&&!(name&&store.get(sessionStorage,ROOM_KEY)===code))return code;
   void join(code,name||guestName());return '';
  },
  prompt(code:string){
   titleOverride=`Invited to room ${code}. Enter your name to join.`;
   codeVal=code;
   open(true);
   focusField('name');
  },
  render,
 };
}
