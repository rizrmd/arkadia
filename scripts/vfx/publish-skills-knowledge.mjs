// Publishes the English Skills Knowledge hierarchy and embedded Skill Player pages
// for Ember Warden and Rift Runner in Fural project Knowledge (PJ8758f22f61165f3d3215e454).
import {execFileSync} from 'node:child_process';

const ORG='ORd5dd6f99b4308d6187031557';
const PROJ='PJ8758f22f61165f3d3215e454';
const REPO='RPe11327fbfe413dbeba246526';
const HOST='https://ark-whachat.fural.space';

const EMBER_WARDEN_ID='NKBDc8ca8c735a55009062b64a64';
const RIFT_RUNNER_ID='NKBD8fd35c078bf65d4b103b5d23';
const EXISTING_EMBER_SKILLS_ID='NKBD4e400e0774ede4382c22e651';

const repoLink=(label,relPath)=>`[${label}](/organizations/${ORG}/repositories/${REPO}/files?file=${encodeURIComponent(relPath)})`;
const kbLink=(label,id)=>`[${label}](/organizations/${ORG}/projects/${PROJ}/knowledge/${id})`;

function fural(args){
 const out=execFileSync('fural-agent',args,{encoding:'utf8',maxBuffer:16*1024*1024});
 return JSON.parse(out);
}

const allPages=fural(['knowledge','list','--project',PROJ]);

function ensurePage({parentId,title,slug,sortOrder,markdown,existingId}){
 let page=existingId?allPages.find(p=>p.id===existingId):allPages.find(p=>p.parent_id===parentId&&(p.title===title||(slug&&p.slug===slug)));
 const slugArgs=slug?['--slug',slug]:[];
 if(page){
  const updated=fural(['knowledge','update',page.id,'--title',title,'--parent',parentId,'--sort-order',String(sortOrder),...slugArgs,'--markdown',markdown]);
  console.log(`Updated page [${updated.id}] ${title} (parent=${parentId}, sort=${sortOrder}, slug=${updated.slug})`);
  return updated.id;
 }
 const created=fural(['knowledge','create','--project',PROJ,'--parent',parentId,'--title',title,'--sort-order',String(sortOrder),...slugArgs,'--markdown',markdown]);
 allPages.push(created);
 console.log(`Created page [${created.id}] ${title} (parent=${parentId}, sort=${sortOrder}, slug=${created.slug})`);
 return created.id;
}

function buildSkillChildMarkdown(spec){
 const {
  heroId,heroName,skillId,skillTitle,slotRole,badge,cooldownMs,baseDamageScale,
  shapeAndRange,rankScalingRows,summary,cues,layersSummary,recipeFile,heroFxFile,
  extraImages=[],
 }=spec;

 const iframeUrl=`${HOST}/skill-player/?hero=${heroId}&skill=${skillId}&dir=SE&controls=simple`;
 const previewUrl=`${HOST}/docs/nixie-fx/skill-${heroId}-${skillId}.webp`;

 const cueRows=cues.map(c=>`| \`${c.key}\` | **${c.stage}** | ${c.plane} | ${c.desc} |`).join('\n');
 const rankRows=rankScalingRows.map(r=>`| **Lv. ${r.rank}** | ${r.damage} | ${r.cooldown} | ${r.extra} |`).join('\n');
 const extraImgBlocks=extraImages.map(img=>`\n![${img.alt}](${img.url})\n`).join('');

 return `${summary}

![${heroName} — ${skillTitle} in the interactive Skill Player](${previewUrl})
${extraImgBlocks}
## Mechanical specification

| Property | Value |
| --- | --- |
| **Hero** | ${heroName} (\`${heroId}\`) |
| **Skill ID & Badge** | \`${skillId}\` · \`${badge}\` |
| **Loadout Slot** | ${slotRole} |
| **Base Cooldown** | \`${cooldownMs} ms\` (\`${(cooldownMs/1000).toFixed(1)} s\`, reduced by \`−8%\` per skill rank and \`−12%\` per Chrono Surge rank; \`45%\` floor) |
| **Base Damage Scale** | \`${baseDamageScale}\` × Hero Attack Damage (\`+25%\` per rank above Lv. 1; \`1.15×\` Dual Cast / \`1.30×\` Trinity Cast bonus) |
| **Geometry & Range** | ${shapeAndRange} |
| **Auto-Cast Trigger** | Fires automatically when a living Revenant enters the hero's AoE detection ring (\`2.2 × reach\` tiles) outside the Safe Zone |

### Rank scaling (Lv. 1 – Lv. 5)

| Rank | Skill Damage Multiplier | Base Cooldown (No Haste) | Rank Upgrade Effect |
| --- | --- | --- | --- |
${rankRows}

## Interactive Skill Player

<iframe src="${iframeUrl}" title="${heroName} — ${skillTitle} Skill Player" width="100%" height="520" loading="lazy"></iframe>

Use the interactive controls along the bottom bar to inspect every stage and angle of **${skillTitle}**:

- **Skill & Cue / Stage Switcher**: Switch between **Full Sequence** and individual NixieFX stages (${cues.map(c=>`**${c.stage}**`).join(', ')}), or compare against other ${heroName} skills.
- **8-Direction Switcher** (**N**, **NE**, **E**, **SE**, **S**, **SW**, **W**, **NW**): Rotate the hero sprite (${repoLink(`assets-src/sprite-player/${heroId}-attack.png`,`assets-src/sprite-player/${heroId}-attack.png`)} packed into ${repoLink(`public/assets/characters/${heroId}.webp`,`public/assets/characters/${heroId}.webp`)} via ${repoLink('scripts/pack-heroes.mjs','scripts/pack-heroes.mjs')}, \`MANIFEST_REV = '1side-v6'\`), target Revenant dummy, and isometric 2:1 particle projection across all eight compass headings.
- **Play / Replay**: Trigger an immediate fresh cast of the selected sequence or cue.
- **Loop / Once**: Toggle continuous auto-repeat (**Loop**, every \`2.2 s\`) or single-shot playback (**Once**).
- **Background Switcher** (**Night** / **Day**): Compare additive thermal/arcane glow on the night courtyard against crisp daylight snow.

### Embed this player on another page

\`\`\`html
<iframe src="${iframeUrl}" title="${heroName} — ${skillTitle} Skill Player" width="100%" height="520"></iframe>
\`\`\`

| Query Parameter | Description |
| --- | --- |
| \`hero=${heroId}\` | Selects **${heroName}** character atlas and FX profile |
| \`skill=${skillId}\` | Selects **${skillTitle}** (\`play=${skillId}\` is also supported) |
| \`cue=full\\|cast\\|bolt\\|telegraph\\|detonate\\|impact\` | Starts on **Full Sequence** (\`full\`) or a specific stage cue |
| \`dir=N\\|NE\\|E\\|SE\\|S\\|SW\\|W\\|NW\` | Sets the initial compass heading (default \`SE\`) |
| \`loop=1\\|0\` | Starts in **Loop** (\`1\`, default) or **Once** (\`0\`) mode |
| \`bg=night\\|day\` | Sets initial courtyard background (**Night** default in simple mode) |
| \`controls=simple\` | Compact two-row embed control bar for Knowledge pages |

## NixieFX cues & particle layers

${layersSummary}

| Cue Key | Stage Button | Plane | Particle Assembly |
| --- | --- | --- | --- |
${cueRows}

## Source & verification

- **Combat mechanics & auto-cast**: ${repoLink('src/stronghold/combat-vfx.ts','src/stronghold/combat-vfx.ts')} · ${repoLink('src/stronghold/progression.ts','src/stronghold/progression.ts')}
- **Hero FX profile & recipes**: ${repoLink(heroFxFile,heroFxFile)} · ${repoLink(recipeFile,recipeFile)} · ${repoLink('scripts/vfx/lib/kits.mjs','scripts/vfx/lib/kits.mjs')} · ${repoLink('scripts/vfx/lib/layers.mjs','scripts/vfx/lib/layers.mjs')}
- **Skill Player runtime & verification**: ${repoLink('src/fx/lab.ts','src/fx/lab.ts')} · ${repoLink('scripts/vfx/verify-skill-player.mjs','scripts/vfx/verify-skill-player.mjs')} · ${repoLink('skill-player-verify.json','docs/nixie-fx/skill-player-verify.json')}
`;
}

