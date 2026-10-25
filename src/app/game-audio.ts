import {gameSettings} from './settings-state';
// A quiet procedural ambient chord and short skill cues; no network audio or autoplay.
let context:AudioContext|undefined,music:GainNode|undefined,effects:GainNode|undefined;
function apply(){const s=gameSettings.get();if(context&&music&&effects){music.gain.setTargetAtTime(s.music/100*.018,context.currentTime,.05);effects.gain.setTargetAtTime(s.soundEffects/100*.045,context.currentTime,.02);}}
export function startGameAudio(){
 if(context){void context.resume();return;}
 try{context=new AudioContext();music=context.createGain();effects=context.createGain();music.connect(context.destination);effects.connect(context.destination);
  for(const frequency of [110,164.81,220]){const tone=context.createOscillator();tone.type='sine';tone.frequency.value=frequency;tone.connect(music);tone.start();}apply();
 }catch{/* Devices without audio still retain volume preferences. */}
}
export function playSkillSound(){if(!context||!effects||context.state!=='running')return;const now=context.currentTime,tone=context.createOscillator(),gain=context.createGain();tone.type='sine';tone.frequency.setValueAtTime(520,now);tone.frequency.exponentialRampToValueAtTime(140,now+.12);gain.gain.setValueAtTime(.5,now);gain.gain.exponentialRampToValueAtTime(.001,now+.15);tone.connect(gain);gain.connect(effects);tone.start();tone.stop(now+.16);tone.onended=()=>{tone.disconnect();gain.disconnect();};}
gameSettings.subscribe(apply);
if(typeof document!=='undefined'){
 document.addEventListener('pointerdown',startGameAudio,{once:true});document.addEventListener('keydown',startGameAudio,{once:true});
 document.addEventListener('visibilitychange',()=>{if(context){if(document.hidden)void context.suspend();else void context.resume();}});
}
export const audioSnapshot=()=>({state:context?.state??'not-started',music:music?.gain.value,soundEffects:effects?.gain.value});
