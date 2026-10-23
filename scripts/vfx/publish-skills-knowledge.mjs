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
 const previewUrl=`${HOST}/nixie-fx/skill-${heroId}-${skillId}.webp`;

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
  summary:'**Flame Fan** is the Ember Warden\'s Slot 1 signature skill. A `2.7`-tile counter-rotating pixel-particle magic circle ignites beneath her feet while a roaring cone of quantized thermal flames and bouncing sparks pours from her bronze gauntlet, launching a spread of 3, 4, or 5 incandescent fireballs that detonate on impact with revenants or Stronghold rampart walls.',
  extraImages:[
   {alt:'Flame Fan in the Stronghold at night',url:`${HOST}/nixie-fx/game-flame-fan-night.webp`},
   {alt:'Flame Fan fire bolts in flight at night',url:`${HOST}/nixie-fx/game-flame-fan-night-bolts.webp`},
   {alt:'Flame Fan by day',url:`${HOST}/nixie-fx/game-flame-fan-day.webp`},
  ],
  rankScalingRows:[
   {rank:1,damage:'1.00× (0.78× per bolt)',cooldown:'1400 ms',extra:'3 fireballs (`-0.34`, `0`, `+0.34` rad fan spread)'},
   {rank:2,damage:'1.25× (0.98× per bolt)',cooldown:'1288 ms',extra:'4 fireballs (`-0.36`, `-0.12`, `+0.12`, `+0.36` rad fan spread)'},
   {rank:3,damage:'1.50× (1.17× per bolt)',cooldown:'1185 ms',extra:'5 fireballs (`-0.44`, `-0.22`, `0`, `+0.22`, `+0.44` rad fan spread)'},
   {rank:4,damage:'1.75× (1.37× per bolt)',cooldown:'1090 ms',extra:'5 fireballs + wider cast circle scale (`1.54×`)'},
   {rank:5,damage:'2.00× (1.56× per bolt)',cooldown:'1003 ms',extra:'5 fireballs + maximum thermal spread (`1.72×`)'},
  ],
  layersSummary:'Authored in the `EMBER` blackbody thermal palette (`#fffdf4` incandescent white-gold core → `#ff9a2a` golden-orange mid-body → `#d42c0a` dithered crimson-orange wisps) on quantized nearest-neighbor pixel grids (`P.flame` 16-frame flipbook):',
  cues:[
   {key:'flame-fan.cast',stage:'Cast',plane:'Ground + World',desc:'Counter-rotating 68-mote pixel magic circle (`radius 1.35`), rim flames (`rate 56`), hand flash, roaring fire stream (`rate 180`, `28°` spread) + additive core + 99 bouncing ground sparks'},
   {key:'flame-fan.bolt',stage:'Projectile / Bolt',plane:'World (local slide)',desc:'Incandescent fireball head (`L.comet`), tumbling local bolt flames (`rate 72`), additive core, and tapering flame + ember wake (`rate 195`)'},
   {key:'flame-fan.impact',stage:'Impact',plane:'Ground + World',desc:'Burst of 34 flame tongues & wisps, 52 spherical bouncing sparks, 18 embers, expanding pixel `L.shockRing` (`radius 0.8`), and `L.scorch` cluster'},
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
  summary:'**Cinder Step** is the Ember Warden\'s close-quarters mobility and burst skill. She lunges forward in a trail of 3–5 burning afterimages, leaving standing pixel flames and scorched ground along her path before detonating a wide frontal flame cone and crescent slash arc across enemies.',
  rankScalingRows:[
   {rank:1,damage:'1.00× (1.10× base)',cooldown:'1400 ms',extra:'3 burning afterimages · `1.35` tile cone radius'},
   {rank:2,damage:'1.25× (1.38× total)',cooldown:'1288 ms',extra:'4 burning afterimages · `1.59` tile cone radius (`+18%`)'},
   {rank:3,damage:'1.50× (1.65× total)',cooldown:'1185 ms',extra:'5 burning afterimages · `1.84` tile cone radius (`+36%`)'},
   {rank:4,damage:'1.75× (1.93× total)',cooldown:'1090 ms',extra:'5 burning afterimages · `2.08` tile cone radius (`+54%`)'},
   {rank:5,damage:'2.00× (2.20× total)',cooldown:'1003 ms',extra:'5 burning afterimages · `2.32` tile cone radius (`+72%`)'},
  ],
  layersSummary:'Built on `K.dash(\'ember-warden.cinder-step\', EMBER)` with standing path fire emitters (`L.flames` + additive `L.glow` core along a `1.5 × 0.3` tile box) and crackling ground arcs:',
  cues:[
   {key:'cinder-step.cast',stage:'Cast',plane:'Ground + World',desc:'32-mote pixel dash circle (`radius 0.7`), 3–5 thermal afterimages, forward fire stream (`count 24`), standing path fire (`rate 102`), 30 sparks, and scorch trail'},
   {key:'cinder-step.detonate',stage:'Detonate',plane:'Ground + World',desc:'Frontal cone burst at `260 ms`: 44 flame & wisp tongues, 46 bouncing sparks, smoke puffs, and a multi-particle crescent `L.slashDecal` (`radius 1.35`)'},
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
  summary:'**Ember Snare** inscribes a concentric volcanic pixel-particle magic circle beneath the target Revenant (clamped cleanly before any Stronghold wall). Over `640 ms`, counter-rotating flame rings, inward-spiralling core motes, and rim fire gather before erupting into a towering vertical geyser of pixel fire, glowing cinders, double shock rings, and magma fissures.',
  extraImages:[
   {alt:'Ember Snare charging under a Revenant at night',url:`${HOST}/nixie-fx/game-ember-snare-charge.webp`},
   {alt:'Ember Snare erupting into a vertical fire geyser',url:`${HOST}/nixie-fx/game-ember-snare-eruption.webp`},
  ],
  rankScalingRows:[
   {rank:1,damage:'1.00× (1.25× base)',cooldown:'2800 ms',extra:'`1.50` tile eruption radius (`1.00×` area)'},
   {rank:2,damage:'1.25× (1.56× total)',cooldown:'2576 ms',extra:'`1.77` tile eruption radius (`+18%` area)'},
   {rank:3,damage:'1.50× (1.88× total)',cooldown:'2370 ms',extra:'`2.04` tile eruption radius (`+36%` area)'},
   {rank:4,damage:'1.75× (2.19× total)',cooldown:'2180 ms',extra:'`2.31` tile eruption radius (`+54%` area)'},
   {rank:5,damage:'2.00× (2.50× total)',cooldown:'2006 ms',extra:'`2.58` tile eruption radius (`+72%` area)'},
  ],
  layersSummary:'Built on `K.trap(\'ember-warden.ember-snare\', EMBER)` with a multi-tiered vertical fire geyser (`fire column`, `fire column core`, `column crown`, `column crown core`) and magma fissure clusters:',
  cues:[
   {key:'ember-snare.telegraph',stage:'Telegraph',plane:'Ground + World',desc:'`640 ms` charge: 75-mote counter-rotating pixel `L.magicCircle` (`radius 1.5`), inward-pulling `L.vortex` (`rate 70`), simmering rim flames (`rate 88`), and crackling ground arcs'},
   {key:'ember-snare.detonate',stage:'Detonate',plane:'Ground + World',desc:'Vertical fire geyser (`L.pillar` + 53 upward thermal flame sheets), 70 cone sparks, 40 radial skim motes, 14 glowing cinders, double `L.shockRing` (`radius 2.18`), and `L.cracks` magma fissures'},
  ],
  recipeFile:'vfx/recipes/ember-warden.mjs',
  heroFxFile:'src/fx/heroes/ember-warden.ts',
 },
 {
  heroId:'ember-warden',
  heroName:'Ember Warden',
  skillId:'cleave',
  skillTitle:'Astral Cleave',
  sortOrder:40,
  slotRole:'Shared Unlockable Active Skill (Slot 2 / Slot 3 via Blessing)',
  badge:'ARC',
  cooldownMs:2100,
  baseDamageScale:'1.20×',
  shapeAndRange:'Wide frontal crescent cone (`base radius 1.55 × reach`, cone arc `135°` + `7°` per rank up to `207°`, `320 ms` wind-up)',
  summary:'**Astral Cleave** is a sweeping wide-angle crescent cleave shared across heroes. Starlight glints and double crescent particle slash arcs wind up across a `120°–207°` frontal cone before unleashing a high-velocity astral shockwave, crystalline shards, and stardust sparks that clear wide packs of revenants.',
  rankScalingRows:[
   {rank:1,damage:'1.00× (1.20× base)',cooldown:'2100 ms',extra:'`1.55` tile radius · `135°` (`0.75π rad`) cleave cone'},
   {rank:2,damage:'1.25× (1.50× total)',cooldown:'1932 ms',extra:'`1.83` tile radius (`+18%`) · `149°` (`0.83π rad`) cleave cone'},
   {rank:3,damage:'1.50× (1.80× total)',cooldown:'1777 ms',extra:'`2.11` tile radius (`+36%`) · `162°` (`0.90π rad`) cleave cone'},
   {rank:4,damage:'1.75× (2.10× total)',cooldown:'1635 ms',extra:'`2.39` tile radius (`+54%`) · `176°` (`0.98π rad`) cleave cone'},
   {rank:5,damage:'2.00× (2.40× total)',cooldown:'1504 ms',extra:'`2.67` tile radius (`+72%`) · `190°` (`1.05π rad`) cleave cone'},
  ],
  layersSummary:'Authored in the `ASTRAL` starlight palette (`#ffffff` core → `#a8cbff` celestial blue → `#6a7dff` deep indigo) via `K.cleave(\'shared.cleave\', ASTRAL)` inherited by the Ember Warden profile:',
  cues:[
   {key:'cleave.cast',stage:'Cast',plane:'Ground + World',desc:'`320 ms` wind-up: 7 arc-spread astral glints (`120°` arc), 28 directional sparks, and double staggered `L.slashDecal` crescent particle arcs'},
   {key:'cleave.detonate',stage:'Detonate',plane:'Ground + World',desc:'Crescent strike at `320 ms`: astral flash (`size 1.8`), 46 high-velocity cone sparks, 10 crystalline shards, heavy `L.slashDecal` (`radius 1.63`), and forward `L.shockRing`'},
  ],
  recipeFile:'vfx/recipes/shared.mjs',
  heroFxFile:'src/fx/heroes/shared.ts',
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
  summary:'**Seismic Slam (Molten)** re-skins the shared radial slam in the Ember Warden\'s exclusive `MAGMA` palette (`ember-warden.shockwave`). While she winds up for `460 ms`, an inward-pulling molten pixel magic circle and glowing magma fractures gather around her feet, then detonate in a 360° eruption of incandescent lava cinders, rising magma flames, flying volcanic rock debris, and double shockwave rings.',
  rankScalingRows:[
   {rank:1,damage:'1.00× (1.30× base)',cooldown:'2800 ms',extra:'`1.65` tile slam radius (`1.00×` area)'},
   {rank:2,damage:'1.25× (1.63× total)',cooldown:'2576 ms',extra:'`1.95` tile slam radius (`+18%` area)'},
   {rank:3,damage:'1.50× (1.95× total)',cooldown:'2370 ms',extra:'`2.24` tile slam radius (`+36%` area)'},
   {rank:4,damage:'1.75× (2.28× total)',cooldown:'2180 ms',extra:'`2.54` tile slam radius (`+54%` area)'},
   {rank:5,damage:'2.00× (2.60× total)',cooldown:'2006 ms',extra:'`2.84` tile slam radius (`+72%` area)'},
  ],
  layersSummary:'Built on `K.slam(\'ember-warden.shockwave\', MAGMA, { molten: true })`, adding incandescent `L.cinders`, ring-shaped `L.flames` + additive `L.glow` magma core, and glowing additive ground fissures (`L.glow(L.cracks(...))`):',
  cues:[
   {key:'shockwave.telegraph',stage:'Telegraph',plane:'Ground + World',desc:'`460 ms` fracture wind-up: 73-mote inward-contracting molten `L.magicCircle` (`radius 1.65`), growing magma `L.cracks`, inward `L.vortex`, and volcanic smoke'},
   {key:'shockwave.detonate',stage:'Detonate',plane:'Ground + World',desc:'360° molten burst: 26 volcanic rock debris chunks, 20 glowing cinders, 24 rising magma flames, 48 radial skim sparks, dust ring, double `L.shockRing` (`radius 2.64`), and glowing magma fissures'},
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
  summary:'**Rift Bolt** is the Rift Runner\'s Slot 1 signature ranged skill. A cyan-violet pixel-particle rune circle spins beneath his boots as his crystal forearm emitter fires 1, 2, or 3 high-velocity arcane spears (`speed 7.5` tiles/s, `range 5.2` tiles) that trail crystalline rift shards and detonate in crackling electric arcs and shock rings on impact.',
  rankScalingRows:[
   {rank:1,damage:'1.00× per spear',cooldown:'1400 ms',extra:'1 piercing arcane spear (`0` rad center line)'},
   {rank:2,damage:'1.25× per spear',cooldown:'1288 ms',extra:'2 piercing arcane spears (`-0.12`, `+0.12` rad twin volley)'},
   {rank:3,damage:'1.50× per spear',cooldown:'1185 ms',extra:'3 piercing arcane spears (`-0.22`, `0`, `+0.22` rad triad volley)'},
   {rank:4,damage:'1.75× per spear',cooldown:'1090 ms',extra:'3 piercing arcane spears + expanded cast ring (`1.54×`)'},
   {rank:5,damage:'2.00× per spear',cooldown:'1003 ms',extra:'3 piercing arcane spears + maximum arcane reach (`1.72×`)'},
  ],
  layersSummary:'Authored in the `RIFT` arcane-void palette (`#ffffff` core → `#8fe6ff` cyan plasma → `#8b62ff` violet rift → `#4a1bb8` deep void) via `K.projectile(\'rift-runner.rift-bolt\', RIFT)` with extra crystalline `L.shards` and `L.arcs`:',
  cues:[
   {key:'rift-bolt.cast',stage:'Cast',plane:'Ground + World',desc:'44-mote spinning pixel `L.magicCircle` (`radius 1.05`), forearm crystal flash (`intensity 5`), 34 directional cyan-violet sparks, glints, and rift motes'},
   {key:'rift-bolt.bolt',stage:'Projectile / Bolt',plane:'World (local slide)',desc:'Spearhead `L.comet` (`size 0.4`), high-intensity plasma `L.core`, trailing particle `L.wake`, and shedding crystalline `L.shards` (`rate 24`)'},
   {key:'rift-bolt.impact',stage:'Impact',plane:'Ground + World',desc:'Arcane detonation: flash (`size 1.4`), 34 spherical sparks, 10 flying rift `L.shards`, crackling electric `L.arcs` (`rate 60`), and ground `L.shockRing` (`radius 0.75`)'},
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
  summary:'**Rift Dash** propels the Rift Runner through a dimensional slipstream, leaving 3–5 cyan-violet warp afterimages and a stream of pixel rift motes before materializing with a phase-slash cone burst and crystalline shards.',
  rankScalingRows:[
   {rank:1,damage:'1.00× (1.10× base)',cooldown:'1400 ms',extra:'3 warp afterimages · `1.35` tile phase-slash cone radius'},
   {rank:2,damage:'1.25× (1.38× total)',cooldown:'1288 ms',extra:'4 warp afterimages · `1.59` tile cone radius (`+18%`)'},
   {rank:3,damage:'1.50× (1.65× total)',cooldown:'1185 ms',extra:'5 warp afterimages · `1.84` tile cone radius (`+36%`)'},
   {rank:4,damage:'1.75× (1.93× total)',cooldown:'1090 ms',extra:'5 warp afterimages · `2.08` tile cone radius (`+54%`)'},
   {rank:5,damage:'2.00× (2.20× total)',cooldown:'1003 ms',extra:'5 warp afterimages · `2.32` tile cone radius (`+72%`)'},
  ],
  layersSummary:'Built on `K.dash(\'rift-runner.rift-dash\', RIFT, { flame: false })`, replacing thermal flames with high-velocity `rift pixel stream`, `rift pixel motes`, and dimensional `L.shards`:',
  cues:[
   {key:'rift-dash.cast',stage:'Cast',plane:'Ground + World',desc:'32-mote spinning warp `L.magicCircle` (`radius 0.7`), 3–5 phase afterimages, `rift pixel stream` (`count 18`), 28 cone motes, 30 sparks, and void trail'},
   {key:'rift-dash.detonate',stage:'Detonate',plane:'Ground + World',desc:'Phase-slash cone burst at `260 ms`: arcane flash (`size 1.6`), 10 crystalline `L.shards`, 46 directional sparks, and crescent `L.slashDecal` (`radius 1.35`)'},
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
  summary:'**Rift Trap** projects a 2:1 isometric dimensional rune circle beneath the target pack (clamped before Stronghold walls). Over `640 ms`, an inward-pulling arcane vortex and electric rim arcs charge the seal before imploding into a void pillar, 60 swirling vortex particles, high-voltage lightning arcs, flying rift shards, and double shockwave rings.',
  rankScalingRows:[
   {rank:1,damage:'1.00× (1.25× base)',cooldown:'2800 ms',extra:'`1.45` tile trap radius (`1.00×` area)'},
   {rank:2,damage:'1.25× (1.56× total)',cooldown:'2576 ms',extra:'`1.71` tile trap radius (`+18%` area)'},
   {rank:3,damage:'1.50× (1.88× total)',cooldown:'2370 ms',extra:'`1.97` tile trap radius (`+36%` area)'},
   {rank:4,damage:'1.75× (2.19× total)',cooldown:'2180 ms',extra:'`2.23` tile trap radius (`+54%` area)'},
   {rank:5,damage:'2.00× (2.50× total)',cooldown:'2006 ms',extra:'`2.49` tile trap radius (`+72%` area)'},
  ],
  layersSummary:'Built on `K.trap(\'rift-runner.rift-trap\', RIFT, { radius: 1.45, charge: 0.64, rimFlames: false, flames: false, rock: false })` with an implosive 60-mote detonation `L.vortex`, `L.arcs`, and 16 crystalline `L.shards`:',
  cues:[
   {key:'rift-trap.telegraph',stage:'Telegraph',plane:'Ground + World',desc:'`640 ms` charge: 73-mote counter-rotating `L.magicCircle` (`radius 1.45`), inward-pulling `L.vortex` (`pull -1.6`), and 80/s ground + rim lightning `L.arcs`'},
   {key:'rift-trap.detonate',stage:'Detonate',plane:'Ground + World',desc:'Dimensional implosion: arcane `L.pillar` + additive core, 60-particle implosive `L.vortex` (`swirl 6, pull -6`), 90/s electric `L.arcs`, 16 `L.shards`, 70 sparks, double `L.shockRing`, and void `L.cracks`'},
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
  slotRole:'Shared Unlockable Active Skill (Slot 2 / Slot 3 via Blessing)',
  badge:'ARC',
  cooldownMs:2100,
  baseDamageScale:'1.20×',
  shapeAndRange:'Wide frontal crescent cone (`base radius 1.55 × reach`, cone arc `135°` + `7°` per rank up to `207°`, `320 ms` wind-up)',
  summary:'**Astral Cleave** gives the Rift Runner a wide-angle close-defense sweep when packs close in inside his AoE ring. Starlight glints and double crescent particle arcs wind up across a `120°–207°` frontal cone before unleashing an astral slash burst, crystalline shards, and a forward shock ring.',
  rankScalingRows:[
   {rank:1,damage:'1.00× (1.20× base)',cooldown:'2100 ms',extra:'`1.55` tile radius · `135°` (`0.75π rad`) cleave cone'},
   {rank:2,damage:'1.25× (1.50× total)',cooldown:'1932 ms',extra:'`1.83` tile radius (`+18%`) · `149°` (`0.83π rad`) cleave cone'},
   {rank:3,damage:'1.50× (1.80× total)',cooldown:'1777 ms',extra:'`2.11` tile radius (`+36%`) · `162°` (`0.90π rad`) cleave cone'},
   {rank:4,damage:'1.75× (2.10× total)',cooldown:'1635 ms',extra:'`2.39` tile radius (`+54%`) · `176°` (`0.98π rad`) cleave cone'},
   {rank:5,damage:'2.00× (2.40× total)',cooldown:'1504 ms',extra:'`2.67` tile radius (`+72%`) · `190°` (`1.05π rad`) cleave cone'},
  ],
  layersSummary:'Authored in the `ASTRAL` starlight palette (`#ffffff` core → `#a8cbff` celestial blue → `#6a7dff` deep indigo) via `K.cleave(\'shared.cleave\', ASTRAL)` inherited by the Rift Runner profile:',
  cues:[
   {key:'cleave.cast',stage:'Cast',plane:'Ground + World',desc:'`320 ms` wind-up: 7 arc-spread astral glints (`120°` arc), 28 directional sparks, and double staggered `L.slashDecal` crescent particle arcs'},
   {key:'cleave.detonate',stage:'Detonate',plane:'Ground + World',desc:'Crescent strike at `320 ms`: astral flash (`size 1.8`), 46 high-velocity cone sparks, 10 crystalline shards, heavy `L.slashDecal` (`radius 1.63`), and forward `L.shockRing`'},
  ],
  recipeFile:'vfx/recipes/shared.mjs',
  heroFxFile:'src/fx/heroes/shared.ts',
 },
 {
  heroId:'rift-runner',
  heroName:'Rift Runner',
  skillId:'shockwave',
  skillTitle:'Seismic Slam',
  sortOrder:50,
  slotRole:'Shared Unlockable Active Skill (Slot 2 / Slot 3 via Blessing)',
  badge:'SLAM',
  cooldownMs:2800,
  baseDamageScale:'1.30×',
  shapeAndRange:'360° radial ground slam centered on the hero (`base radius 1.65 × reach`, `460 ms` fracture wind-up)',
  summary:'**Seismic Slam** is the Rift Runner\'s 360° radial crowd-clear slam in the amber-earth `SEISMIC` palette (`shared.shockwave`). Over `460 ms`, an inward-contracting golden-amber pixel magic circle and radial ground fractures gather around his boots before shattering the courtyard with flying rock debris, dust rings, radial skim sparks, and double expanding shockwave rings.',
  rankScalingRows:[
   {rank:1,damage:'1.00× (1.30× base)',cooldown:'2800 ms',extra:'`1.65` tile slam radius (`1.00×` area)'},
   {rank:2,damage:'1.25× (1.63× total)',cooldown:'2576 ms',extra:'`1.95` tile slam radius (`+18%` area)'},
   {rank:3,damage:'1.50× (1.95× total)',cooldown:'2370 ms',extra:'`2.24` tile slam radius (`+36%` area)'},
   {rank:4,damage:'1.75× (2.28× total)',cooldown:'2180 ms',extra:'`2.54` tile slam radius (`+54%` area)'},
   {rank:5,damage:'2.00× (2.60× total)',cooldown:'2006 ms',extra:'`2.84` tile slam radius (`+72%` area)'},
  ],
  layersSummary:'Authored in the `SEISMIC` amber-earth palette (`#fffaf0` core → `#ffd06a` amber gold → `#7a4a16` earth umber) via `K.slam(\'shared.shockwave\', SEISMIC)`:',
  cues:[
   {key:'shockwave.telegraph',stage:'Telegraph',plane:'Ground + World',desc:'`460 ms` wind-up: 73-mote inward-contracting `L.magicCircle` (`radius 1.65`), growing radial `L.cracks`, inward `L.vortex` (`rate 50`), and rising dust'},
   {key:'shockwave.detonate',stage:'Detonate',plane:'Ground + World',desc:'360° tectonic burst: 26 flying rock `L.debris` chunks, 48 radial skim sparks, 12-particle expanding dust ring, double `L.shockRing` (`radius 2.64`), and fault `L.cracks`'},
  ],
  recipeFile:'vfx/recipes/shared.mjs',
  heroFxFile:'src/fx/heroes/shared.ts',
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
const emberParentMarkdown=`The Ember Warden commands a five-skill close- and mid-range fire kit built on [NixieFX](https://nixiefx.com/) Diablo-like pixel particle assemblies with volumetric blackbody thermal shading and strict Stronghold wall collision and occlusion. At Level 1 she enters battle with **Flame Fan** equipped in Slot 1, and unlocks up to two additional active skills in Slots 2 and 3 via level-up Blessings.

![Ember Warden skills in the FX Lab: Flame Fan, Cinder Step, and Ember Snare](${HOST}/nixie-fx/ember-warden-skills.webp)

## Skill kit & child pages

| Skill | Slot & Role | Base Cooldown | Base Damage | Geometry & Range | Cues |
| --- | --- | --- | --- | --- | --- |
| ${kbLink('**Flame Fan**',emberChildIds['flame-fan'])} | **Slot 1 Signature** (Lv. 1 default) | \`1400 ms\` | \`0.78×\` per bolt (3–5 bolts) | Fan of 3 / 4 / 5 fireballs · range \`4.4\` tiles · cast circle \`2.7\` tiles | \`cast\`, \`bolt\`, \`impact\` |
| ${kbLink('**Cinder Step**',emberChildIds['cinder-step'])} | **Slot 2 / 3 Unlockable** | \`1400 ms\` | \`1.10×\` | \`1.5\`-tile burning lunge + \`122°\` frontal flame cone (\`radius 1.35\`, \`260 ms\`) | \`cast\`, \`detonate\` |
| ${kbLink('**Ember Snare**',emberChildIds['ember-snare'])} | **Slot 2 / 3 Unlockable** | \`2800 ms\` | \`1.25×\` | Targeted 2:1 isometric volcanic seal (\`radius 1.50\`, \`640 ms\` charge → fire geyser) | \`telegraph\`, \`detonate\` |
| ${kbLink('**Astral Cleave**',emberChildIds['cleave'])} | **Slot 2 / 3 Unlockable** (Shared) | \`2100 ms\` | \`1.20×\` | Wide frontal crescent cleave cone (\`radius 1.55\`, \`135°–190°\` arc, \`320 ms\`) | \`cast\`, \`detonate\` |
| ${kbLink('**Seismic Slam (Molten)**',emberChildIds['shockwave'])} | **Slot 2 / 3 Unlockable** (MAGMA reskin) | \`2800 ms\` | \`1.30×\` | 360° radial molten ground slam (\`radius 1.65\`, \`460 ms\` fracture wind-up) | \`telegraph\`, \`detonate\` |

## Interactive Skill Player (All Ember Warden Skills)

<iframe src="${HOST}/skill-player/?hero=ember-warden&skill=flame-fan&dir=SE&controls=simple" title="Ember Warden — Interactive Skill Player" width="100%" height="520" loading="lazy"></iframe>

Use the **Skill** dropdown (**Flame Fan**, **Cinder Step**, **Ember Snare**, **Astral Cleave**, **Seismic Slam**) and the **Cue / Stage Switcher** (**Full Sequence**, **Cast**, **Projectile / Bolt**, **Telegraph**, **Detonate**, **Impact**) along with the **8-Direction Switcher** (**N**–**NW**), **Play / Replay**, **Loop / Once**, and **Night / Day** background toggle to inspect every skill interactively. Both the Skill Player (${repoLink('src/fx/lab.ts','src/fx/lab.ts')}) and the Stronghold runtime (${repoLink('src/stronghold/hero.ts','src/stronghold/hero.ts')}) render the 8-direction **Attack** sprite sheet (${repoLink('assets-src/sprite-player/ember-warden-attack.png','assets-src/sprite-player/ember-warden-attack.png')}, packed into ${repoLink('public/assets/characters/ember-warden.webp','public/assets/characters/ember-warden.webp')} via ${repoLink('scripts/pack-heroes.mjs','scripts/pack-heroes.mjs')}, \`MANIFEST_REV = '1side-v6'\`).

![Ember Warden 8-direction Attack animation in the Skill Player across N, NE, E, SE, S, SW, W, NW](${HOST}/nixie-fx/skill-attack-8dir-ember-warden.webp)

![Ember Warden Attack animation in Stronghold game runtime combat](${HOST}/nixie-fx/game-attack-ember-warden.webp)

## Skill previews

### 1. ${kbLink('Flame Fan',emberChildIds['flame-fan'])} (Slot 1 Signature)

![Ember Warden — Flame Fan Skill Player preview](${HOST}/nixie-fx/skill-ember-warden-flame-fan.webp)

### 2. ${kbLink('Cinder Step',emberChildIds['cinder-step'])}

![Ember Warden — Cinder Step Skill Player preview](${HOST}/nixie-fx/skill-ember-warden-cinder-step.webp)

### 3. ${kbLink('Ember Snare',emberChildIds['ember-snare'])}

![Ember Warden — Ember Snare Skill Player preview](${HOST}/nixie-fx/skill-ember-warden-ember-snare.webp)

### 4. ${kbLink('Astral Cleave',emberChildIds['cleave'])}

![Ember Warden — Astral Cleave Skill Player preview](${HOST}/nixie-fx/skill-ember-warden-cleave.webp)

### 5. ${kbLink('Seismic Slam (Molten)',emberChildIds['shockwave'])}

![Ember Warden — Seismic Slam (Molten) Skill Player preview](${HOST}/nixie-fx/skill-ember-warden-shockwave.webp)

## Diablo-like pixel particle assemblies & wall collision

All Ember Warden skill textures in ${repoLink('scripts/vfx/texture-painters.js','scripts/vfx/texture-painters.js')} are painted onto quantized pixel grids (\`24×24\` to \`56×56\` per cell) with stepped luminance/alpha bands, 2×2 Bayer dithering, and \`scaleMode: "nearest"\` in ${repoLink('src/fx/stage.ts','src/fx/stage.ts')}:

- **Multi-lobed pixel-art thermal flame flipbook (\`P.flame\`)**: 16 frames (\`512×512\`, \`4×4\` cells) of billowing S-curved flame sheets with internal blackbody shading (white-gold core spine → golden-orange mid-body → dithered crimson-orange outer wisps).
- **Multi-particle ground & world assemblies**: Magic circles (\`L.magicCircle\`), slash arcs (\`L.slashDecal\`), shockwaves (\`L.shockRing\`), magma fissures (\`L.cracks\`), scorch clusters (\`L.scorch\`), and vortices (\`L.vortex\`) in ${repoLink('scripts/vfx/lib/layers.mjs','scripts/vfx/lib/layers.mjs')} are built from dozens of discrete pixel particles rather than flat vector decals or continuous ribbon lines.
- **Strict wall collision & zero wall bleed-through**: Projectiles ray-march against walls (\`traceWallRay\` in ${repoLink('src/stronghold/hero.ts','src/stronghold/hero.ts')} and \`clampTargetToWall\` in ${repoLink('src/stronghold/combat-vfx.ts','src/stronghold/combat-vfx.ts')}) to detonate on wall impact, AoE telegraphs clamp before walls, and per-particle occlusion (\`occlusionAt\`) strictly zeroes (\`0\`) any particle entering a rampart wall footprint.

![Reference: Ember Warden particle magic circle and fire fan](${HOST}/nixie-fx/reference.webp)

![Skill VFX colliding and stopping cleanly at the Stronghold rampart wall](${HOST}/nixie-fx/occlusion-wall-collision.webp)

## Source & verification

- **Recipes & cues**: ${repoLink('vfx/recipes/ember-warden.mjs','vfx/recipes/ember-warden.mjs')} · ${repoLink('src/fx/heroes/ember-warden.ts','src/fx/heroes/ember-warden.ts')} · ${repoLink('src/stronghold/combat-vfx.ts','src/stronghold/combat-vfx.ts')}
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
const riftParentMarkdown=`The Rift Runner commands a five-skill ranged arcane and dimensional mobility kit built on [NixieFX](https://nixiefx.com/) Diablo-like pixel particle assemblies in the cyan-violet \`RIFT\`, \`ASTRAL\`, and \`SEISMIC\` palettes, with strict Stronghold wall collision and per-particle occlusion. At Level 1 he enters battle with **Rift Bolt** equipped in Slot 1, and unlocks up to two additional active skills in Slots 2 and 3 via level-up Blessings.

![Rift Runner skills in the FX Lab: Rift Bolt, Rift Trap, and Rift Dash](${HOST}/nixie-fx/rift-runner-skills.webp)

## Skill kit & child pages

| Skill | Slot & Role | Base Cooldown | Base Damage | Geometry & Range | Cues |
| --- | --- | --- | --- | --- | --- |
| ${kbLink('**Rift Bolt**',riftChildIds['rift-bolt'])} | **Slot 1 Signature** (Lv. 1 default) | \`1400 ms\` | \`1.00×\` per spear (1–3 spears) | 1 / 2 / 3 piercing arcane spears · range \`5.2\` tiles · speed \`7.5\` tiles/s | \`cast\`, \`bolt\`, \`impact\` |
| ${kbLink('**Rift Dash**',riftChildIds['rift-dash'])} | **Slot 2 / 3 Unlockable** | \`1400 ms\` | \`1.10×\` | \`1.5\`-tile warp lunge (3–5 afterimages) + \`122°\` phase-slash cone (\`radius 1.35\`, \`260 ms\`) | \`cast\`, \`detonate\` |
| ${kbLink('**Rift Trap**',riftChildIds['rift-trap'])} | **Slot 2 / 3 Unlockable** | \`2800 ms\` | \`1.25×\` | Targeted 2:1 isometric dimensional seal (\`radius 1.45\`, \`640 ms\` charge → void implosion) | \`telegraph\`, \`detonate\` |
| ${kbLink('**Astral Cleave**',riftChildIds['cleave'])} | **Slot 2 / 3 Unlockable** (Shared) | \`2100 ms\` | \`1.20×\` | Wide frontal crescent cleave cone (\`radius 1.55\`, \`135°–190°\` arc, \`320 ms\`) | \`cast\`, \`detonate\` |
| ${kbLink('**Seismic Slam**',riftChildIds['shockwave'])} | **Slot 2 / 3 Unlockable** (Shared) | \`2800 ms\` | \`1.30×\` | 360° radial tectonic ground slam (\`radius 1.65\`, \`460 ms\` fracture wind-up) | \`telegraph\`, \`detonate\` |

## Interactive Skill Player (All Rift Runner Skills)

<iframe src="${HOST}/skill-player/?hero=rift-runner&skill=rift-bolt&dir=SE&controls=simple" title="Rift Runner — Interactive Skill Player" width="100%" height="520" loading="lazy"></iframe>

Use the **Skill** dropdown (**Rift Bolt**, **Rift Dash**, **Rift Trap**, **Astral Cleave**, **Seismic Slam**) and the **Cue / Stage Switcher** (**Full Sequence**, **Cast**, **Projectile / Bolt**, **Telegraph**, **Detonate**, **Impact**) along with the **8-Direction Switcher** (**N**–**NW**), **Play / Replay**, **Loop / Once**, and **Night / Day** background toggle to inspect every skill interactively. Both the Skill Player (${repoLink('src/fx/lab.ts','src/fx/lab.ts')}) and the Stronghold runtime (${repoLink('src/stronghold/hero.ts','src/stronghold/hero.ts')}) render the 8-direction **Attack** sprite sheet (${repoLink('assets-src/sprite-player/rift-runner-attack.png','assets-src/sprite-player/rift-runner-attack.png')}, packed into ${repoLink('public/assets/characters/rift-runner.webp','public/assets/characters/rift-runner.webp')} via ${repoLink('scripts/pack-heroes.mjs','scripts/pack-heroes.mjs')}, \`MANIFEST_REV = '1side-v6'\`).

![Rift Runner 8-direction Attack animation in the Skill Player across N, NE, E, SE, S, SW, W, NW](${HOST}/nixie-fx/skill-attack-8dir-rift-runner.webp)

![Rift Runner Attack animation in Stronghold game runtime combat](${HOST}/nixie-fx/game-attack-rift-runner.webp)

## Skill previews

### 1. ${kbLink('Rift Bolt',riftChildIds['rift-bolt'])} (Slot 1 Signature)

![Rift Runner — Rift Bolt Skill Player preview](${HOST}/nixie-fx/skill-rift-runner-rift-bolt.webp)

### 2. ${kbLink('Rift Dash',riftChildIds['rift-dash'])}

![Rift Runner — Rift Dash Skill Player preview](${HOST}/nixie-fx/skill-rift-runner-rift-dash.webp)

### 3. ${kbLink('Rift Trap',riftChildIds['rift-trap'])}

![Rift Runner — Rift Trap Skill Player preview](${HOST}/nixie-fx/skill-rift-runner-rift-trap.webp)

### 4. ${kbLink('Astral Cleave',riftChildIds['cleave'])}

![Rift Runner — Astral Cleave Skill Player preview](${HOST}/nixie-fx/skill-rift-runner-cleave.webp)

### 5. ${kbLink('Seismic Slam',riftChildIds['shockwave'])}

![Rift Runner — Seismic Slam Skill Player preview](${HOST}/nixie-fx/skill-rift-runner-shockwave.webp)

## Arcane pixel particle assemblies & wall collision

Every Rift Runner skill effect is compiled from ${repoLink('vfx/recipes/rift-runner.mjs','vfx/recipes/rift-runner.mjs')} and ${repoLink('vfx/recipes/shared.mjs','vfx/recipes/shared.mjs')} into ${repoLink('public/vfx/skills.bin','public/vfx/skills.bin')} and rendered on two isometric planes (\`groundFx\` and \`worldFx\`) with nearest-neighbor pixel sampling (\`scaleMode: "nearest"\`):

- **Crystalline shards, plasma cores & electric arcs**: Forearm crystal casts and impacts combine quantized pixel-art shards (\`L.shards\`), high-frequency lightning arcs (\`L.arcs\`, \`L.groundArcs\`), counter-rotating pixel magic circles (\`L.magicCircle\`), and implosive void vortices (\`L.vortex\`).
- **Strict wall collision & silhouette occlusion**: **Rift Bolt** spears ray-march against Stronghold walls (\`traceWallRay\`) to detonate on contact, **Rift Trap** telegraphs clamp before walls (\`clampTargetToWall\`), and particles behind courtyard structures or the hero attenuate cleanly via \`occlusionAt\`.

![Shared cues: Astral Cleave, sword swing, critical hit, particle level-up magic circle, trinity auto-cast](${HOST}/nixie-fx/shared-cues.webp)

## Source & verification

- **Recipes & cues**: ${repoLink('vfx/recipes/rift-runner.mjs','vfx/recipes/rift-runner.mjs')} · ${repoLink('src/fx/heroes/rift-runner.ts','src/fx/heroes/rift-runner.ts')} · ${repoLink('src/stronghold/combat-vfx.ts','src/stronghold/combat-vfx.ts')}
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
| Skills | 5 active skills (${kbLink('Flame Fan',emberChildIds['flame-fan'])}, ${kbLink('Cinder Step',emberChildIds['cinder-step'])}, ${kbLink('Ember Snare',emberChildIds['ember-snare'])}, ${kbLink('Astral Cleave',emberChildIds['cleave'])}, ${kbLink('Seismic Slam (Molten)',emberChildIds['shockwave'])}) with NixieFX pixel particle VFX and embedded interactive Skill Players |
| In game | Playable in solo and 20 Hz co-op with 3-slot auto-cast loadout |

## Pages

| Page | Contents |
| --- | --- |
| ${kbLink('Design','NKBDacdece78e4763ef6f25531d4')} | Identity, abilities and current concept art |
| ${kbLink('Sprites & Animation','NKBD0b88c526f711c737d46ee93c')} | Standardized 8 × 8 pose sheets (Idle, Hurt, Death, Run, Attack), layout specs and embedded 8-direction sprite players |
| ${kbLink('Skills',emberSkillsParentId)} | Full 5-skill mechanical specifications, child pages (${kbLink('Flame Fan',emberChildIds['flame-fan'])}, ${kbLink('Cinder Step',emberChildIds['cinder-step'])}, ${kbLink('Ember Snare',emberChildIds['ember-snare'])}, ${kbLink('Astral Cleave',emberChildIds['cleave'])}, ${kbLink('Seismic Slam (Molten)',emberChildIds['shockwave'])}), inline VFX previews, and embedded interactive Skill Players |
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