// 1. Ember Warden skill definitions
const emberSkills=[
 {
  heroId:'ember-warden',
  heroName:'Ember Warden',
  skillId:'flame-fan',
  skillTitle:'Flame Fan',
  sortOrder:10,
  slotRole:'Slot 1 Signature Skill (equipped at Level 1)',
  badge:'FAN',
  cooldownMs:1400,
  baseDamageScale:'0.78× per fireball (3–5 fireballs)',
  shapeAndRange:'Fan of 3 / 4 / 5 piercing fireballs · range `4.4` tiles · speed `6.4` tiles/s · hit radius `0.38` tiles · cast circle `2.7` tiles across',
  summary:'**Flame Fan** is the Ember Warden\'s Slot 1 signature skill. A `2.7`-tile counter-rotating pixel-particle magic circle (`polar-shockwave` + `ember-lut`) ignites beneath her boots while an `8×8` (64-frame) Sub-UV fire burst (`explosion.png`) and Voronoi-eroded fire stream (`eroded-scroll`) pour from her bronze gauntlet, launching 3, 4, or 5 incandescent fireballs that trail scrolling comet wakes and detonate in 64-frame Sub-UV explosions and charred ground decals on impact.',
  extraImages:[
   {alt:'Flame Fan in the Stronghold by day',url:`${HOST}/docs/nixie-fx/game-ember-warden-flame-fan-day.webp`},
   {alt:'Flame Fan in the Stronghold at night',url:`${HOST}/docs/nixie-fx/game-ember-warden-flame-fan-night.webp`},
   {alt:'Flame Fan fire bolts in flight at night',url:`${HOST}/docs/nixie-fx/game-flame-fan-night-bolts.webp`},
  ],
  rankScalingRows:[
   {rank:1,damage:'1.00× (0.78× per bolt)',cooldown:'1400 ms',extra:'3 fireballs (`-0.34`, `0`, `+0.34` rad fan spread)'},
   {rank:2,damage:'1.25× (0.98× per bolt)',cooldown:'1288 ms',extra:'4 fireballs (`-0.36`, `-0.12`, `+0.12`, `+0.36` rad fan spread)'},
   {rank:3,damage:'1.50× (1.17× per bolt)',cooldown:'1185 ms',extra:'5 fireballs (`-0.44`, `-0.22`, `0`, `+0.22`, `+0.44` rad fan spread)'},
   {rank:4,damage:'1.75× (1.37× per bolt)',cooldown:'1090 ms',extra:'5 fireballs + wider cast circle scale (`1.54×`)'},
   {rank:5,damage:'2.00× (1.56× per bolt)',cooldown:'1003 ms',extra:'5 fireballs + maximum thermal spread (`1.72×`)'},
  ],
  layersSummary:'Authored with Diablo-style NixieFX Tier-2 `ShaderGraph` master materials (`eroded-scroll`, `polar-shockwave`, and `ember-lut` 1D blackbody LUT `#1a0704` dark charcoal soot → `#5a0f05` → `#d9380a` molten crimson → `#ff9e22` → `#fffdf2` incandescent core), RGBA channel-packed noise (`noise.png`), and `8×8` (64-frame) Sub-UV explosion flipbooks (`explosion.png`):',
  cues:[
   {key:'flame-fan.cast',stage:'Cast',plane:'Ground + World',desc:'Counter-rotating 72-mote pixel magic circle (`radius 1.35`), polar magma ring (`polar-shockwave`), `8×8` Sub-UV muzzle flash (`explosion.png`), Voronoi-eroded fire stream (`eroded-scroll`, `rate 190`, `28°` spread) + additive core + 104 LUT-mapped bouncing sparks (`ember-lut`)'},
   {key:'flame-fan.bolt',stage:'Projectile / Bolt',plane:'World (local slide)',desc:'Incandescent fireball head (`L.comet`, `ember-lut`), `8×8` Sub-UV churning fire core (`explosion.png`, `rate 64`), Voronoi-eroded comet ribbon wake (`eroded-scroll`, `rate 165`), and shedding ember trail (`ember-lut`)'},
   {key:'flame-fan.impact',stage:'Impact',plane:'Ground + World',desc:'`8×8` Sub-UV fireball detonation (`explosion.png`, `count 26`), eroded flame plumes (`eroded-scroll`), 58 spherical bouncing sparks (`ember-lut`), polar shockwave ring (`polar-shockwave`, `radius 0.85`), and charred ground scorch + magma crack decal (`ember-lut`)'},
  ],
  recipeFile:'vfx/recipes/ember-warden.mjs',
  heroFxFile:'src/fx/heroes/ember-warden.ts',
 },
 {
  heroId:'ember-warden',
  heroName:'Ember Warden',
  skillId:'cinder-step',
  skillTitle:'Cinder Step',
  sortOrder:20,
  slotRole:'Unlockable Active Skill (Slot 2 / Slot 3 via Blessing)',
  badge:'STEP',
  cooldownMs:1400,
  baseDamageScale:'1.10×',
  shapeAndRange:'Forward burning lunge (`1.5` tiles) + frontal flame cone (`radius 1.35 × reach`, spread `122°` / `0.68π rad`, `260 ms` detonation)',
  summary:'**Cinder Step** is the Ember Warden\'s close-quarters mobility and burst skill. She lunges forward in a trail of 3–5 burning afterimages, leaving Voronoi-eroded standing fire ribbons (`eroded-scroll`), `8×8` Sub-UV flame bursts (`explosion.png`), and burning cinder ground trails (`ember-lut`) along her path before unleashing a soulercoaster fiery crescent sweep (`polar-shockwave`) and frontal cone detonation.',
  extraImages:[
   {alt:'Cinder Step in the Stronghold by day',url:`${HOST}/docs/nixie-fx/game-ember-warden-cinder-step-day.webp`},
   {alt:'Cinder Step in the Stronghold at night',url:`${HOST}/docs/nixie-fx/game-ember-warden-cinder-step-night.webp`},
  ],
  rankScalingRows:[
   {rank:1,damage:'1.00× (1.10× base)',cooldown:'1400 ms',extra:'3 burning afterimages · `1.35` tile cone radius'},
   {rank:2,damage:'1.25× (1.38× total)',cooldown:'1288 ms',extra:'4 burning afterimages · `1.59` tile cone radius (`+18%`)'},
   {rank:3,damage:'1.50× (1.65× total)',cooldown:'1185 ms',extra:'5 burning afterimages · `1.84` tile cone radius (`+36%`)'},
   {rank:4,damage:'1.75× (1.93× total)',cooldown:'1090 ms',extra:'5 burning afterimages · `2.08` tile cone radius (`+54%`)'},
   {rank:5,damage:'2.00× (2.20× total)',cooldown:'1003 ms',extra:'5 burning afterimages · `2.32` tile cone radius (`+72%`)'},
  ],
  layersSummary:'Built on Diablo-style `ShaderGraph` materials (`polar-shockwave` soulercoaster crescent sweep, `eroded-scroll` standing path fire ribbons, and `ember-lut` 1D blackbody ramp) with `8×8` Sub-UV `explosion.png` bursts and glowing cinder trails:',
  cues:[
   {key:'cinder-step.cast',stage:'Cast',plane:'Ground + World',desc:'36-mote pixel dash circle (`radius 0.72`), 3–5 thermal afterimages, Voronoi-eroded standing path fire (`eroded-scroll`, `rate 115`), `8×8` Sub-UV trail bursts (`explosion.png`), 36 LUT-mapped cinders & sparks (`ember-lut`), and scorched cinder ground trail'},
   {key:'cinder-step.detonate',stage:'Detonate',plane:'Ground + World',desc:'Frontal cone burst at `260 ms`: soulercoaster fiery crescent sweep (`polar-shockwave`, `count 30`, `radius 1.38`), `8×8` Sub-UV arrival explosion (`explosion.png`, `count 22`), eroded flame cone (`eroded-scroll`), 50 bouncing sparks, and LUT-mapped soot/scorch decal (`ember-lut`)'},
  ],
  recipeFile:'vfx/recipes/ember-warden.mjs',
  heroFxFile:'src/fx/heroes/ember-warden.ts',
 },
 {
  heroId:'ember-warden',
  heroName:'Ember Warden',
  skillId:'ember-snare',
  skillTitle:'Ember Snare',
  sortOrder:30,
  slotRole:'Unlockable Active Skill (Slot 2 / Slot 3 via Blessing)',
  badge:'SNARE',
  cooldownMs:2800,
  baseDamageScale:'1.25×',
  shapeAndRange:'Targeted 2:1 isometric ground circle (`base radius 1.50 × reach`, `640 ms` telegraph charge, clamped before walls)',
  summary:'**Ember Snare** inscribes a cracked basalt crater and rotating polar magma ring (`polar-shockwave`) beneath the target Revenant (clamped cleanly before any Stronghold wall). Over `640 ms`, counter-rotating flame rings, inward-spiralling core motes (`ember-lut`), and Voronoi-eroded rim fire (`eroded-scroll`) gather before erupting into a towering vertical fire pillar (`eroded-scroll` + `8×8` Sub-UV `explosion.png`), glowing cinders, and double polar shockwave rings.',
  extraImages:[
   {alt:'Ember Snare in the Stronghold by day',url:`${HOST}/docs/nixie-fx/game-ember-warden-ember-snare-day.webp`},
   {alt:'Ember Snare in the Stronghold at night',url:`${HOST}/docs/nixie-fx/game-ember-warden-ember-snare-night.webp`},
   {alt:'Ember Snare erupting into a vertical fire geyser',url:`${HOST}/docs/nixie-fx/game-ember-snare-eruption.webp`},
  ],
  rankScalingRows:[
   {rank:1,damage:'1.00× (1.25× base)',cooldown:'2800 ms',extra:'`1.50` tile eruption radius (`1.00×` area)'},
   {rank:2,damage:'1.25× (1.56× total)',cooldown:'2576 ms',extra:'`1.77` tile eruption radius (`+18%` area)'},
   {rank:3,damage:'1.50× (1.88× total)',cooldown:'2370 ms',extra:'`2.04` tile eruption radius (`+36%` area)'},
   {rank:4,damage:'1.75× (2.19× total)',cooldown:'2180 ms',extra:'`2.31` tile eruption radius (`+54%` area)'},
   {rank:5,damage:'2.00× (2.50× total)',cooldown:'2006 ms',extra:'`2.58` tile eruption radius (`+72%` area)'},
  ],
  layersSummary:'Built on `eroded-scroll` sharply eroded vertical fire eruption pillars, `8×8` Sub-UV `explosion.png` geyser crowns, `polar-shockwave` rotating magma seals and shockwave rings, and `ember-lut` cracked basalt craters:',
  cues:[
   {key:'ember-snare.telegraph',stage:'Telegraph',plane:'Ground + World',desc:'`640 ms` charge: 78-mote counter-rotating pixel `L.magicCircle` (`radius 1.5`), rotating polar magma ring (`polar-shockwave`), cracked basalt fissure seal (`ember-lut`), inward-pulling `L.vortex`, and simmering Voronoi-eroded rim flames (`eroded-scroll`, `rate 92`)'},
   {key:'ember-snare.detonate',stage:'Detonate',plane:'Ground + World',desc:'Vertical fire eruption pillar (`eroded-scroll`, `count 44`), `8×8` Sub-UV explosion geyser (`explosion.png`, `count 28`), 74 cone sparks, 42 radial skim motes, 18 glowing cinders (`ember-lut`), double `polar-shockwave` rings (`radius 2.20`), and cracked basalt magma crater'},
  ],
  recipeFile:'vfx/recipes/ember-warden.mjs',
  heroFxFile:'src/fx/heroes/ember-warden.ts',
 },
 {
  heroId:'ember-warden',
  heroName:'Ember Warden',
  skillId:'cleave',
  skillTitle:'Molten Cleave',
  sortOrder:40,
  slotRole:'Unlockable Active Skill (Slot 2 / Slot 3 via Blessing — Dedicated Ember Warden Override)',
  badge:'CLEAVE',
  cooldownMs:2100,
  baseDamageScale:'1.20×',
  shapeAndRange:'Wide frontal volcanic crescent cone (`base radius 1.55 × reach`, cone arc `135°` + `7°` per rank up to `207°`, `320 ms` wind-up)',
  summary:'**Molten Cleave** replaces the generic purple Astral Cleave on the Ember Warden with a dedicated Diablo-style volcanic fire cleave (`ember-warden.cleave`). Over `320 ms`, incandescent fire glints (`ember-lut`), Voronoi-eroded flame ribbons (`eroded-scroll`), and double soulercoaster magma slash arcs (`polar-shockwave`) wind up across a `135°–207°` frontal cone before unleashing an `8×8` Sub-UV volcanic explosion (`explosion.png`), a sweeping soulercoaster fire blade, flying volcanic slag shards, and glowing magma wedge fissures.',
  extraImages:[
   {alt:'Molten Cleave in the Stronghold by day',url:`${HOST}/docs/nixie-fx/game-ember-warden-cleave-day.webp`},
   {alt:'Molten Cleave in the Stronghold at night',url:`${HOST}/docs/nixie-fx/game-ember-warden-cleave-night.webp`},
  ],
  rankScalingRows:[
   {rank:1,damage:'1.00× (1.20× base)',cooldown:'2100 ms',extra:'`1.55` tile radius · `135°` (`0.75π rad`) molten cleave cone'},
   {rank:2,damage:'1.25× (1.50× total)',cooldown:'1932 ms',extra:'`1.83` tile radius (`+18%`) · `149°` (`0.83π rad`) molten cleave cone'},
   {rank:3,damage:'1.50× (1.80× total)',cooldown:'1777 ms',extra:'`2.11` tile radius (`+36%`) · `162°` (`0.90π rad`) molten cleave cone'},
   {rank:4,damage:'1.75× (2.10× total)',cooldown:'1635 ms',extra:'`2.39` tile radius (`+54%`) · `176°` (`0.98π rad`) molten cleave cone'},
   {rank:5,damage:'2.00× (2.40× total)',cooldown:'1504 ms',extra:'`2.67` tile radius (`+72%`) · `190°` (`1.05π rad`) molten cleave cone'},
  ],
  layersSummary:'Dedicated Ember Warden override (`ember-warden/cleave.cast` & `ember-warden/cleave.detonate`) authored in the `EMBER` & `MAGMA` palettes with `polar-shockwave` soulercoaster crescent blades, `eroded-scroll` fire ribbons, `ember-lut` 1D blackbody ramp, and `8×8` Sub-UV `explosion.png` detonations:',
  cues:[
   {key:'cleave.cast',stage:'Cast',plane:'Ground + World',desc:'`320 ms` wind-up: 9 arc-spread molten glints (`126°` arc, `ember-lut`), Voronoi-eroded wind-up fire ribbons (`eroded-scroll`), double staggered soulercoaster `L.slashDecal` arcs (`polar-shockwave`), and pre-heating magma wedge cracks'},
   {key:'cleave.detonate',stage:'Detonate',plane:'Ground + World',desc:'Volcanic crescent strike at `320 ms`: `8×8` Sub-UV fire burst (`explosion.png`, `count 24`), 34-particle soulercoaster magma blade (`polar-shockwave`, `radius 1.65`), eroded flame wave (`eroded-scroll`), 52 cone sparks, 14 volcanic slag shards (`ember-lut`), and glowing magma wedge fissures'},
  ],
  recipeFile:'vfx/recipes/ember-warden.mjs',
  heroFxFile:'src/fx/heroes/ember-warden.ts',
 },
 {
  heroId:'ember-warden',
  heroName:'Ember Warden',
  skillId:'shockwave',
  skillTitle:'Seismic Slam (Molten)',
  sortOrder:50,
  slotRole:'Unlockable Active Skill (Slot 2 / Slot 3 via Blessing — Hero-Reskinned in MAGMA)',
  badge:'SLAM',
  cooldownMs:2800,
  baseDamageScale:'1.30×',
  shapeAndRange:'360° radial ground slam centered on the hero (`base radius 1.65 × reach`, `460 ms` fracture wind-up)',
  summary:'**Seismic Slam (Molten)** is the Ember Warden\'s 360° tectonic magma slam (`ember-warden.shockwave`). While she winds up for `460 ms`, an inward-pulling molten pixel magic circle (`polar-shockwave`) and glowing magma fractures (`ember-lut`) gather around her boots, then detonate in a 360° eruption of `8×8` Sub-UV fireballs (`explosion.png`), Voronoi-eroded magma plumes (`eroded-scroll`), volcanic rock shards, LUT-mapped charcoal smoke/soot (`ember-lut`), and double expanding polar shockwave rings.',
  extraImages:[
   {alt:'Seismic Slam (Molten) in the Stronghold by day',url:`${HOST}/docs/nixie-fx/game-ember-warden-shockwave-day.webp`},
   {alt:'Seismic Slam (Molten) in the Stronghold at night',url:`${HOST}/docs/nixie-fx/game-ember-warden-shockwave-night.webp`},
  ],
  rankScalingRows:[
   {rank:1,damage:'1.00× (1.30× base)',cooldown:'2800 ms',extra:'`1.65` tile slam radius (`1.00×` area)'},
   {rank:2,damage:'1.25× (1.63× total)',cooldown:'2576 ms',extra:'`1.95` tile slam radius (`+18%` area)'},
   {rank:3,damage:'1.50× (1.95× total)',cooldown:'2370 ms',extra:'`2.24` tile slam radius (`+36%` area)'},
   {rank:4,damage:'1.75× (2.28× total)',cooldown:'2180 ms',extra:'`2.54` tile slam radius (`+54%` area)'},
   {rank:5,damage:'2.00× (2.60× total)',cooldown:'2006 ms',extra:'`2.84` tile slam radius (`+72%` area)'},
  ],
  layersSummary:'Built on `ember-warden.shockwave` with `polar-shockwave` expanding tectonic magma rings, `8×8` Sub-UV `explosion.png` eruptions, `eroded-scroll` rising magma plumes, volcanic rock shards (`L.debris`), and `ember-lut` 1D LUT-mapped charcoal smoke/soot and magma fissures:',
  cues:[
   {key:'shockwave.telegraph',stage:'Telegraph',plane:'Ground + World',desc:'`460 ms` fracture wind-up: 76-mote inward-contracting molten `L.magicCircle` (`radius 1.65`), polar compression ring (`polar-shockwave`), growing magma `L.cracks` (`ember-lut`), inward `L.vortex`, and LUT-mapped volcanic smoke'},
   {key:'shockwave.detonate',stage:'Detonate',plane:'Ground + World',desc:'360° tectonic magma slam: `8×8` Sub-UV explosion ring (`explosion.png`, `count 28`), Voronoi-eroded magma plumes (`eroded-scroll`, `count 34`), 28 volcanic rock shards (`L.debris`), 24 glowing cinders, LUT-mapped charcoal smoke/soot (`ember-lut`), double `polar-shockwave` rings (`radius 2.68`), and glowing magma fissures'},
  ],
  recipeFile:'vfx/recipes/ember-warden.mjs',
  heroFxFile:'src/fx/heroes/ember-warden.ts',
 },
];

