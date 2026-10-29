import {Sound, sound} from '@pixi/sound';
import musicUrl from './audio/bgm-opening.mp3?url';
import skillUrl from './audio/skill-swoosh.wav?url';
import {gameSettings} from './settings-state';

// Opening soundtrack shares the existing Pixi Music control and gesture unlock.
const MAX_VOICES=3, MIN_INTERVAL_MS=90;
let skill:Sound|undefined, unlocked=false, disposed=false, lastPlay=-Infinity;
let loadError=false, played=0, dropped=0;
let music:Sound|undefined, musicPending=false;
function playMusic(){
 if(disposed||!unlocked||document.hidden||!music?.isLoaded||!gameSettings.get().music||music.isPlaying||musicPending)return;
 musicPending=true;
 try{Promise.resolve(music.play({loop:true})).then(()=>{
  if(disposed||document.hidden||!gameSettings.get().music)music?.stop();
 }).catch(()=>{loadError=true;}).finally(()=>{musicPending=false;});}catch{musicPending=false;loadError=true;}
}
function apply(){if(music){music.volume=gameSettings.get().music/100*.5;if(!gameSettings.get().music)music.stop();else playMusic();}if(skill){skill.volume=gameSettings.get().soundEffects/100*.45;if(!gameSettings.get().soundEffects)skill.stop();}}
function preload(){
 if(disposed||skill)return;
 try{
  music=Sound.from({url:musicUrl,preload:true,autoPlay:false,loop:true,loaded:error=>{if(error)loadError=true;else playMusic();}});
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
   void web.audioContext.resume().then(()=>{if(!disposed&&!document.hidden){unlocked=web.audioContext.state==='running';playMusic();}}).catch(()=>{unlocked=false;});
  }else{unlocked=true;playMusic();}
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
 if(document.hidden){music?.stop();skill.stop();skill.paused=true;}
 else{skill.paused=false;if(unlocked)startGameAudio();}
}
const unsubscribe=gameSettings.subscribe(apply);
const gestures=['pointerdown','keydown','touchend'] as const;
export function disposeGameAudio(){
 if(disposed)return;
 disposed=true;unlocked=false;unsubscribe();music?.destroy();music=undefined;skill?.destroy();skill=undefined;
 for(const event of gestures)document.removeEventListener(event,startGameAudio);
 document.removeEventListener('visibilitychange',visibility);
 window.removeEventListener('pagehide',pagehide);
}
function pagehide(event:PageTransitionEvent){if(event.persisted){music?.stop();skill?.stop();}else disposeGameAudio();}
if(typeof document!=='undefined'){
 preload();
 // Keep listeners: a rejected autoplay resume must be retryable on later gestures.
 for(const event of gestures)document.addEventListener(event,startGameAudio,{passive:true});
 document.addEventListener('visibilitychange',visibility);
 window.addEventListener('pagehide',pagehide);
}
if(import.meta.hot)import.meta.hot.dispose(disposeGameAudio);
export const audioSnapshot=()=>({engine:'@pixi/sound',state:disposed?'disposed':unlocked?'running':'not-started',music:gameSettings.get().music/100,soundEffects:gameSettings.get().soundEffects/100,musicPlaying:music?.isPlaying??false,musicLoaded:music?.isLoaded??false,musicVolume:music?.volume??0,musicVoices:music?.instances.length??0,loaded:skill?.isLoaded??false,loadError,activeVoices:skill?.instances.length??0,maxVoices:MAX_VOICES,played,dropped});
