// Builds the NixieFX project in vfx/: compiles every recipe in vfx/recipes/ into vfx/effects/, then validates and
// exports the runtime bundle (vfx/out/vfx) that the game loads.
//   node scripts/vfx/build.mjs            (npm run vfx)
// Effects made by hand in the NixieFX editor live next to the generated ones and are never touched: only files
// listed in vfx/generated-effects.json (written here) are rewritten or pruned.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {effect} from './lib/nixie.mjs';
const ROOT='vfx',EFFECTS=path.join(ROOT,'effects'),LEDGER=path.join(ROOT,'generated-effects.json'),CLI='node_modules/nixie-fx/dist/cli.js';
const prj=path.join(ROOT,'vfx-editor.prj');
if(!fs.existsSync(prj))fs.writeFileSync(prj,JSON.stringify({app:'vfx-editor',kind:'project',version:1,id:'arkodia-skill-vfx',name:'Arkodia Skill VFX',
 settings:{effectDataPath:'effects',outputPath:'out/vfx',assetRootPath:'assets',materialsFolder:'materials',allowExternalOutput:false,lastEffectFile:'ember-warden/flame-fan.cast.json'},
 createdAt:'2026-10-22T00:00:00.000Z',updatedAt:'2026-10-22T00:00:00.000Z'},null,2)+'\n');
fs.mkdirSync(path.join(ROOT,'assets/materials'),{recursive:true});
const specs=[];
for(const f of fs.readdirSync(path.join(ROOT,'recipes')).filter(f=>f.endsWith('.mjs')).sort()){
 const mod=await import(path.resolve(ROOT,'recipes',f));specs.push(...mod.default.map(s=>({...s,recipe:f})));}
const ids=new Map();for(const s of specs){if(ids.has(s.id))throw Error(`Effect ${s.id} is defined in ${ids.get(s.id)} and ${s.recipe}`);ids.set(s.id,s.recipe);}
const fileOf=id=>{const [owner,...rest]=id.split('.');return `${owner}/${rest.join('.')}.json`;};
const previous=fs.existsSync(LEDGER)?JSON.parse(fs.readFileSync(LEDGER,'utf8')).files:[];
const written=[];
for(const s of specs){const file=fileOf(s.id),out=path.join(EFFECTS,file);fs.mkdirSync(path.dirname(out),{recursive:true});
 const json=JSON.stringify(effect(s),null,1)+'\n';if(!fs.existsSync(out)||fs.readFileSync(out,'utf8')!==json)fs.writeFileSync(out,json);written.push(file);}
for(const f of previous)if(!written.includes(f)&&fs.existsSync(path.join(EFFECTS,f)))fs.rmSync(path.join(EFFECTS,f));
fs.writeFileSync(LEDGER,JSON.stringify({note:'Effects compiled from vfx/recipes by scripts/vfx/build.mjs. Edit the recipe, not these files.',files:written.sort()},null,1)+'\n');
const run=args=>execFileSync(process.execPath,[CLI,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
try{const v=run(['validate',ROOT]);if(process.argv.includes('--verbose'))console.log(v.trim());}
catch(e){console.error(e.stdout||'',e.stderr||'');process.exit(1);}
run(['export',ROOT]);
console.log(run(['export-status',ROOT]).trim().split('\n').slice(-2).join('\n'));
console.log(`${written.length} recipe effects compiled.`);