// 2. Rift Runner skill definitions
const riftSkills=[
 {
  heroId:'rift-runner',
  heroName:'Rift Runner',
  skillId:'rift-bolt',
  skillTitle:'Rift Bolt',
  sortOrder:10,
  slotRole:'Slot 1 Signature Skill (equipped at Level 1)',
  badge:'BOLT',
  cooldownMs:1400,
  baseDamageScale:'1.00× per spear (1–3 piercing spears)',
  shapeAndRange:'1 / 2 / 3 high-velocity piercing arcane spears · range `5.2` tiles · speed `7.5` tiles/s · hit radius `0.38` tiles',
  summary:'**Rift Bolt** is the Rift Runner\'s Slot 1 signature ranged skill. A cyan-violet pixel-particle rune circle (`rift-polar-shockwave` + `rift-lut`) spins beneath his boots while an `8×8` (64-frame) Sub-UV singularity flash (`rift-burst.png`) ignites at his crystal forearm emitter, launching 1, 2, or 3 high-velocity arcane spears (`speed 7.5` tiles/s, `range 5.2` tiles) that trail eroded plasma ribbons (`rift-eroded-scroll`), crystalline rift shards, and detonate in 64-frame singularity bursts and 3D Voronoi obsidian fractures (`rift-crack.png`) on impact.',
  extraImages:[
   {alt:'Rift Bolt in the Stronghold by day',url:`${HOST}/docs/nixie-fx/game-rift-runner-rift-bolt-day.webp`},
   {alt:'Rift Bolt in the Stronghold at night',url:`${HOST}/docs/nixie-fx/game-rift-runner-rift-bolt-night.webp`},
  ],
  rankScalingRows:[
   {rank:1,damage:'1.00× per spear',cooldown:'1400 ms',extra:'1 piercing arcane spear (`0` rad center line)'},
   {rank:2,damage:'1.25× per spear',cooldown:'1288 ms',extra:'2 piercing arcane spears (`-0.12`, `+0.12` rad twin volley)'},
   {rank:3,damage:'1.50× per spear',cooldown:'1185 ms',extra:'3 piercing arcane spears (`-0.22`, `0`, `+0.22` rad triad volley)'},
   {rank:4,damage:'1.75× per spear',cooldown:'1090 ms',extra:'3 piercing arcane spears + expanded cast ring (`1.54×`)'},
   {rank:5,damage:'2.00× per spear',cooldown:'1003 ms',extra:'3 piercing arcane spears + maximum arcane reach (`1.72×`)'},
  ],
  layersSummary:'Authored with Diablo-style NixieFX Tier-2 `ShaderGraph` master materials (`rift-eroded-scroll`, `rift-polar-shockwave`, and `rift-lut` 1D color ramp LUT `#140438` → `#3d149e` → `#853df0` → `#6bd6ff` → `#f0faff`), RGBA channel-packed noise (`noise.png`), `8×8` Sub-UV singularity flipbooks (`rift-burst.png`), and 3D Voronoi shattered obsidian craters (`rift-crack.png`):',
  cues:[
   {key:'rift-bolt.cast',stage:'Cast',plane:'Ground + World',desc:'48-mote counter-rotating `L.magicCircle` (`radius 1.12`), polar shockwave glyph (`rift-polar-shockwave`), `8×8` Sub-UV muzzle singularity (`rift-burst.png`), eroded plasma stream (`rift-eroded-scroll`), crystalline `L.shards`, and `L.arcs`'},
   {key:'rift-bolt.bolt',stage:'Projectile / Bolt',plane:'World (local slide)',desc:'Spearhead `L.comet` (`rift-lut`), `8×8` Sub-UV plasma body (`rift-burst.png`, `rate 58`), eroded plasma ribbon wake (`rift-eroded-scroll`, `rate 150`), crackling electric `L.arcs`, and shedding crystalline `L.shards` (`rate 32`)'},
   {key:'rift-bolt.impact',stage:'Impact',plane:'Ground + World',desc:'`8×8` Sub-UV singularity burst (`rift-burst.png`, `count 22`), eroded plasma plumes (`rift-eroded-scroll`), 42 LUT-mapped sparks (`rift-lut`), 14 `L.shards`, 75/s `L.arcs`, 3D Voronoi `rift-crack.png` crater, and polar shockwave ring (`rift-polar-shockwave`)'},
  ],
  recipeFile:'vfx/recipes/rift-runner.mjs',
  heroFxFile:'src/fx/heroes/rift-runner.ts',
 },
 {
  heroId:'rift-runner',
  heroName:'Rift Runner',
  skillId:'rift-dash',
  skillTitle:'Rift Dash',
  sortOrder:20,
  slotRole:'Unlockable Active Skill (Slot 2 / Slot 3 via Blessing)',
  badge:'DASH',
  cooldownMs:1400,
  baseDamageScale:'1.10×',
  shapeAndRange:'Phase-shift warp lunge (`1.5` tiles) + frontal phase-slash cone (`radius 1.35 × reach`, spread `122°` / `0.68π rad`, `260 ms` detonation)',
  summary:'**Rift Dash** propels the Rift Runner through a dimensional slipstream, leaving 3–5 cyan-violet warp afterimages, standing eroded rift plasma ribbons (`rift-eroded-scroll`), `8×8` Sub-UV singularity bursts (`rift-burst.png`), and 3D Voronoi obsidian fractures (`rift-crack.png`) along his path before materializing with a soulercoaster crescent phase-slash (`rift-polar-shockwave`) and crystalline shards.',
  extraImages:[
   {alt:'Rift Dash in the Stronghold by day',url:`${HOST}/docs/nixie-fx/game-rift-runner-rift-dash-day.webp`},
   {alt:'Rift Dash in the Stronghold at night',url:`${HOST}/docs/nixie-fx/game-rift-runner-rift-dash-night.webp`},
  ],
  rankScalingRows:[
   {rank:1,damage:'1.00× (1.10× base)',cooldown:'1400 ms',extra:'3 warp afterimages · `1.35` tile phase-slash cone radius'},
   {rank:2,damage:'1.25× (1.38× total)',cooldown:'1288 ms',extra:'4 warp afterimages · `1.59` tile cone radius (`+18%`)'},
   {rank:3,damage:'1.50× (1.65× total)',cooldown:'1185 ms',extra:'5 warp afterimages · `1.84` tile cone radius (`+36%`)'},
   {rank:4,damage:'1.75× (1.93× total)',cooldown:'1090 ms',extra:'5 warp afterimages · `2.08` tile cone radius (`+54%`)'},
   {rank:5,damage:'2.00× (2.20× total)',cooldown:'1003 ms',extra:'5 warp afterimages · `2.32` tile cone radius (`+72%`)'},
  ],
  layersSummary:'Built on Diablo-style `ShaderGraph` materials (`rift-eroded-scroll` warp slipstream ribbons, `rift-polar-shockwave` soulercoaster crescent sweep, and `rift-lut` 1D arcane ramp) with `8×8` Sub-UV `rift-burst.png` singularities and `rift-crack.png` corridor fractures:',
  cues:[
   {key:'rift-dash.cast',stage:'Cast',plane:'Ground + World',desc:'36-mote warp `L.magicCircle` (`radius 0.78`), 3–5 phase afterimages, eroded slipstream corridor (`rift-eroded-scroll`, `rate 95`), `8×8` Sub-UV singularity trail (`rift-burst.png`), `rift-crack.png` corridor fissures, and ground `L.arcs`'},
   {key:'rift-dash.detonate',stage:'Detonate',plane:'Ground + World',desc:'Phase-slash cone burst at `260 ms`: `8×8` Sub-UV arrival singularity (`rift-burst.png`, `count 22`), soulercoaster crescent sweep (`rift-polar-shockwave`, `count 28`), eroded cone plumes (`rift-eroded-scroll`), 14 `L.shards`, and `rift-crack.png` impact crater'},
  ],
  recipeFile:'vfx/recipes/rift-runner.mjs',
  heroFxFile:'src/fx/heroes/rift-runner.ts',
 },
 {
  heroId:'rift-runner',
  heroName:'Rift Runner',
  skillId:'rift-trap',
  skillTitle:'Rift Trap',
  sortOrder:30,
  slotRole:'Unlockable Active Skill (Slot 2 / Slot 3 via Blessing)',
  badge:'TRAP',
  cooldownMs:2800,
  baseDamageScale:'1.25×',
  shapeAndRange:'Targeted 2:1 isometric ground trap (`base radius 1.45 × reach`, `640 ms` dimensional charge, clamped before walls)',
  summary:'**Rift Trap** projects a 2:1 isometric dimensional rune circle beneath the target pack (clamped before Stronghold walls). Over `640 ms`, an inward-pulling arcane vortex (`rift-eroded-scroll`), polar seal distortion (`rift-polar-shockwave`), and 3D Voronoi obsidian fractures (`rift-crack.png`) charge the seal before imploding into a towering void singularity column (`8×8` Sub-UV `rift-burst.png`), 64 swirling vortex particles, high-voltage lightning arcs, flying rift shards, and double polar shockwave rings.',
  extraImages:[
   {alt:'Rift Trap in the Stronghold by day',url:`${HOST}/docs/nixie-fx/game-rift-runner-rift-trap-day.webp`},
   {alt:'Rift Trap in the Stronghold at night',url:`${HOST}/docs/nixie-fx/game-rift-runner-rift-trap-night.webp`},
  ],
  rankScalingRows:[
   {rank:1,damage:'1.00× (1.25× base)',cooldown:'2800 ms',extra:'`1.45` tile trap radius (`1.00×` area)'},
   {rank:2,damage:'1.25× (1.56× total)',cooldown:'2576 ms',extra:'`1.71` tile trap radius (`+18%` area)'},
   {rank:3,damage:'1.50× (1.88× total)',cooldown:'2370 ms',extra:'`1.97` tile trap radius (`+36%` area)'},
   {rank:4,damage:'1.75× (2.19× total)',cooldown:'2180 ms',extra:'`2.23` tile trap radius (`+54%` area)'},
   {rank:5,damage:'2.00× (2.50× total)',cooldown:'2006 ms',extra:'`2.49` tile trap radius (`+72%` area)'},
  ],
  layersSummary:'Built on `rift-eroded-scroll` vertical singularity columns, `8×8` Sub-UV `rift-burst.png` crown implosions, `rift-polar-shockwave` expanding distortion rings, `rift-lut` 1D LUT coloring, and 3D Voronoi `rift-crack.png` dimensional craters:',
  cues:[
   {key:'rift-trap.telegraph',stage:'Telegraph',plane:'Ground + World',desc:'`640 ms` charge: 76-mote counter-rotating `L.magicCircle` (`radius 1.45`), polar distortion ring (`rift-polar-shockwave`), inward-pulling `L.vortex` (`rift-lut`), simmering eroded rim wisps (`rift-eroded-scroll`), `rift-crack.png` pre-fracture, and 88/s lightning `L.arcs`'},
   {key:'rift-trap.detonate',stage:'Detonate',plane:'Ground + World',desc:'Dimensional implosion: eroded vertical void column (`rift-eroded-scroll`, `count 38`), `8×8` Sub-UV singularity geyser (`rift-burst.png`, `count 28`), 64-particle implosive `L.vortex`, 96/s `L.arcs`, 20 `L.shards`, 3D Voronoi `rift-crack.png` crater, and double `rift-polar-shockwave` rings'},
  ],
  recipeFile:'vfx/recipes/rift-runner.mjs',
  heroFxFile:'src/fx/heroes/rift-runner.ts',
 },
 {
  heroId:'rift-runner',
  heroName:'Rift Runner',
  skillId:'cleave',
  skillTitle:'Astral Cleave',
  sortOrder:40,
  slotRole:'Unlockable Active Skill (Slot 2 / Slot 3 via Blessing — Hero-Upgraded in ASTRAL/RIFT)',
  badge:'ARC',
  cooldownMs:2100,
  baseDamageScale:'1.20×',
  shapeAndRange:'Wide frontal crescent cone (`base radius 1.55 × reach`, cone arc `135°` + `7°` per rank up to `207°`, `320 ms` wind-up)',
  summary:'**Astral Cleave** gives the Rift Runner a wide-angle close-defense dimensional scythe sweep when packs close in inside his AoE ring. Over `320 ms`, starlight glints and double soulercoaster crescent arcs (`rift-polar-shockwave`) wind up across a `135°–207°` frontal cone before unleashing an `8×8` Sub-UV astral singularity burst (`rift-burst.png`), eroded dimensional ribbons (`rift-eroded-scroll`), crystalline shards, and 3D Voronoi obsidian fractures (`rift-crack.png`).',
  extraImages:[
   {alt:'Astral Cleave (Rift Runner) in the Stronghold by day',url:`${HOST}/docs/nixie-fx/game-rift-runner-cleave-day.webp`},
   {alt:'Astral Cleave (Rift Runner) in the Stronghold at night',url:`${HOST}/docs/nixie-fx/game-rift-runner-cleave-night.webp`},
  ],
  rankScalingRows:[
   {rank:1,damage:'1.00× (1.20× base)',cooldown:'2100 ms',extra:'`1.55` tile radius · `135°` (`0.75π rad`) cleave cone'},
   {rank:2,damage:'1.25× (1.50× total)',cooldown:'1932 ms',extra:'`1.83` tile radius (`+18%`) · `149°` (`0.83π rad`) cleave cone'},
   {rank:3,damage:'1.50× (1.80× total)',cooldown:'1777 ms',extra:'`2.11` tile radius (`+36%`) · `162°` (`0.90π rad`) cleave cone'},
   {rank:4,damage:'1.75× (2.10× total)',cooldown:'1635 ms',extra:'`2.39` tile radius (`+54%`) · `176°` (`0.98π rad`) cleave cone'},
   {rank:5,damage:'2.00× (2.40× total)',cooldown:'1504 ms',extra:'`2.67` tile radius (`+72%`) · `190°` (`1.05π rad`) cleave cone'},
  ],
  layersSummary:'Upgraded for Rift Runner (`rift-runner/cleave.cast` & `rift-runner/cleave.detonate`) using `rift-polar-shockwave` soulercoaster crescent sweeps, `rift-eroded-scroll` astral ribbons, `rift-lut` 1D LUT coloring, `8×8` Sub-UV `rift-burst.png` bursts, and 3D Voronoi `rift-crack.png` wedge fractures:',
  cues:[
   {key:'cleave.cast',stage:'Cast',plane:'Ground + World',desc:'`320 ms` wind-up: 9 arc-spread astral glints (`126°` arc, `rift-lut`), eroded wind-up ribbons (`rift-eroded-scroll`), double staggered `L.slashDecal` crescent arcs (`rift-polar-shockwave`), and `rift-crack.png` pre-fissures'},
   {key:'cleave.detonate',stage:'Detonate',plane:'Ground + World',desc:'Dimensional crescent strike at `320 ms`: `8×8` Sub-UV singularity flash (`rift-burst.png`, `count 22`), 32-particle soulercoaster crescent blade (`rift-polar-shockwave`), eroded astral plumes (`rift-eroded-scroll`), 16 `L.shards`, 64/s `L.arcs`, and `rift-crack.png` wedge fissures'},
  ],
  recipeFile:'vfx/recipes/rift-runner.mjs',
  heroFxFile:'src/fx/heroes/rift-runner.ts',
 },
 {
  heroId:'rift-runner',
  heroName:'Rift Runner',
  skillId:'shockwave',
  skillTitle:'Seismic Slam (Rift Shockwave)',
  sortOrder:50,
  slotRole:'Unlockable Active Skill (Slot 2 / Slot 3 via Blessing — Hero-Reskinned in RIFT)',
  badge:'SLAM',
  cooldownMs:2800,
  baseDamageScale:'1.30×',
  shapeAndRange:'360° radial ground slam centered on the hero (`base radius 1.65 × reach`, `460 ms` fracture wind-up)',
  summary:'**Seismic Slam (Rift Shockwave)** re-skins the radial slam in the Rift Runner\'s exclusive dimensional `RIFT` & `ASTRAL` palette (`rift-runner.shockwave`). Over `460 ms`, an inward-contracting cyan-violet pixel magic circle (`rift-polar-shockwave`) and 3D Voronoi obsidian fractures (`rift-crack.png`) gather around his boots before shattering the courtyard with a 360° eruption of `8×8` Sub-UV singularity bursts (`rift-burst.png`), eroded void columns (`rift-eroded-scroll`), obsidian debris chunks, crystalline shards, and double polar shockwave rings.',
  extraImages:[
   {alt:'Seismic Slam (Rift Shockwave) in the Stronghold by day',url:`${HOST}/docs/nixie-fx/game-rift-runner-shockwave-day.webp`},
   {alt:'Seismic Slam (Rift Shockwave) in the Stronghold at night',url:`${HOST}/docs/nixie-fx/game-rift-runner-shockwave-night.webp`},
  ],
  rankScalingRows:[
   {rank:1,damage:'1.00× (1.30× base)',cooldown:'2800 ms',extra:'`1.65` tile slam radius (`1.00×` area)'},
   {rank:2,damage:'1.25× (1.63× total)',cooldown:'2576 ms',extra:'`1.95` tile slam radius (`+18%` area)'},
   {rank:3,damage:'1.50× (1.95× total)',cooldown:'2370 ms',extra:'`2.24` tile slam radius (`+36%` area)'},
   {rank:4,damage:'1.75× (2.28× total)',cooldown:'2180 ms',extra:'`2.54` tile slam radius (`+54%` area)'},
   {rank:5,damage:'2.00× (2.60× total)',cooldown:'2006 ms',extra:'`2.84` tile slam radius (`+72%` area)'},
  ],
  layersSummary:'Built on `rift-runner.shockwave` with 3D Voronoi shattered arcane obsidian craters (`rift-crack.png`), `8×8` Sub-UV singularity eruptions (`rift-burst.png`), `rift-eroded-scroll` rising void plasma rings, `rift-polar-shockwave` expanding shockwaves, and `rift-lut` 1D LUT coloring:',
  cues:[
   {key:'shockwave.telegraph',stage:'Telegraph',plane:'Ground + World',desc:'`460 ms` wind-up: 78-mote inward-contracting `L.magicCircle` (`radius 1.65`), polar compression ring (`rift-polar-shockwave`), growing 3D Voronoi `rift-crack.png` fractures, inward `L.vortex` (`rift-lut`), and eroded void wisps (`rift-eroded-scroll`)'},
   {key:'shockwave.detonate',stage:'Detonate',plane:'Ground + World',desc:'360° cataclysmic rift slam: `8×8` Sub-UV singularity ring (`rift-burst.png`, `count 26`), eroded void plumes (`rift-eroded-scroll`, `count 32`), 28 obsidian `L.debris` chunks, 20 `L.shards`, 82/s `L.arcs`, 3D Voronoi `rift-crack.png` crater (`count 26`), and double `rift-polar-shockwave` rings (`radius 2.68`)'},
  ],
  recipeFile:'vfx/recipes/rift-runner.mjs',
  heroFxFile:'src/fx/heroes/rift-runner.ts',
 },
];

