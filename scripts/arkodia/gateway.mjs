import {retiredVfxPage,retiredFanAsset} from './retired-vfx.mjs';
// The public Arkodia gateway serves the game and static artwork on :3000:
//   /                       the game (one build: solo, or co-op rooms via /?room=CODE)
//   /ws /api/ /healthz      proxied to the co-op Go server (coop/arkodia on 127.0.0.1:3001)
// Releases arrive as layers (see publish-layer.mjs), applied at boot or live through a local socket.
import {applyJsonLayer} from './apply-json-layer.mjs';
import http from 'node:http';import net from 'node:net';import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const home=process.cwd(),www=path.join(home,'www'),layers=path.join(home,'layers'),coopBin=path.join(home,'coop/arkodia'),legacyCoopBin=path.join(home,'coop/arkadia'),applied=path.join(home,'applied.json');
const PORT=+(process.env.PORT||3000),COOP_PORT=+(process.env.COOP_PORT||3001);
// Folders with their own pages (directory index and .html allowed); any other .html is a retired page and redirects home.
const OPEN=[];
// Former sandbox roots, now folders.
const MOVED={};

// Cumulative release layers retain artwork, but retired executable preview files must disappear.
function prunePreviewTools(){
 if(!fs.existsSync(www))return;
 for(const relative of fs.readdirSync(www,{recursive:true})){
  const file=path.join(www,relative);if(!fs.statSync(file).isFile())continue;
  const p='/'+relative.split(path.sep).join('/');
  if((p.endsWith('.html')&&p!=='/index.html') || (/\.(?:js|mjs)$/.test(p)&&!p.startsWith('/assets/')&&!p.startsWith('/3d-hero-lab/vendor/')))
   fs.rmSync(file);
 }
}

function write(dest,bytes,mtime){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);if(mtime)try{fs.utimesSync(dest,mtime,mtime);}catch{}}
function target(key,layer){return path.join(www,path.normalize((layer.prefix||'')+key));}
// A layer is layers/<id>.json: {seq, parts, format: 'gzjson' (gzip JSON {path: base64}) | 'tgz' (game release: arkodia + site/), prefix?}.
// A layer without a prefix that carries /index.html is a game release: that file is the game page.
async function applyLayers(){
 let binaryChanged=false;
 const done=fs.existsSync(applied)?JSON.parse(fs.readFileSync(applied,'utf8')):[];
 const pending=fs.existsSync(layers)?fs.readdirSync(layers).filter(n=>n.endsWith('.json')).map(n=>({id:n.slice(0,-5),...JSON.parse(fs.readFileSync(path.join(layers,n),'utf8'))})).sort((a,b)=>a.seq-b.seq):[];
 for(const layer of pending){
  if(!done.includes(layer.id)){
   if(layer.format==='tgz'){
    const tmp=path.join(home,'.layer-tmp');fs.rmSync(tmp,{recursive:true,force:true});fs.mkdirSync(tmp);
    // Stream archive parts to disk and extract off the event loop so preview requests keep serving.
    const archive=path.join(home,'.layer-release.tgz');
    const buffer=Buffer.allocUnsafe(1<<20),output=await fs.promises.open(archive,'w');
    try{for(const part of layer.parts){
     const input=await fs.promises.open(path.join(layers,part),'r');
     try{for(;;){const {bytesRead}=await input.read(buffer,0,buffer.length,null);if(!bytesRead)break;
      for(let at=0;at<bytesRead;){const {bytesWritten}=await output.write(buffer,at,bytesRead-at,null);if(!bytesWritten)throw Error('Archive write made no progress');at+=bytesWritten;}
     }}finally{await input.close();}
    }}finally{await output.close();}
    try{await new Promise((resolve,reject)=>{const tar=spawn('tar',['-xzf',archive,'-C',tmp],{stdio:['ignore','ignore','pipe']});let error='';tar.stderr.on('data',b=>{error=(error+b).slice(-4000);});tar.on('error',reject);tar.on('exit',code=>code===0?resolve():reject(Error('Release extraction failed: '+error)));});}finally{fs.rmSync(archive,{force:true});}
    // Atomically replace the executable: overwriting a running Linux binary fails with ETXTBSY.
    const bin=['arkodia','arkadia'].map(n=>path.join(tmp,n)).find(f=>fs.existsSync(f));
    if(bin){
     const digest=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
     if(!fs.existsSync(coopBin)||digest(bin)!==digest(coopBin)){
      fs.mkdirSync(path.dirname(coopBin),{recursive:true});fs.chmodSync(bin,0o755);fs.renameSync(bin,coopBin);binaryChanged=true;
     }
    }
    const site=path.join(tmp,'site');if(fs.existsSync(site))for(const f of fs.readdirSync(site,{recursive:true}).sort((a,b)=>(a==='index.html')-(b==='index.html'))){const src=path.join(site,f),st=fs.statSync(src);if(st.isFile()){const dest=target('/'+f.split(path.sep).join('/'),layer);fs.mkdirSync(path.dirname(dest),{recursive:true});const staged=dest+'.release-tmp';fs.copyFileSync(src,staged);fs.utimesSync(staged,st.mtime,st.mtime);fs.renameSync(staged,dest);}}
    fs.rmSync(tmp,{recursive:true,force:true});
   }else{await applyJsonLayer(home,www,layer);}
   done.push(layer.id);fs.writeFileSync(applied,JSON.stringify(done,null,1));console.log('Applied layer',layer.id);
  }
  for(const n of [...layer.parts,layer.id+'.json'])fs.rmSync(path.join(layers,n),{force:true});
 }
 prunePreviewTools();
 return {binaryChanged,applied:done};
}

