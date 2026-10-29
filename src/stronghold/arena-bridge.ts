import '../storage-rename';
import './english';
import {KEY,load,rewardRun} from './economy';
import {transact} from './store';
const link=document.createElement('a');link.id='stronghold-link';link.href='/';link.textContent='← Stronghold';link.style.cssText='position:fixed;right:20px;top:45px;z-index:1000;background:#20282a;color:#ffdda5;padding:12px;border:1px solid #89734c;font:13px system-ui';document.querySelector('main')!.prepend(link);
if(new URLSearchParams(location.search).has('stronghold')){
 const timer=setInterval(()=>{const arena=(window as any).__ARKODIA_ARENA__;if(!arena)return;clearInterval(timer);try{const s=load(localStorage.getItem(KEY)),id=s.runId;let bonus=(s.hero?20:0)+s.training*10+s.skill*5+(s.weapon?s.weapon*10+s.affix*5:0);arena.hero.hp+=bonus;const respawn=arena.respawnHero.bind(arena);arena.respawnHero=()=>{respawn();arena.hero.hp+=bonus;};link.textContent='Return home · defeat 5 enemies for supplies';
 link.onclick=async e=>{e.preventDefault();if(arena.kills<5){location.href=link.href;return;}try{await transact(current=>rewardRun(current,id,arena.kills));location.href=link.href;}catch(err){link.textContent=String(err);}};
 const hud=setInterval(()=>{if(arena.kills>=5){link.textContent='← Return & claim run supplies';clearInterval(hud);}},500);
 }catch(e){link.textContent=String(e);}},100);
}