// First ensure the two Skills parent pages exist so we have their IDs
const emberSkillsParentId=ensurePage({
 existingId:EXISTING_EMBER_SKILLS_ID,
 parentId:EMBER_WARDEN_ID,
 title:'Skills',
 slug:'ember-warden-skills',
 sortOrder:4,
 markdown:'Updating Ember Warden Skills overview…',
});

const riftSkillsParentId=ensurePage({
 parentId:RIFT_RUNNER_ID,
 title:'Skills',
 slug:'rift-runner-skills',
 sortOrder:25,
 markdown:'Updating Rift Runner Skills overview…',
});

// Create/update the 5 child pages under Ember Warden > Skills
const emberChildIds={};
for(const s of emberSkills){
 emberChildIds[s.skillId]=ensurePage({
  parentId:emberSkillsParentId,
  title:s.skillTitle,
  slug:`ember-warden-${s.skillId}`,
  sortOrder:s.sortOrder,
  markdown:buildSkillChildMarkdown(s),
 });
}

// Create/update the 5 child pages under Rift Runner > Skills
const riftChildIds={};
for(const s of riftSkills){
 riftChildIds[s.skillId]=ensurePage({
  parentId:riftSkillsParentId,
  title:s.skillTitle,
  slug:`rift-runner-${s.skillId}`,
  sortOrder:s.sortOrder,
  markdown:buildSkillChildMarkdown(s),
 });
}

