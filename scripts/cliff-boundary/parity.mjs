import {createServer} from 'vite';import {createHash} from 'node:crypto';import fs from 'node:fs/promises';
const vite=await createServer({server:{watch:null,hmr:false},logLevel:'error'});
try{const r=await vite.ssrLoadModule('/src/world/relief.ts');let text='';for(let u=450;u<=570;u++)for(let v=90;v<=270;v++)text+=Math.floor(r.heightAtTile(u/20,v/20)*1e6+.5)+'\n';
await fs.writeFile('docs/terrain-height/natural-parity.json',JSON.stringify({sha256:createHash('sha256').update(text).digest('hex'),samples:21901},null,2)+'\n');
const checks=[];for(const f of r.RELIEF.filter(f=>f.type==='hill'))for(let u=f.u0;u<=f.u1;u+=.1)for(let v=f.v0;v<=f.v1;v+=.1)checks.push([+u.toFixed(6),+v.toFixed(6),r.reliefBlockedTile(+u.toFixed(6),+v.toFixed(6))]);
await fs.mkdir('docs/cliff-boundary',{recursive:true});await fs.writeFile('docs/cliff-boundary/client-parity.json',JSON.stringify(checks));console.log('Generated',checks.length,'client collision cases');
}finally{await vite.close()}
