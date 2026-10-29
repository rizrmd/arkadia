// Physical keys keep shortcuts stable across keyboard layouts. Progression reset never clears preferences.
export const BINDINGS_KEY='arkodia.skill-bindings.v1';
export const DEFAULT_BINDINGS=['Digit1','Digit2','Digit3'] as const;
const reserved=new Set(['KeyW','KeyA','KeyS','KeyD','KeyI','KeyK','KeyM']);
export const bindingAllowed=(code:string)=>/^(Key[A-Z]|Digit[0-9])$/.test(code)&&!reserved.has(code);
export const bindingLabel=(code:string)=>code.replace(/^Key|^Digit/,'');
export function readBindings(raw:string|null):string[]{
 try{const v=JSON.parse(raw??'null');if(Array.isArray(v)&&v.length===3&&v.every(c=>typeof c==='string'&&bindingAllowed(c))&&new Set(v).size===3)return [...v];}catch{}
 return [...DEFAULT_BINDINGS];
}
let raw:string|null=null;try{raw=localStorage.getItem(BINDINGS_KEY);}catch{}
let value=readBindings(raw);const listeners=new Set<()=>void>();
function save(next:string[]){value=next;let saved=true;try{localStorage.setItem(BINDINGS_KEY,JSON.stringify(value));}catch{saved=false;}for(const fn of listeners)fn();return saved;}
export const skillBindings={get:()=>[...value],label:(slot:number)=>bindingLabel(value[slot]),slot:(code:string)=>value.indexOf(code),subscribe(fn:()=>void){listeners.add(fn);return ()=>listeners.delete(fn);},assign(slot:number,code:string){
 if(!Number.isInteger(slot)||slot<0||slot>2||!bindingAllowed(code))return 'Reserved key. Use a letter or number; movement, I, K and M are reserved.';
 if(value.some((c,i)=>i!==slot&&c===code))return 'That key is already assigned to another slot.';
 const next=[...value];next[slot]=code;return save(next)?'':'Shortcut changed, but could not be saved on this browser.';
},reset:()=>save([...DEFAULT_BINDINGS])};
if(typeof window!=='undefined')window.addEventListener('storage',e=>{if(e.key!==BINDINGS_KEY)return;value=readBindings(e.newValue);for(const fn of listeners)fn();});