// Now build the full markdown for Ember Warden > Skills parent page
const emberParentMarkdown=`The Ember Warden commands a five-skill close- and mid-range volcanic fire kit built on [NixieFX](https://nixiefx.com/) Diablo-style Tier-2 \`ShaderGraph\` master materials (\`eroded-scroll\`, \`polar-shockwave\`, and \`ember-lut\`), RGBA channel-packed noise masks (\`noise.png\`), and \`8×8\` (64-frame) Sub-UV explosion flipbooks (\`explosion.png\`), with volumetric blackbody thermal shading and strict Stronghold wall collision and occlusion. At Level 1 she enters battle with **Flame Fan** equipped in Slot 1, and unlocks up to two additional active skills in Slots 2 and 3 via level-up Blessings.

![Ember Warden 5-skill Stronghold daytime composite: Flame Fan, Cinder Step, Ember Snare, Molten Cleave, and Seismic Slam (Molten)](${HOST}/docs/nixie-fx/ember-warden-skills-day-result.webp)

![Ember Warden skills in the FX Lab: Flame Fan, Cinder Step, and Ember Snare](${HOST}/docs/nixie-fx/ember-warden-skills.webp)

## Skill kit & child pages

| Skill | Slot & Role | Base Cooldown | Base Damage | Geometry & Range | Cues |
| --- | --- | --- | --- | --- | --- |
| ${kbLink('**Flame Fan**',emberChildIds['flame-fan'])} | **Slot 1 Signature** (Lv. 1 default) | \`1400 ms\` | \`0.78×\` per bolt (3–5 bolts) | Fan of 3 / 4 / 5 fireballs · range \`4.4\` tiles · cast circle \`2.7\` tiles | \`cast\`, \`bolt\`, \`impact\` |
| ${kbLink('**Cinder Step**',emberChildIds['cinder-step'])} | **Slot 2 / 3 Unlockable** | \`1400 ms\` | \`1.10×\` | \`1.5\`-tile burning lunge + \`122°\` frontal flame cone (\`radius 1.35\`, \`260 ms\`) | \`cast\`, \`detonate\` |
| ${kbLink('**Ember Snare**',emberChildIds['ember-snare'])} | **Slot 2 / 3 Unlockable** | \`2800 ms\` | \`1.25×\` | Targeted 2:1 isometric volcanic seal (\`radius 1.50\`, \`640 ms\` charge → fire geyser) | \`telegraph\`, \`detonate\` |
| ${kbLink('**Molten Cleave**',emberChildIds['cleave'])} | **Slot 2 / 3 Unlockable** (EMBER/MAGMA override) | \`2100 ms\` | \`1.20×\` | Wide frontal volcanic crescent cleave cone (\`radius 1.55\`, \`135°–190°\` arc, \`320 ms\`) | \`cast\`, \`detonate\` |
| ${kbLink('**Seismic Slam (Molten)**',emberChildIds['shockwave'])} | **Slot 2 / 3 Unlockable** (MAGMA reskin) | \`2800 ms\` | \`1.30×\` | 360° radial molten ground slam (\`radius 1.65\`, \`460 ms\` fracture wind-up) | \`telegraph\`, \`detonate\` |

## Interactive Skill Player (All Ember Warden Skills)

<iframe src="${HOST}/skill-player/?hero=ember-warden&skill=flame-fan&dir=SE&controls=simple" title="Ember Warden — Interactive Skill Player" width="100%" height="520" loading="lazy"></iframe>

Use the **Skill** dropdown (**Flame Fan**, **Cinder Step**, **Ember Snare**, **Molten Cleave**, **Seismic Slam**) and the **Cue / Stage Switcher** (**Full Sequence**, **Cast**, **Projectile / Bolt**, **Telegraph**, **Detonate**, **Impact**) along with the **8-Direction Switcher** (**N**–**NW**), **Play / Replay**, **Loop / Once**, and **Night / Day** background toggle to inspect every skill interactively. Both the Skill Player (${repoLink('src/fx/lab.ts','src/fx/lab.ts')}) and the Stronghold runtime (${repoLink('src/stronghold/hero.ts','src/stronghold/hero.ts')}) render the 8-direction **Attack** sprite sheet (${repoLink('assets-src/sprite-player/ember-warden-attack.png','assets-src/sprite-player/ember-warden-attack.png')}, packed into ${repoLink('public/assets/characters/ember-warden.webp','public/assets/characters/ember-warden.webp')} via ${repoLink('scripts/pack-heroes.mjs','scripts/pack-heroes.mjs')}, \`MANIFEST_REV = '1side-v6'\`).

![Ember Warden 8-direction Attack animation in the Skill Player across N, NE, E, SE, S, SW, W, NW](${HOST}/docs/nixie-fx/skill-attack-8dir-ember-warden.webp)

![Ember Warden Attack animation in Stronghold game runtime combat](${HOST}/docs/nixie-fx/game-attack-ember-warden.webp)

## Skill previews

### 1. ${kbLink('Flame Fan',emberChildIds['flame-fan'])} (Slot 1 Signature)

![Ember Warden — Flame Fan Skill Player preview](${HOST}/docs/nixie-fx/skill-ember-warden-flame-fan.webp)

![Ember Warden — Flame Fan in the Stronghold by day](${HOST}/docs/nixie-fx/game-ember-warden-flame-fan-day.webp)

### 2. ${kbLink('Cinder Step',emberChildIds['cinder-step'])}

![Ember Warden — Cinder Step Skill Player preview](${HOST}/docs/nixie-fx/skill-ember-warden-cinder-step.webp)

![Ember Warden — Cinder Step in the Stronghold by day](${HOST}/docs/nixie-fx/game-ember-warden-cinder-step-day.webp)

### 3. ${kbLink('Ember Snare',emberChildIds['ember-snare'])}

![Ember Warden — Ember Snare Skill Player preview](${HOST}/docs/nixie-fx/skill-ember-warden-ember-snare.webp)

![Ember Warden — Ember Snare in the Stronghold by day](${HOST}/docs/nixie-fx/game-ember-warden-ember-snare-day.webp)

### 4. ${kbLink('Molten Cleave',emberChildIds['cleave'])}

![Ember Warden — Molten Cleave Skill Player preview](${HOST}/docs/nixie-fx/skill-ember-warden-cleave.webp)

![Ember Warden — Molten Cleave in the Stronghold by day](${HOST}/docs/nixie-fx/game-ember-warden-cleave-day.webp)

### 5. ${kbLink('Seismic Slam (Molten)',emberChildIds['shockwave'])}

![Ember Warden — Seismic Slam (Molten) Skill Player preview](${HOST}/docs/nixie-fx/skill-ember-warden-shockwave.webp)

![Ember Warden — Seismic Slam (Molten) in the Stronghold by day](${HOST}/docs/nixie-fx/game-ember-warden-shockwave-day.webp)

## Diablo-style ShaderGraph materials, Sub-UV flipbooks & wall collision

Every Ember Warden skill effect is compiled from ${repoLink('vfx/recipes/ember-warden.mjs','vfx/recipes/ember-warden.mjs')} into ${repoLink('public/vfx/skills.bin','public/vfx/skills.bin')} and rendered on two isometric planes (\`groundFx\` and \`worldFx\`) with nearest-neighbor pixel sampling (\`scaleMode: "nearest"\`) and Tier-2 \`ShaderGraph\` materials in ${repoLink('scripts/vfx/lib/nixie.mjs','scripts/vfx/lib/nixie.mjs')} and ${repoLink('src/fx/stage.ts','src/fx/stage.ts')}:

\`\`\`d2
direction: right

textures: Procedural VFX Textures {
  noise: "noise.png (256x256 RGBA)\nR: Perlin FBM\nG: Voronoi Cellular\nB: Polar Streaks\nA: Radial Falloff"
  explosion: "explosion.png (512x512)\n8x8 (64-frame) Sub-UV\nVolcanic Fireball Flipbook"
  flame: "flame.png & cracks.png\nQuantized Pixel-Art\nThermal Sheets & Fissures"
}

materials: NixieFX Tier-2 ShaderGraph Master Materials {
  eroded: "eroded-scroll\nDual UV Panner + Voronoi Noise\n+ Smoothstep Alpha Erosion\n+ 1D Ember LUT"
  polar: "polar-shockwave\nPolarCoordinates + Radial Scroll\n+ Soulercoaster Dissolve\n+ 1D Ember LUT"
  lut: "ember-lut\n1D GradientRamp LUT\n#1a0704 -> #5a0f05 -> #d9380a\n-> #ff9e22 -> #fffdf2"
}

skills: Ember Warden 5-Skill Kit {
  fan: "Flame Fan\nCast + Fireball Wake + Impact"
  step: "Cinder Step\nCinder Trail + Soulercoaster Sweep"
  snare: "Ember Snare\nBasalt Crater + Fire Pillar"
  cleave: "Molten Cleave\nVolcanic Crescent Override"
  slam: "Seismic Slam (Molten)\n360° Tectonic Magma Slam"
}

textures.noise -> materials.eroded
textures.noise -> materials.polar
textures.explosion -> materials.eroded
textures.flame -> materials.lut
materials.eroded -> skills.fan
materials.eroded -> skills.step
materials.eroded -> skills.snare
materials.polar -> skills.cleave
materials.polar -> skills.slam
materials.lut -> skills.fan
materials.lut -> skills.slam
\`\`\`

- **\`eroded-scroll\` (Dual UV Panner + Voronoi Alpha Erosion + 1D Ember LUT)**: Scrolls two opposing UV layers over \`textures/noise.png\` (\`R\` Perlin billow + \`G\` Voronoi cellular mask) combined with procedural Voronoi noise and \`smoothstep\` alpha erosion driven by \`particleRelativeTime\` and \`dynamicParameter.r\`, coloring particles through the \`EMBER_RAMP_STOPS\` 1D LUT (\`#1a0704\` dark charcoal soot → \`#5a0f05\` deep ember → \`#d9380a\` molten crimson → \`#ff9e22\` solar orange → \`#fffdf2\` white-hot core) so edges dissolve into crisp sparks and tendrils rather than blurry uniform fade-outs.
- **\`polar-shockwave\` (Polar Coordinate Soulercoaster & Shockwave Distortion)**: Transforms quad UVs into polar coordinates (\`polarCoordinates\`) and pans radial/angular streaks (\`noise.png\` \`B\`+\`G\`) with lifetime erosion to drive soulercoaster crescent weapon sweeps (**Cinder Step**, **Molten Cleave**, **Attack Swing**), rotating basalt magma seals (**Ember Snare**), and expanding tectonic shockwave rings (**Flame Fan**, **Ember Snare**, **Seismic Slam**).
- **\`8×8\` (64-frame) Sub-UV Explosion Flipbook (\`explosion.png\`) & 1D LUT Contrast (\`ember-lut\`)**: High-density 64-frame Sub-UV sheets (\`tilesX: 8, tilesY: 8\`) provide frame-stepped ignition flash → billowing fireball → cooling soot rings, while the dark charcoal soot edge of \`ember-lut\` ensures high contrast on bright daytime Stronghold snow as well as night courtyards.
- **Strict wall collision & zero wall bleed-through**: Projectiles ray-march against walls (\`traceWallRay\` in ${repoLink('src/stronghold/hero.ts','src/stronghold/hero.ts')} and \`clampTargetToWall\` in ${repoLink('src/stronghold/combat-vfx.ts','src/stronghold/combat-vfx.ts')}) to detonate on wall impact, AoE telegraphs clamp before walls, and per-particle occlusion (\`occlusionAt\`) strictly attenuates particles behind courtyard structures and walls.

![Quantized pixel-art particle textures including RGBA packed noise.png and 8x8 Sub-UV explosion.png](${HOST}/docs/nixie-fx/textures.webp)

![Reference: Ember Warden particle magic circle and fire fan](${HOST}/docs/nixie-fx/reference.webp)

![Skill VFX colliding and stopping cleanly at the Stronghold rampart wall](${HOST}/docs/nixie-fx/occlusion-wall-collision.webp)

## Source & verification

- **Recipes & cues**: ${repoLink('vfx/recipes/ember-warden.mjs','vfx/recipes/ember-warden.mjs')} · ${repoLink('src/fx/heroes/ember-warden.ts','src/fx/heroes/ember-warden.ts')} · ${repoLink('src/stronghold/combat-vfx.ts','src/stronghold/combat-vfx.ts')} · ${repoLink('scripts/vfx/lib/nixie.mjs','scripts/vfx/lib/nixie.mjs')}
- **Automated verification**: ${repoLink('scripts/vfx/verify-skill-player.mjs','scripts/vfx/verify-skill-player.mjs')} · ${repoLink('skill-player-verify.json','docs/nixie-fx/skill-player-verify.json')} · ${repoLink('verify.json','docs/nixie-fx/verify.json')} · ${kbLink('Skill VFX — NixieFX Foundation','NKBD873a8ba8e7a5ea45c3267949')}
`;

