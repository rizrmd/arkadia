import {gameSettings} from './settings-state';
import {renderQuality} from './render-quality';

let appliedQuality:string|undefined,appliedFps:number|undefined;
const applySettings=()=>{const s=gameSettings.get();if(s.quality===appliedQuality&&s.frameRate===appliedFps)return;appliedQuality=s.quality;appliedFps=s.frameRate;renderQuality.configure(s.quality,s.frameRate);};
// Query overrides remain available for existing performance QA until a player changes preferences.
if(typeof location==='undefined'||!new URLSearchParams(location.search).has('quality'))applySettings();
gameSettings.subscribe(applySettings);
