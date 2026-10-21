import {gzipSync} from 'node:zlib';import fs from 'node:fs/promises';import path from 'node:path';
const files={};async function walk(dir,rel=''){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name),r=rel+'/'+e.name;if(e.isDirectory()){if(e.name!=='evidence')await walk(p,r)}else if(!['server.mjs','README.md'].includes(e.name))files[r]=(await fs.readFile(p)).toString('base64');}}
await walk('dist');await fs.mkdir('.publish/site',{recursive:true});
// Keep each copied module below the platform's 8 MiB per-file limit.
for(const name of await fs.readdir('.publish/site'))if(/^files-\d+\.(mjs|gz)$/.test(name))await fs.unlink('.publish/site/'+name);
const chunks=[];let chunk={},bytes=0;
for(const [name,data] of Object.entries(files)){
 const entryBytes=Buffer.byteLength(JSON.stringify({[name]:data}));
 if(entryBytes>7*1024*1024)throw new Error('Resource exceeds package module limit: '+name);
 if(bytes+entryBytes>7*1024*1024){chunks.push(chunk);chunk={};bytes=0;}
 chunk[name]=data;bytes+=entryBytes;
}
if(Object.keys(chunk).length)chunks.push(chunk);
for(let i=0;i<chunks.length;i++)await fs.writeFile(`.publish/site/files-${i}.gz`,gzipSync(JSON.stringify(chunks[i])));
const imports=chunks.map((_,i)=>`const files${i}=JSON.parse(gunzipSync(readFileSync(new URL('./files-${i}.gz',import.meta.url))).toString());`).join('\n');
const code=`import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import http from 'node:http';\n${imports}\nconst files=Object.assign({},${chunks.map((_,i)=>`files${i}`).join(',')});\n// Every page (any .html, directory or extensionless path) redirects to the Stronghold.\nconst types={html:'text/html',js:'text/javascript',css:'text/css',png:'image/png',jpg:'image/jpeg',json:'application/json'};\nhttp.createServer((req,res)=>{const p=new URL(req.url,'http://local').pathname;if(p!=='/stronghold.html'&&(p.endsWith('/')||p.endsWith('.html')||!/\\.[^/]+$/.test(p))){res.writeHead(302,{Location:'/stronghold.html'}).end();return;}const key=p;const b=files[key];if(!b){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':types[key.split('.').pop()]||'application/octet-stream','Cache-Control':'no-cache'});res.end(Buffer.from(b,'base64'));}).listen(3000,'0.0.0.0',()=>console.log('Arkadia live on port 3000'));\n`;
await fs.writeFile('.publish/site/app.mjs',code);console.log('Packaged',Object.keys(files).length,'resources into',chunks.length,'asset modules plus one foreground Node server');