ensurePage({
 existingId:emberSkillsParentId,
 parentId:EMBER_WARDEN_ID,
 title:'Skills',
 sortOrder:4,
 markdown:emberParentMarkdown,
});

// Build the full markdown for Rift Runner > Skills parent page
const riftParentMarkdown=`The Rift Runner commands a five-skill ranged arcane and dimensional mobility kit built on [NixieFX](https://nixiefx.com/) Diablo-style Tier-2 \`ShaderGraph\` master materials (\`rift-eroded-scroll\`, \`rift-polar-shockwave\`, and \`rift-lut\`), RGBA channel-packed noise masks (\`noise.png\`), \`8×8\` (64-frame) Sub-UV singularity flipbooks (\`rift-burst.png\`), and 3D Voronoi shattered arcane obsidian craters (\`rift-crack.png\`), with strict Stronghold wall collision and per-particle occlusion. At Level 1 he enters battle with **Rift Bolt** equipped in Slot 1, and unlocks up to two additional active skills in Slots 2 and 3 via level-up Blessings.

![Rift Runner 5-skill Stronghold daytime composite: Rift Bolt, Rift Dash, Rift Trap, Astral Cleave, and Rift Shockwave](${HOST}/docs/nixie-fx/rift-runner-skills-day-result.webp)

![Rift Runner skills in the FX Lab: Rift Bolt, Rift Trap, and Rift Dash](${HOST}/docs/nixie-fx/rift-runner-skills.webp)

## Skill kit & child pages

| Skill | Slot & Role | Base Cooldown | Base Damage | Geometry & Range | Cues |
| --- | --- | --- | --- | --- | --- |
| ${kbLink('**Rift Bolt**',riftChildIds['rift-bolt'])} | **Slot 1 Signature** (Lv. 1 default) | \`1400 ms\` | \`1.00×\` per spear (1–3 spears) | 1 / 2 / 3 piercing arcane spears · range \`5.2\` tiles · speed \`7.5\` tiles/s | \`cast\`, \`bolt\`, \`impact\` |
| ${kbLink('**Rift Dash**',riftChildIds['rift-dash'])} | **Slot 2 / 3 Unlockable** | \`1400 ms\` | \`1.10×\` | \`1.5\`-tile warp lunge (3–5 afterimages) + \`122°\` phase-slash cone (\`radius 1.35\`, \`260 ms\`) | \`cast\`, \`detonate\` |
| ${kbLink('**Rift Trap**',riftChildIds['rift-trap'])} | **Slot 2 / 3 Unlockable** | \`2800 ms\` | \`1.25×\` | Targeted 2:1 isometric dimensional seal (\`radius 1.45\`, \`640 ms\` charge → void implosion) | \`telegraph\`, \`detonate\` |
| ${kbLink('**Astral Cleave**',riftChildIds['cleave'])} | **Slot 2 / 3 Unlockable** (ASTRAL/RIFT upgrade) | \`2100 ms\` | \`1.20×\` | Wide frontal crescent cleave cone (\`radius 1.55\`, \`135°–190°\` arc, \`320 ms\`) | \`cast\`, \`detonate\` |
| ${kbLink('**Seismic Slam (Rift Shockwave)**',riftChildIds['shockwave'])} | **Slot 2 / 3 Unlockable** (RIFT reskin) | \`2800 ms\` | \`1.30×\` | 360° radial dimensional ground slam (\`radius 1.65\`, \`460 ms\` fracture wind-up) | \`telegraph\`, \`detonate\` |

## Interactive Skill Player (All Rift Runner Skills)

<iframe src="${HOST}/skill-player/?hero=rift-runner&skill=rift-bolt&dir=SE&controls=simple" title="Rift Runner — Interactive Skill Player" width="100%" height="520" loading="lazy"></iframe>

Use the **Skill** dropdown (**Rift Bolt**, **Rift Dash**, **Rift Trap**, **Astral Cleave**, **Seismic Slam**) and the **Cue / Stage Switcher** (**Full Sequence**, **Cast**, **Projectile / Bolt**, **Telegraph**, **Detonate**, **Impact**) along with the **8-Direction Switcher** (**N**–**NW**), **Play / Replay**, **Loop / Once**, and **Night / Day** background toggle to inspect every skill interactively. Both the Skill Player (${repoLink('src/fx/lab.ts','src/fx/lab.ts')}) and the Stronghold runtime (${repoLink('src/stronghold/hero.ts','src/stronghold/hero.ts')}) render the 8-direction **Attack** sprite sheet (${repoLink('assets-src/sprite-player/rift-runner-attack.png','assets-src/sprite-player/rift-runner-attack.png')}, packed into ${repoLink('public/assets/characters/rift-runner.webp','public/assets/characters/rift-runner.webp')} via ${repoLink('scripts/pack-heroes.mjs','scripts/pack-heroes.mjs')}, \`MANIFEST_REV = '1side-v6'\`).

![Rift Runner 8-direction Attack animation in the Skill Player across N, NE, E, SE, S, SW, W, NW](${HOST}/docs/nixie-fx/skill-attack-8dir-rift-runner.webp)

![Rift Runner Attack animation in Stronghold game runtime combat](${HOST}/docs/nixie-fx/game-attack-rift-runner.webp)

## Skill previews

### 1. ${kbLink('Rift Bolt',riftChildIds['rift-bolt'])} (Slot 1 Signature)

![Rift Runner — Rift Bolt Skill Player preview](${HOST}/docs/nixie-fx/skill-rift-runner-rift-bolt.webp)

![Rift Runner — Rift Bolt in the Stronghold by day](${HOST}/docs/nixie-fx/game-rift-runner-rift-bolt-day.webp)

### 2. ${kbLink('Rift Dash',riftChildIds['rift-dash'])}

![Rift Runner — Rift Dash Skill Player preview](${HOST}/docs/nixie-fx/skill-rift-runner-rift-dash.webp)

![Rift Runner — Rift Dash in the Stronghold by day](${HOST}/docs/nixie-fx/game-rift-runner-rift-dash-day.webp)

### 3. ${kbLink('Rift Trap',riftChildIds['rift-trap'])}

![Rift Runner — Rift Trap Skill Player preview](${HOST}/docs/nixie-fx/skill-rift-runner-rift-trap.webp)

![Rift Runner — Rift Trap in the Stronghold by day](${HOST}/docs/nixie-fx/game-rift-runner-rift-trap-day.webp)

### 4. ${kbLink('Astral Cleave',riftChildIds['cleave'])}

![Rift Runner — Astral Cleave Skill Player preview](${HOST}/docs/nixie-fx/skill-rift-runner-cleave.webp)

![Rift Runner — Astral Cleave in the Stronghold by day](${HOST}/docs/nixie-fx/game-rift-runner-cleave-day.webp)

### 5. ${kbLink('Seismic Slam (Rift Shockwave)',riftChildIds['shockwave'])}

![Rift Runner — Seismic Slam (Rift Shockwave) Skill Player preview](${HOST}/docs/nixie-fx/skill-rift-runner-shockwave.webp)

![Rift Runner — Seismic Slam (Rift Shockwave) in the Stronghold by day](${HOST}/docs/nixie-fx/game-rift-runner-shockwave-day.webp)

## Diablo-style ShaderGraph materials, Sub-UV flipbooks & wall collision

Every Rift Runner skill effect is compiled from ${repoLink('vfx/recipes/rift-runner.mjs','vfx/recipes/rift-runner.mjs')} into ${repoLink('public/vfx/skills.bin','public/vfx/skills.bin')} and rendered on two isometric planes (\`groundFx\` and \`worldFx\`) with nearest-neighbor pixel sampling (\`scaleMode: "nearest"\`) and Tier-2 \`ShaderGraph\` materials in ${repoLink('scripts/vfx/lib/nixie.mjs','scripts/vfx/lib/nixie.mjs')} and ${repoLink('src/fx/stage.ts','src/fx/stage.ts')}:

\`\`\`d2
direction: right

textures: Procedural VFX Textures {
  noise: "noise.png (256x256 RGBA)\nR: Perlin FBM\nG: Voronoi Cellular\nB: Polar Streaks\nA: Radial Falloff"
  burst: "rift-burst.png (512x512)\n8x8 (64-frame) Sub-UV\nArcane Singularity Flipbook"
  crack: "rift-crack.png (512x512)\n3D Voronoi Obsidian\n& Cyan-Violet Rift Crater"
}

materials: NixieFX Tier-2 ShaderGraph Master Materials {
  eroded: "rift-eroded-scroll\nDual UV Panner + Voronoi Noise\n+ Smoothstep Alpha Erosion\n+ 1D Rift LUT"
  polar: "rift-polar-shockwave\nPolarCoordinates + Radial Scroll\n+ Soulercoaster Dissolve\n+ 1D Rift LUT"
  lut: "rift-lut\n1D GradientRamp LUT\n#140438 -> #3d149e -> #853df0\n-> #6bd6ff -> #f0faff"
}

skills: Rift Runner 5-Skill Kit {
  bolt: "Rift Bolt\nCast + Spear Wake + Impact"
  dash: "Rift Dash\nSlipstream + Phase Cone"
  trap: "Rift Trap\nSeal + Singularity Geyser"
  cleave: "Astral Cleave\nSoulercoaster Crescent"
  slam: "Rift Shockwave\n360° Obsidian Crater Slam"
}

textures.noise -> materials.eroded
textures.noise -> materials.polar
textures.burst -> materials.eroded
textures.crack -> materials.lut
materials.eroded -> skills.bolt
materials.eroded -> skills.dash
materials.eroded -> skills.trap
materials.polar -> skills.cleave
materials.polar -> skills.slam
materials.lut -> skills.bolt
materials.lut -> skills.slam
\`\`\`

- **\`rift-eroded-scroll\` (Dual UV Panner + Voronoi Alpha Erosion + 1D Rift LUT)**: Scrolls two opposing UV layers over \`textures/noise.png\` (\`R\` Perlin billow + \`G\` Voronoi cellular mask) combined with procedural Voronoi noise and \`smoothstep\` alpha erosion driven by \`particleRelativeTime\` and \`dynamicParameter.r\`, coloring particles through the \`RIFT_RAMP_STOPS\` 1D LUT (\`#140438\` deep void abyss → \`#3d149e\` royal indigo → \`#853df0\` electric violet → \`#6bd6ff\` cyan plasma → \`#f0faff\` incandescent core).
- **\`rift-polar-shockwave\` (Polar Coordinate Soulercoaster & Shockwave Distortion)**: Transforms quad UVs into polar coordinates (\`polarCoordinates\`) and pans radial/angular streaks (\`noise.png\` \`B\`+\`G\`) with lifetime erosion to drive soulercoaster crescent weapon sweeps (**Astral Cleave**, **Rift Dash**, **Attack Swing**) and expanding dimensional shockwave rings (**Rift Bolt**, **Rift Trap**, **Rift Shockwave**).
- **\`8×8\` (64-frame) Sub-UV Singularity Flipbook (\`rift-burst.png\`) & 3D Voronoi Obsidian Craters (\`rift-crack.png\`)**: High-speed 64-frame Sub-UV sheets (\`tilesX: 8, tilesY: 8\`) provide crisp frame-stepped plasma singularities, while 3D Voronoi fractured obsidian decals anchor ground impacts with dark dimensional rims so VFX remain high-contrast on bright daylight snow as well as night courtyards.
- **Strict wall collision & silhouette occlusion**: **Rift Bolt** spears ray-march against Stronghold walls (\`traceWallRay\`) to detonate on contact, **Rift Trap** telegraphs clamp before walls (\`clampTargetToWall\`), and particles behind courtyard structures or the hero attenuate cleanly via \`occlusionAt\`.

![Shared cues: Astral Cleave, sword swing, critical hit, particle level-up magic circle, trinity auto-cast](${HOST}/docs/nixie-fx/shared-cues.webp)

## Source & verification

- **Recipes & cues**: ${repoLink('vfx/recipes/rift-runner.mjs','vfx/recipes/rift-runner.mjs')} · ${repoLink('src/fx/heroes/rift-runner.ts','src/fx/heroes/rift-runner.ts')} · ${repoLink('src/stronghold/combat-vfx.ts','src/stronghold/combat-vfx.ts')} · ${repoLink('scripts/vfx/lib/nixie.mjs','scripts/vfx/lib/nixie.mjs')}
- **Automated verification**: ${repoLink('scripts/vfx/verify-skill-player.mjs','scripts/vfx/verify-skill-player.mjs')} · ${repoLink('skill-player-verify.json','docs/nixie-fx/skill-player-verify.json')} · ${repoLink('verify.json','docs/nixie-fx/verify.json')} · ${kbLink('Skill VFX — NixieFX Foundation','NKBD873a8ba8e7a5ea45c3267949')}
`;

