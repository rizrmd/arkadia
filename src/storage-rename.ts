// The game was renamed Arkadia → Arkodia, and so were its storage keys ('arkadia.hero' → 'arkodia.hero',
// 'arkadia-stronghold-v1' → 'arkodia-stronghold-v1', …). Each entry imports this first, so saved progress,
// the picked hero and settings move to the new keys before any module reads them. A key already saved under
// the new name wins.
const OLD='arkadia',NEW='arkodia';
for(const store of [()=>localStorage,()=>sessionStorage])try{
 const s=store();
 for(const k of Object.keys(s))if(k.startsWith(OLD)){const v=s.getItem(k),n=NEW+k.slice(OLD.length);if(v!==null&&s.getItem(n)===null)s.setItem(n,v);s.removeItem(k);}
}catch{}
export {};
