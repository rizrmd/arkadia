// Packs the exported NixieFX bundle (vfx/out/vfx) into what the game downloads: public/vfx/skills.bin (manifest +
// every effect in one gzipped JSON file) and public/vfx/textures/. NixieFX effects spell out every default (~55 KB each), and
// our server does not compress JSON, so fields equal to the runtime defaults are dropped. NixieFX's own normaliser
// fills them back in; the script proves that by normalising both versions of every effect and comparing them.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {normalizeParticleEffect} from 'nixie-fx';
import {loadVfxExportBundle} from 'nixie-fx/export';
import {normalizePixiVfxEffect} from 'nixie-fx/pixi';
const SRC='vfx/out/vfx',OUT='public/vfx';
const manifest=JSON.parse(fs.readFileSync(path.join(SRC,'manifest.json'),'utf8'));
const read=p=>JSON.parse(fs.readFileSync(path.join(SRC,p),'utf8'));
// Defaults as the runtime sees them: a normalised effect with one default emitter.
const blank=normalizeParticleEffect({app:'vfx-editor',kind:'particle-effect',version:1,targetProfile:'pixi-ui-2d',id:'blank',name:'blank',emitters:[{}]});
const defEmitter=blank.emitters[0];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Greedy: drop a default-valued subtree only if the normalised emitter stays identical (the normaliser derives some
// absent fields from others, e.g. a missing gradient from the base colour); otherwise keep it or try its children.
function strip(fx,emitter){
 const norm=e=>JSON.stringify(normalizePixiVfxEffect({...fx,emitters:[e]}).emitters[0]),want=norm(emitter),out=structuredClone(emitter);
 const queue=Object.keys(out).map(k=>[k]);
 while(queue.length){const p=queue.shift(),parent=p.slice(0,-1).reduce((o,k)=>o[k],out),key=p.at(-1),value=parent[key],def=p.reduce((o,k)=>o?.[k],defEmitter);
  if(def!==undefined&&same(value,def)){delete parent[key];if(norm(out)===want)continue;parent[key]=value;}
  if(value&&typeof value==='object'&&!Array.isArray(value)&&def&&typeof def==='object')queue.push(...Object.keys(value).map(k=>[...p,k]));}
 return out;
}
const effects={};let before=0,after=0;
for(const entry of manifest.effects){
 const fx=read(entry.path),packed={...fx,emitters:fx.emitters.map(e=>strip(fx,e))};
 if(!same(normalizePixiVfxEffect(fx),normalizePixiVfxEffect(packed)))throw Error(`Packing changed ${entry.path}`);
 before+=JSON.stringify(fx).length;after+=JSON.stringify(packed).length;effects[entry.path]=packed;
}
// The loader must still accept the packed bundle (identities, hashes, validation, pixi2d support).
loadVfxExportBundle({manifest,effectsByPath:effects},{requiredBackend:'pixi2d'});
// Overwrite in place (dev servers keep watching the folder) and prune only textures no effect uses any more.
fs.mkdirSync(path.join(OUT,'textures'),{recursive:true});
const used=new Set(manifest.assets.filter(a=>a.type==='texture').map(a=>a.path));
for(const p of used){const src=path.join(SRC,p),dst=path.join(OUT,p);if(!fs.existsSync(dst)||!fs.readFileSync(src).equals(fs.readFileSync(dst)))fs.copyFileSync(src,dst);}
for(const f of fs.readdirSync(path.join(OUT,'textures')))if(!used.has('textures/'+f))fs.rmSync(path.join(OUT,'textures',f));
// skills.bin (gzip) is what the game fetches and inflates itself (DecompressionStream): the server sends JSON as is.
// Not .gz: static servers treat that as a content encoding.
const json=JSON.stringify({manifest,effects});
fs.writeFileSync(path.join(OUT,'skills.bin'),zlib.gzipSync(json,{level:9}));fs.rmSync(path.join(OUT,'skills.json'),{force:true});
console.log(`${manifest.effects.length} effects packed: ${(before/1024).toFixed(0)} KB → ${(after/1024).toFixed(0)} KB JSON (${(fs.statSync(path.join(OUT,'skills.bin')).size/1024).toFixed(0)} KB gzip), ${manifest.assets.length} textures.`);