ensurePage({
 existingId:riftSkillsParentId,
 parentId:RIFT_RUNNER_ID,
 title:'Skills',
 sortOrder:25,
 markdown:riftParentMarkdown,
});

// Update Ember Warden character root page (NKBDc8ca8c735a55009062b64a64) to link Skills and its 5 child pages
const emberRootMarkdown=`Close-range fire damage and area-control hero in the Stronghold.

## Status

| Area | Status |
| --- | --- |
| Role | Close-range fire · area control |
| Design | Approved v2.2 frontier firekeeper costume and portrait |
| Sprites | 5 pose sheets (${kbLink('Idle','NKBD9c1df4ae8524e49a749059f3')}, ${kbLink('Hurt','NKBD3acc769cfee0487d59def5e6')}, ${kbLink('Death','NKBD3c1f34f5ca7b63f32516d2e9')}, ${kbLink('Run','NKBDf18fa50ee1a4cc98cc5d2106')}, ${kbLink('Attack','NKBD903bcee333c2137d8b04adba')}), 8 directions × 8 frames with embedded 8-direction sprite players |
| Skills | 5 active skills (${kbLink('Flame Fan',emberChildIds['flame-fan'])}, ${kbLink('Cinder Step',emberChildIds['cinder-step'])}, ${kbLink('Ember Snare',emberChildIds['ember-snare'])}, ${kbLink('Molten Cleave',emberChildIds['cleave'])}, ${kbLink('Seismic Slam (Molten)',emberChildIds['shockwave'])}) with NixieFX ShaderGraph particle VFX, Sub-UV flipbooks, and embedded interactive Skill Players |
| In game | Playable in solo and 20 Hz co-op with 3-slot auto-cast loadout |

## Pages

| Page | Contents |
| --- | --- |
| ${kbLink('Design','NKBDacdece78e4763ef6f25531d4')} | Identity, abilities and current concept art |
| ${kbLink('Sprites & Animation','NKBD0b88c526f711c737d46ee93c')} | Standardized 8 × 8 pose sheets (Idle, Hurt, Death, Run, Attack), layout specs and embedded 8-direction sprite players |
| ${kbLink('Skills',emberSkillsParentId)} | Full 5-skill mechanical specifications, child pages (${kbLink('Flame Fan',emberChildIds['flame-fan'])}, ${kbLink('Cinder Step',emberChildIds['cinder-step'])}, ${kbLink('Ember Snare',emberChildIds['ember-snare'])}, ${kbLink('Molten Cleave',emberChildIds['cleave'])}, ${kbLink('Seismic Slam (Molten)',emberChildIds['shockwave'])}), inline VFX previews, and embedded interactive Skill Players |
| ${kbLink('Review & Verification','NKBDbff5fc858791dc9f366906c7')} | Structural, alpha-composite and browser checks across all poses |
| ${kbLink('Concept History','NKBDf028de31637770441386111e')} | Superseded concepts, directional generation archives and work-in-progress art |

## UI asset inventory

${kbLink('Ember Warden — UI Assets','NKBD2bfe297071f7ede84715c644')} contains inline portrait and skill references, selection artwork, export sizes and missing UI assets.
`;

