import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
// Read the trusted renderer recipe without executing the asset-building script.
// Only these numeric box constructors are evaluated; no art or map is rebuilt.
export async function nativeSolidBoxes(){
 const source=await fs.readFile('scripts/frozen-frontier-map/ground-kit.mjs','utf8'),graveText=source.slice(source.indexOf('const plinth=()=>grave('),source.indexOf('for(const [id,o] of Object.entries(GRAVES))'));
 if(!graveText.includes('const GRAVES='))throw Error('Native grave recipe not found');
 const graves=Function('grave',graveText+';return GRAVES;')((u0,v0,u1,v1,z0,z1)=>({u0,v0,u1,v1,z0,z1}));
 const fallenText=source.slice(source.indexOf('function fallen(){'),source.indexOf('const ISO={'));
 if(!fallenText.includes('return [drum('))throw Error('Native fallen-column recipe not found');
 const fallen=Function('M','PX_M','side','stoneTop','SHAFT_BARE','ORNAMENT',fallenText+';return fallen();')(1/3,37,()=>null,()=>null,()=>[],null);
 const recipeHash=text=>createHash('sha256').update(text).digest('hex'),pack=boxes=>boxes.map(b=>[b.u0,b.v0,b.u1,b.v1,b.z0,b.z1]);
 const result={};for(const [id,entry] of Object.entries(graves))result[id]={boxes:pack(entry.boxes),recipeSha256:recipeHash(graveText)};
 result['column-fallen']={boxes:pack(fallen),recipeSha256:recipeHash(fallenText)};result['column-fallen-v']={boxes:pack(fallen).map(([u0,v0,u1,v1,z0,z1])=>[v0,u0,v1,u1,z0,z1]),recipeSha256:recipeHash(fallenText)};
 return result;
}
