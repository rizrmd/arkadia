import {Sound, sound} from '@pixi/sound';
import skillUrl from './audio/skill-swoosh.wav?url';
import {gameSettings} from './settings-state';

// Music keeps its independent preference. No music asset is configured: silence is
// intentional until a real soundtrack is provided, rather than an oscillator drone.
const MAX_VOICES=3, MIN_INTERVAL_MS=90;
let skill:Sound|undefined, unlocked=false, disposed=false, lastPlay=-Infinity;
let loadError=false, played=0, dropped=0;
function apply(){if(skill){skill.volume=gameSettings.get().soundEffects/100*.45;if(!gameSettings.get().soundEffects)skill.stop();}}
function preload(){
 if(disposed||skill)return;
 try{
  sound.disableAutoPause=true; // Visibility is managed below, including mobile.
  skill=Sound.from({url:skillUrl,preload:true,autoPlay:false,loop:false,
   loaded:error=>{loadError=Boolean(error);}});
  apply();
 }catch{loadError=true;}
}
export function startGameAudio(){
 if(disposed||document.hidden)return;
 preload();
 try{
  const ctx=sound.context;
  if('audioContext' in ctx){
   const web=ctx as typeof sound.context & {audioContext:AudioContext;playEmptySound():void};
   web.playEmptySound();
   void web.audioContext.resume().then(()=>{if(!disposed&&!document.hidden)unlocked=web.audioContext.state==='running';}).catch(()=>{unlocked=false;});
  }else unlocked=true;
 }catch{unlocked=false;}
}
export function playSkillSound(){
 const now=performance.now();
 if(disposed||!unlocked||document.hidden||!skill?.isLoaded||!gameSettings.get().soundEffects)return;
 if(now-lastPlay<MIN_INTERVAL_MS||skill.instances.length>=MAX_VOICES){dropped++;return;}
 lastPlay=now;
 try{const result=skill.play({loop:false});if(result instanceof Promise)void result.catch(()=>{loadError=true;});played++;}catch{loadError=true;}
}
function visibility(){
 if(!skill)return;
 // Discard transient cues on hide; never replay stale attacks when returning.
 if(document.hidden){skill.stop();skill.paused=true;}
 else{skill.paused=false;if(unlocked)startGameAudio();}
}
const unsubscribe=gameSettings.subscribe(apply);
const gestures=['pointerdown','keydown','touchend'] as const;
export function disposeGameAudio(){
 if(disposed)return;
 disposed=true;unlocked=false;unsubscribe();skill?.destroy();skill=undefined;
 for(const event of gestures)document.removeEventListener(event,startGameAudio);
 document.removeEventListener('visibilitychange',visibility);
 window.removeEventListener('pagehide',pagehide);
}
function pagehide(event:PageTransitionEvent){if(event.persisted){skill?.stop();}else disposeGameAudio();}
if(typeof document!=='undefined'){
 preload();
 // Keep listeners: a rejected autoplay resume must be retryable on later gestures.
 for(const event of gestures)document.addEventListener(event,startGameAudio,{passive:true});
 document.addEventListener('visibilitychange',visibility);
 window.addEventListener('pagehide',pagehide);
}
if(import.meta.hot)import.meta.hot.dispose(disposeGameAudio);
export const audioSnapshot=()=>({engine:'@pixi/sound',state:disposed?'disposed':unlocked?'running':'not-started',music:gameSettings.get().music/100,soundEffects:gameSettings.get().soundEffects/100,musicPlaying:false,loaded:skill?.isLoaded??false,loadError,activeVoices:skill?.instances.length??0,maxVoices:MAX_VOICES,played,dropped});