fural(['knowledge','update',EMBER_WARDEN_ID,'--markdown',emberRootMarkdown]);
console.log('Updated Ember Warden root page:',EMBER_WARDEN_ID);

// Update Rift Runner character root page (NKBD8fd35c078bf65d4b103b5d23) to link Skills and its 5 child pages
const riftRootMarkdown=`Ranged scout and the default hero in the game.

## Status

| Area | Status |
| --- | --- |
| Role | Ranged scout · default hero |
| Design | Elegant costume v02 and card portrait; awaiting visual review |
| Sprites | 5 pose sheets (${kbLink('Idle','NKBD5d29155bc5f9d7ba568672e6')}, ${kbLink('Hurt','NKBDd93e7ee52b19d68efa7907c6')}, ${kbLink('Death','NKBDc0435b17089590ebf758c5b0')}, ${kbLink('Run','NKBD7b2d30906c8a963483c32888')}, ${kbLink('Attack','NKBDdb705923ddce75978796abda')}), 8 directions × 8 frames with embedded 8-direction sprite players |
| Skills | 5 active skills (${kbLink('Rift Bolt',riftChildIds['rift-bolt'])}, ${kbLink('Rift Dash',riftChildIds['rift-dash'])}, ${kbLink('Rift Trap',riftChildIds['rift-trap'])}, ${kbLink('Astral Cleave',riftChildIds['cleave'])}, ${kbLink('Seismic Slam',riftChildIds['shockwave'])}) with NixieFX pixel particle VFX and embedded interactive Skill Players |
| In game | Playable in solo and 20 Hz co-op with 3-slot auto-cast loadout |

## Pages

| Page | Contents |
| --- | --- |
| ${kbLink('Design','NKBDe009b0360c3139957ca511d7')} | Identity, abilities and current concept art |
| ${kbLink('Sprites & Animation','NKBD2164ee10da2ed280b17e0dfc')} | Standardized 8 × 8 pose sheets (Idle, Hurt, Death, Run, Attack), layout specs and embedded 8-direction sprite players |
| ${kbLink('Skills',riftSkillsParentId)} | Full 5-skill mechanical specifications, child pages (${kbLink('Rift Bolt',riftChildIds['rift-bolt'])}, ${kbLink('Rift Dash',riftChildIds['rift-dash'])}, ${kbLink('Rift Trap',riftChildIds['rift-trap'])}, ${kbLink('Astral Cleave',riftChildIds['cleave'])}, ${kbLink('Seismic Slam',riftChildIds['shockwave'])}), inline VFX previews, and embedded interactive Skill Players |
| ${kbLink('Review & Verification','NKBD31671830eedb8739975091e7')} | Structural, alpha-composite and browser checks across all poses |
| ${kbLink('Concept History','NKBD78093541bc3eeb78856cb6b7')} | Superseded concepts, directional generation archives and work-in-progress art |

## UI asset inventory

${kbLink('Rift Runner — UI Assets','NKBD7e0a672efef68128bcc1f43b')} contains inline portrait and skill references, selection artwork, export sizes and missing UI assets.
`;

fural(['knowledge','update',RIFT_RUNNER_ID,'--markdown',riftRootMarkdown]);
console.log('Updated Rift Runner root page:',RIFT_RUNNER_ID);

console.log(JSON.stringify({
 emberSkillsParentId,
 emberChildIds,
 riftSkillsParentId,
 riftChildIds,
},null,2));
