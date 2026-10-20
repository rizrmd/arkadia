import './style.css';
import {installTerrain} from './terrain';
import {icon} from './icons';
import {ground,placement,slots,WORLD,enclosure} from './scene';
import {KEY,BALANCE,buildings,load,rates,cost,upgrade,action,claim,type Building} from './economy';
import {transact,restore} from './store';
const info:Record<Building,{name:string;description:string;action:string;effect:string}>={
 mine:{name:'Mine / Farm',description:'Workers gather gold from the ash seams. Claim stored Gold and Mana together. Storage holds ten hours at current rates.',action:'Claim production',effect:'Doubles then triples base gold output.'},
 altar:{name:'Altar',description:'Unlock the Warden blessing for 10 Soul Shards. Your arena hero receives +20 maximum HP. The current hero sprite is reused; faction rosters are not implemented.',action:'Unlock Warden · 10 Soul Shards',effect:'Restores the sanctuary. Further faction hero unlocks are not implemented.'},
 barracks:{name:'Barracks',description:'Train one rank per restoration level. Each rank grants +10 arena maximum HP. Training costs 80 / 160 / 240 Gold.',action:'Train permanent HP',effect:'Unlocks one more training rank, up to three.'},
 forge:{name:'Forge',description:'Craft a persistent weapon for 60 Gold per forge tier (+10 HP per weapon tier). Reroll its affix for 30 Gold + 10 Mana: Vital (+0), Guard (+5), Stalwart (+10 HP per weapon tier). Deterministic cycle for sandbox testing; full loot inventory is not implemented.',action:'Craft / reroll weapon',effect:'Unlocks the next weapon tier (+10 HP), crafted separately. Full loot recipes are not implemented.'},
 mage:{name:'Mage Tower',description:'Produces Mana. Spend 30 / 60 / 90 Mana on Vitality ranks, each granting +5 arena HP. This is a three-node linear skill path; a branching tree is not implemented.',action:'Learn Vitality',effect:'Increases Mana output and unlocks another skill rank.'},
 expedition:{name:'Expedition Table',description:'Open the existing world: explore, clear locations, send idle expeditions and claim their materials/XP. Its save and rewards remain separate from the stronghold economy.',action:'Open expedition world ↗',effect:'Restores the table. Dispatch capacity remains managed by the expedition world.'},
 gate:{name:'Run Gate',description:'Enter the existing arena. Defeat five enemies, then return to receive 100 Gold, 20 Mana and 3 Soul Shards once per run. Stronghold HP bonuses apply on entry.',action:'Start arena run ↗',effect:'Repairs the gate. Run difficulty remains unchanged.'}
};
const buildingSprite=(b:Building,level:number)=>b==='forge'?`/fortress-ui/forge-${level}.webp`:b==='gate'?'/modular-stronghold/gate.png':`/assets/${slots[b].asset}.png`;
const root=document.querySelector('#stronghold')!;
root.innerHTML=`<div class="layout"><main><section class="resources" aria-label="Resources"></section><div class="scene" aria-label="Stronghold fortress courtyard"><div class="scene-world">${ground()}${enclosure()}<div id="slots"></div></div></div><div class="variants"><h3>Forge Building Variants <span>(Same Base Module)</span></h3><div class="variant-grid">${['Base (New)','Ruined','Repaired','Upgraded (Level 3)'].map((name,i)=>`<figure class="variant variant-${i}"><img src="/fortress-ui/forge-${[1,0,2,3][i]}.webp" alt="Forge ${name}"><figcaption>${name}</figcaption></figure>`).join('')}</div></div><div class="quick" aria-label="Building selection"></div></main><div class="sidebar"><aside aria-label="Building details"></aside><div class="destinations"><button id="claim">${icon('chest')} <span>Claim All</span></button><a href="/expedition.html">${icon('map')} <span>Expeditions</span></a><button id="start-run">${icon('swords')} <span>Start Run</span></button></div><div class="return"><p id="offline"></p><p id="status" role="status">Saved locally in this browser.</p></div></div></div><footer><span id="building-action"></span><a href="/index.html">ARKADIA · Arena</a><span>Local save · 10-hour storage</span><button id="export">Export save</button><label class="import">Import save <input type="file" id="import" accept="application/json"></label></footer>`;
let selected:Building='forge',busy=false;
const el=(s:string)=>root.querySelector(s) as HTMLElement;
// Scale the complete approved game frame by height on narrow screens. The
// surrounding page owns horizontal panning; the game never stacks vertically.
function configureViewport(){
 const mobile=window.matchMedia('(max-width:1100px)').matches;
 document.documentElement.classList.toggle('horizontal-game',mobile);
 if(mobile){
  const height=window.visualViewport?.height||window.innerHeight;
  const scale=Math.max(0.1,(height-44)/1024);
  const width=Math.max(window.innerWidth,1536*scale);
  (root as HTMLElement).style.setProperty('--game-scale',String(scale));
  (root as HTMLElement).style.setProperty('--game-width',`${width}px`);
  (root as HTMLElement).style.setProperty('--game-offset',`${Math.max(0,(width-1536*scale)/2)}px`);
 }
}
configureViewport();
window.addEventListener('resize',configureViewport);
window.visualViewport?.addEventListener('resize',configureViewport);
const fit=()=>{const scene=el('.scene');const scale=Math.min(scene.clientWidth/WORLD.width,scene.clientHeight/WORLD.height);el('.scene-world').style.transform=`translate(-50%,-50%) scale(${scale})`;};
new ResizeObserver(fit).observe(el('.scene'));fit();
installTerrain(el('.scene'),WORLD);
function read(){return load(localStorage.getItem(KEY));}
function render(){try{const s=read(),r=rates(s);el('.resources').innerHTML=`<div>${icon('coin')} Gold <b>${Math.floor(s.gold)}</b></div><div>${icon('gem')} Mana <b>${Math.floor(s.mana)}</b></div><div>${icon('skull')} Souls <b>${s.souls}</b></div>`;
 el('#slots').innerHTML=buildings.map(b=>`<button class="building ${b} tier-${s.levels[b]} ${selected===b?'selected':''}" data-building="${b}" style="${placement(b)}" aria-label="Select ${info[b].name}" aria-pressed="${selected===b}"><span class="base"></span><img src="${buildingSprite(b,s.levels[b])}" alt=""><i class="repair"></i>${b==='forge'?'<i class="furnace"></i>':''}<span class="building-label">${info[b].name}${b==='mine'&&s.storedGold>=1?' ▣':''}<small>Level ${s.levels[b]} · ${['New','Repaired','Restored'][s.levels[b]-1]}</small></span></button>`).join('');
 el('.quick').innerHTML=buildings.map(b=>`<button data-building="${b}" aria-pressed="${selected===b}">${info[b].name}</button>`).join('');
 const b=selected,d=info[b],c=cost(s,b),max=s.levels[b]>=BALANCE.maxLevel,req=b!=='mine'&&s.levels.mine<s.levels[b]+1;
 const hp=100+(s.hero?20:0)+s.training*10+s.skill*5+(s.weapon?s.weapon*10+s.affix*5:0);
 const descriptions:Record<Building,string>={mine:'Gather gold and harvest supplies for your sanctuary.',altar:'Restore the sanctuary and unlock the Warden blessing.',barracks:'Train your expeditioners for the battles ahead.',forge:'Smelts ore into equipment for your expeditioners.',mage:'Gather Mana and study the art of Vitality.',expedition:'Explore the world and send your expeditioners in search of supplies.',gate:'Leave the safety of the fortress. Return with the spoils of battle.'};
 el('aside').innerHTML=`<div class="detail-heading"><div class="portrait tier-${s.levels[b]}"><img src="${buildingSprite(b,s.levels[b])}" alt="${d.name}"></div><div><h2>${d.name}</h2><p>Level ${s.levels[b]}</p></div></div><p class="description">${descriptions[b]}</p><div class="facts">${(b==='forge'?[[icon('anvil'),'Weapon tier',`${s.weapon} / 3`],[icon('person'),'Health per tier','+10 HP'],[icon('clock'),'Reroll cost','30 G · 10 M']]:[[icon('anvil'),'Arena health',`${hp} HP`],[icon('person'),'Training rank',`${s.training} / 3`],[icon('clock'),'Production',`${r.gold} G · ${r.mana} M / h`]]).map(([i,label,value])=>`<div><span>${i}${label}</span><b>${value}</b></div>`).join('')}</div><hr><h3>${max?'Fully restored':`Next Level (${s.levels[b]+1})`}</h3>${b==='forge'?`<div class="next-stats"><div><span>${s.levels.forge}</span><i>→</i><b>${Math.min(3,s.levels.forge+1)}</b><label>Weapon tier</label></div><div><span>+${s.levels.forge*10} HP</span><i>→</i><b>+${Math.min(3,s.levels.forge+1)*10} HP</b><label>Crafted health</label></div><div><span>${s.levels.forge*60} G</span><i>→</i><b>${Math.min(3,s.levels.forge+1)*60} G</b><label>Craft cost</label></div></div>`:`<p class="effect">${d.effect}</p>`}<p class="requirement">${req?`Requires Mine level ${s.levels[b]+1}`:max?'Maximum level reached':''}</p><div class="upgrade-card"><h3>${max?'Sanctuary restored':`Upgrade to Level ${s.levels[b]+1}`}</h3><p class="price">${max?'Level 3 / 3':`${icon('coin')} ${c.gold}${c.mana?` · ${c.mana} Mana`:''}${c.souls?` · ${c.souls} Souls`:''}`}</p><button id="upgrade" ${max||req||s.gold<c.gold||s.mana<c.mana||s.souls<c.souls||busy?'disabled':''}>${max?'Restored':'Upgrade'}</button></div><details><summary>Building abilities</summary><p>${d.description}</p><p>Training ${s.training} · Vitality ${s.skill} · Warden ${s.hero?'unlocked':'locked'}</p></details>`;
 el('#building-action').innerHTML=`<button id="action" ${busy?'disabled':''}>${d.action}</button>`;
 el('#offline').textContent=`${Math.floor(s.storedGold)} / ${r.gold*10} Gold · ${Math.floor(s.storedMana)} / ${r.mana*10} Mana stored. Production ${r.gold} Gold + ${r.mana} Mana per hour. ${s.storedGold>=r.gold*10?'Gold storage full.':''}`;
 root.querySelectorAll<HTMLElement>('[data-building]').forEach(e=>e.onclick=()=>{selected=e.dataset.building as Building;render();});
 el('#upgrade').onclick=()=>run(()=>transact(s=>upgrade(s,selected)),'Building restored.');
 el('#action').onclick=()=>{if(b==='expedition'){location.href='/expedition.html';return;}if(b==='gate'){run(async()=>{await transact(s=>{s.runId=crypto.randomUUID();});location.href='/index.html?stronghold=1';},'Run prepared.');return;}run(()=>transact(s=>action(s,b)),'Action completed and saved.');};
 }catch(e){el('#status').textContent=String(e);}}
async function run(fn:()=>Promise<unknown>,message:string){if(busy)return;busy=true;try{await fn();el('#status').textContent=message;}catch(e){el('#status').textContent=String(e);}finally{busy=false;render();}}
el('#start-run').onclick=()=>run(async()=>{await transact(s=>{s.runId=crypto.randomUUID();});location.href='/index.html?stronghold=1';},'Run prepared.');
el('#claim').onclick=()=>run(()=>transact(s=>{claim(s);}),'Production claimed and saved.');
el('#export').onclick=()=>{try{const s=read(),url=URL.createObjectURL(new Blob([JSON.stringify(s)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='arkadia-stronghold.json';a.click();URL.revokeObjectURL(url);}catch(e){el('#status').textContent=String(e);}};
el('#import').onchange=async e=>{const file=(e.target as HTMLInputElement).files?.[0];if(file)run(async()=>{const raw=await file.text();await restore(raw);},'Backup imported. Import replaces this browser progress.');};
window.addEventListener('storage',render);setInterval(()=>{if(!root.contains(document.activeElement)||document.activeElement===document.body)render();},1000);run(()=>transact(()=>{}),'Welcome home. Offline supplies are ready to claim.');render();
