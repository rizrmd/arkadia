// The one public Arkadia sandbox (https://ark-whachat.fural.space). Serves every preview from disk on :3000:
//   /                       the game (one build: solo, or co-op rooms via /?room=CODE)
//   /ws /api/ /healthz      proxied to the co-op Go server (coop/arkadia on 127.0.0.1:3001)
//   /ember-warden-review/   the Ember Warden animation review
//   /enemies/ /rift-runner/ and every other review folder from the former split sandboxes
//   /typography/            the MSDF typography rendering sample (HUD and Choose Your Hero)
// Releases arrive as layers (see publish-layer.mjs) and are applied once at boot, oldest first.
import http from 'node:http';import net from 'node:net';import fs from 'node:fs';import path from 'node:path';import {gunzipSync} from 'node:zlib';import {spawn,execFileSync} from 'node:child_process';
const home=process.cwd(),www=path.join(home,'www'),layers=path.join(home,'layers'),coopBin=path.join(home,'coop/arkadia'),applied=path.join(home,'applied.json');
const PORT=+(process.env.PORT||3000),COOP_PORT=+(process.env.COOP_PORT||3001);
// Folders with their own pages (directory index and .html allowed); any other .html is a retired page and redirects home.
const OPEN=['/environment-corners/','/typography/','/rift-runner/','/enemies/','/ember-warden-review/','/knight-footfalls/review.html'];
// Former sandbox roots, now folders.
const MOVED={'/ember-warden-review':'/ember-warden-review/','/typography':'/typography/','/enemies':'/enemies/v1/','/enemies/':'/enemies/v1/'};

function write(dest,bytes,mtime){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);if(mtime)try{fs.utimesSync(dest,mtime,mtime);}catch{}}
function target(key,layer){return path.join(www,path.normalize((layer.prefix||'')+key));}
// A layer is layers/<id>.json: {seq, parts, format: 'gzjson' (gzip JSON {path: base64}) | 'tgz' (game release: arkadia + site/), prefix?}.
// A layer without a prefix that carries /index.html is a game release: that file is the game page.
function applyLayers(){
 const done=fs.existsSync(applied)?JSON.parse(fs.readFileSync(applied,'utf8')):[];
 const pending=fs.existsSync(layers)?fs.readdirSync(layers).filter(n=>n.endsWith('.json')).map(n=>({id:n.slice(0,-5),...JSON.parse(fs.readFileSync(path.join(layers,n),'utf8'))})).sort((a,b)=>a.seq-b.seq):[];
 for(const layer of pending){
  if(!done.includes(layer.id)){
   const bytes=Buffer.concat(layer.parts.map(n=>fs.readFileSync(path.join(layers,n))));
   if(layer.format==='tgz'){
    const tmp=path.join(home,'.layer-tmp');fs.rmSync(tmp,{recursive:true,force:true});fs.mkdirSync(tmp);execFileSync('tar',['-xz','-C',tmp],{input:bytes,maxBuffer:1<<30});
    if(fs.existsSync(path.join(tmp,'arkadia'))){fs.mkdirSync(path.dirname(coopBin),{recursive:true});fs.copyFileSync(path.join(tmp,'arkadia'),coopBin);fs.chmodSync(coopBin,0o755);}
    const site=path.join(tmp,'site');if(fs.existsSync(site))for(const f of fs.readdirSync(site,{recursive:true})){const src=path.join(site,f),st=fs.statSync(src);if(st.isFile())write(target('/'+f.split(path.sep).join('/'),layer),fs.readFileSync(src),st.mtime);}
    fs.rmSync(tmp,{recursive:true,force:true});
   }else for(const [key,b64] of Object.entries(JSON.parse(gunzipSync(bytes))))write(target(key,layer),Buffer.from(b64,'base64'));
   done.push(layer.id);fs.writeFileSync(applied,JSON.stringify(done,null,1));console.log('Applied layer',layer.id);
  }
  for(const n of [...layer.parts,layer.id+'.json'])fs.rmSync(path.join(layers,n),{force:true});
 }
}

// The co-op server only answers /ws, /api and /healthz here; restart it if it exits.
let coop;
function startCoop(){
 if(!fs.existsSync(coopBin)){console.log('No co-op server binary yet');return;}
 const child=coop=spawn(coopBin,{env:{...process.env,PORT:String(COOP_PORT),SITE_DIR:www},stdio:'inherit'});
 child.on('exit',code=>{console.log('Co-op server exited',code);if(coop===child)setTimeout(startCoop,2000);});
}
for(const sig of ['SIGTERM','SIGINT'])process.on(sig,()=>{const c=coop;coop=null;c?.kill();process.exit(0);});

const TYPES={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json',md:'text/markdown; charset=utf-8',png:'image/png',webp:'image/webp',jpg:'image/jpeg',svg:'image/svg+xml',webm:'video/webm',zip:'application/zip'};
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

applyLayers();startCoop();
// builds/ held the two game pages of the retired build switch.
fs.rmSync(path.join(home,'builds'),{recursive:true,force:true});
const server=http.createServer((req,res)=>{
 let u,p;try{u=new URL(req.url,'http://local');p=decodeURIComponent(u.pathname);}catch{res.writeHead(400,NO_STORE).end();return;}
 if(p.includes('\0')||p.split('/').includes('..')){res.writeHead(400,NO_STORE).end();return;}
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
server.listen(PORT,'0.0.0.0',()=>console.log('Arkadia gateway listening on',PORT));
