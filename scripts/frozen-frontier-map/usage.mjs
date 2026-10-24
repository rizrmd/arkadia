import fs from 'node:fs/promises';
// Markdown usage tables for the Knowledge page: every kit sprite with its placement count and zones, and every zone
// with its props. Fails if any sprite of the v1 or v2 kit is unused.
//   node scripts/frozen-frontier-map/usage.mjs > docs/frozen-frontier-map/usage.md
const data=JSON.parse(await fs.readFile('src/world/maps/frozen-frontier.json','utf8'));
const sprites=JSON.parse(await fs.readFile('src/world/maps/frozen-frontier-sprites.json','utf8')).assets;
const by=new Map(Object.keys(data.kit).map(a=>[a,[]]));for(const p of data.placements)by.get(p.a).push(p);
const unused=[...by].filter(([,l])=>!l.length).map(([a])=>a);if(unused.length)throw Error('Unused sprites: '+unused);
const zones=new Map();for(const p of data.placements){if(!zones.has(p.zone))zones.set(p.zone,new Map());const z=zones.get(p.zone);z.set(p.a,(z.get(p.a)||0)+1);}
const out=['| Sprite | Kit | Layer | Solid | Placed | Zones |','|---|---|---|---|---|---|'];
for(const [a,l] of by)out.push(`| ${a} | ${sprites[a].kit} | ${data.kit[a].layer} | ${data.kit[a].block.length?'yes':'no'} | ${l.length} | ${[...new Set(l.map(p=>p.zone))].join(', ')} |`);
out.push('','| Zone | Props | Contents |','|---|---|---|');
for(const [z,m] of zones)out.push(`| ${z} | ${[...m.values()].reduce((a,b)=>a+b,0)} | ${[...m].sort((a,b)=>b[1]-a[1]).map(([a,n])=>`${a} ×${n}`).join(', ')} |`);
out.push('',`${data.placements.length} placements, ${by.size} of ${by.size} sprites used.`);
console.log(out.join('\n'));