// The co-op server only answers /ws, /api and /healthz here; restart it if it exits.
let coop;
function startCoop(){
 // Until the first release after the rename lands, the binary is still at its pre-rename path.
 const bin=[coopBin,legacyCoopBin].find(f=>fs.existsSync(f));
 if(!bin){console.log('No co-op server binary yet');return;}
 const child=coop=spawn(bin,{env:{...process.env,GOMEMLIMIT:process.env.GOMEMLIMIT||'256MiB',GOMAXPROCS:process.env.GOMAXPROCS||'2',PORT:String(COOP_PORT),SITE_DIR:www,GAME_SAVE_DIR:path.join(home,'game-saves'),VFX_GIT_DIR:path.join(home,'fx-visuals')},stdio:'inherit'});
 child.on('exit',code=>{console.log('Co-op server exited',code);if(coop===child)setTimeout(()=>{if(coop===child)startCoop();},2000);});
}
for(const sig of ['SIGTERM','SIGINT'])process.on(sig,()=>{const c=coop;coop=null;c?.kill();process.exit(0);});

const TYPES={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json',md:'text/markdown; charset=utf-8',png:'image/png',webp:'image/webp',jpg:'image/jpeg',svg:'image/svg+xml',webm:'video/webm',zip:'application/zip',glb:'model/gltf-binary'};
const isOpen=p=>OPEN.some(o=>p.startsWith(o));
// Errors and redirects must not stick at the CDN edge (it cached header-less 404s for 4 hours, hiding files published later).
const NO_STORE={'Cache-Control':'no-store'};
function cookie(req,name){return (req.headers.cookie||'').split(/;\s*/).map(c=>c.split('=')).find(([k])=>k===name)?.[1];}
// The game page; a cookie left by the retired two-build switch is cleared.
function gamePage(req,res){
 const headers={'Content-Type':TYPES.html,'Cache-Control':'no-cache'};
 if(cookie(req,'arkadia_build'))headers['Set-Cookie']='arkadia_build=; Path=/; Max-Age=0; SameSite=Lax';
 fs.readFile(path.join(www,'index.html'),(err,b)=>err?res.writeHead(503,NO_STORE).end('Game build missing'):res.writeHead(200,headers).end(b));
}
function sendFile(req,res,file,p){
 fs.stat(file,(err,st)=>{
  if(err||!st.isFile()){res.writeHead(404,NO_STORE).end('Not found');return;}
  const headers={'Content-Type':TYPES[path.extname(file).slice(1)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':/^\/assets\/[^/]+-[^/]+\.(js|css)$/.test(p)?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff'};
  const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range||'');
  if(range&&(range[1]||range[2])){
   const start=range[1]?+range[1]:Math.max(0,st.size-range[2]),end=range[1]&&range[2]?Math.min(+range[2],st.size-1):st.size-1;
   if(start>end){res.writeHead(416,{...NO_STORE,'Content-Range':`bytes */${st.size}`}).end();return;}
   res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${st.size}`,'Content-Length':end-start+1});fs.createReadStream(file,{start,end}).pipe(res);return;
  }
  res.writeHead(200,{...headers,'Content-Length':st.size});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
 });
}
const toCoop=p=>p==='/ws'||p==='/healthz'||p==='/asset-sizes.json'||p.startsWith('/api/')||(p.toLowerCase().endsWith('.png')&&fs.existsSync(path.join(www,p)));
function proxy(req,res,fallback){
 const up=http.request({host:'127.0.0.1',port:COOP_PORT,method:req.method,path:req.url,headers:req.headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
 up.on('error',()=>res.headersSent?res.destroy():fallback?fallback():res.writeHead(502,NO_STORE).end('Co-op server unavailable'));req.pipe(up);
}

await applyLayers();startCoop();
// builds/ held the two game pages of the retired build switch.
fs.rmSync(path.join(home,'builds'),{recursive:true,force:true});
const server=http.createServer((req,res)=>{
 let u,p;try{u=new URL(req.url,'http://local');p=decodeURIComponent(u.pathname);}catch{res.writeHead(400,NO_STORE).end();return;}
 if(p.includes('\0')||p.split('/').includes('..')){res.writeHead(400,NO_STORE).end();return;}
 if(retiredFanAsset(p)){res.writeHead(410,NO_STORE).end('Fan Flame VFX has been reset');return;}
 if(retiredVfxPage(p)){res.writeHead(302,{...NO_STORE,Location:'/'+u.search}).end();return;}
 if(toCoop(p))return proxy(req,res,p.toLowerCase().endsWith('.png')||p==='/asset-sizes.json'?()=>sendFile(req,res,path.join(www,p),p):null);
 if(MOVED[p]){res.writeHead(302,{...NO_STORE,Location:MOVED[p]+u.search}).end();return;}
 if(p.endsWith('/')&&p!=='/'&&isOpen(p)&&fs.existsSync(path.join(www,p,'index.html')))return sendFile(req,res,path.join(www,p,'index.html'),p);
 if(p.endsWith('.html')&&p!=='/index.html'&&!isOpen(p)){res.writeHead(302,{...NO_STORE,Location:'/'+u.search}).end();return;}
 if(p==='/index.html'||p.endsWith('/')||!path.extname(p))return gamePage(req,res);
 sendFile(req,res,path.join(www,p),p);
});
// Co-op WebSocket: hand the upgrade straight to the Go server. Both legs send at once (no Nagle): a 40-byte input
// held back until the previous one is acknowledged reached the server a tick late.
server.on('upgrade',(req,socket,head)=>{
 if(new URL(req.url,'http://local').pathname!=='/ws'){socket.destroy();return;}
 socket.setNoDelay(true);
 const up=net.connect({port:COOP_PORT,host:'127.0.0.1',noDelay:true},()=>{let lines=`${req.method} ${req.url} HTTP/1.1\r\n`;for(let i=0;i<req.rawHeaders.length;i+=2)lines+=`${req.rawHeaders[i]}: ${req.rawHeaders[i+1]}\r\n`;up.write(lines+'\r\n');up.write(head);socket.pipe(up).pipe(socket);});
 up.on('error',()=>socket.destroy());socket.on('error',()=>up.destroy());
});
server.listen(PORT,'0.0.0.0',()=>console.log('Arkodia gateway listening on',PORT));

// Release control is a local Unix socket, never a public HTTP route. Updating layers must not
// remove domain bindings or stop the gateway that serves /dev and the independent players.
const controlPath=path.join(home,'.gateway-control.sock');
fs.rmSync(controlPath,{force:true});
let applying=false;
const control=http.createServer(async(req,res)=>{
 if(req.method!=='POST'||req.url!=='/apply'){res.writeHead(404).end();return;}
 if(applying){res.writeHead(409).end('Another release is applying');return;}
 applying=true;
 try{
  const result=await applyLayers();
  if(result.binaryChanged){
   const previous=coop;coop=null;
   if(previous&&previous.exitCode===null){
    await new Promise((resolve,reject)=>{
     const timeout=setTimeout(()=>reject(Error('Game server did not stop gracefully')),30000);
     previous.once('exit',()=>{clearTimeout(timeout);resolve();});previous.kill('SIGTERM');
    });
   }
   startCoop();
  }
  res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(result));
 }catch(error){console.error('Live release failed',error);res.writeHead(500).end(String(error));}
 finally{applying=false;}
});
control.listen(controlPath,()=>{
 fs.chmodSync(controlPath,0o600);
 const digest=createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex');
 fs.writeFileSync(path.join(home,'.gateway-live.json'),JSON.stringify({version:1,pid:process.pid,digest}));
});
