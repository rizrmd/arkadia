export const SETTINGS_KEY='arkodia.settings.v1';
export type GameSettings={quality:'auto'|'low'|'high';frameRate:30|60;music:number;soundEffects:number;screenShake:boolean;showFps:boolean};
export const DEFAULT_SETTINGS:GameSettings={quality:'auto',frameRate:60,music:70,soundEffects:80,screenShake:true,showFps:true};
export function readSettings(raw:string|null):GameSettings{
 let v:Partial<GameSettings>={};try{v=JSON.parse(raw||'{}')??{};}catch{}
 const volume=(n:unknown,d:number)=>typeof n==='number'&&Number.isFinite(n)?Math.max(0,Math.min(100,Math.round(n))):d;
 return {quality:v.quality==='low'||v.quality==='high'?v.quality:'auto',frameRate:v.frameRate===30?30:60,music:volume(v.music,70),soundEffects:volume(v.soundEffects,80),screenShake:typeof v.screenShake==='boolean'?v.screenShake:true,showFps:typeof v.showFps==='boolean'?v.showFps:true};
}
let initial:string|null=null;try{initial=localStorage.getItem(SETTINGS_KEY);}catch{}
let value=readSettings(initial);
const listeners=new Set<(s:GameSettings)=>void>();
export const gameSettings={get:()=>({...value}),subscribe(fn:(s:GameSettings)=>void){listeners.add(fn);return ()=>listeners.delete(fn);},set(patch:Partial<GameSettings>){value=readSettings(JSON.stringify({...value,...patch}));let saved=true;try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(value));}catch{saved=false;}for(const fn of listeners)fn({...value});return saved;}};
