import fs from 'node:fs';import path from 'node:path';
import {defineConfig,type Connect} from 'vite';
// One page: index.html is the SPA and its router picks the view. Extensionless and directory paths fall back
// to it (Vite's SPA fallback); retired .html pages (stronghold.html, the arena, expeditions) redirect to /.
const retired=(p:string)=>p.endsWith('.html')&&p!=='/index.html';
const toHome:Connect.NextHandleFunction=(req,res,next)=>{const u=new URL(req.url||'/','http://local');if(req.method==='GET'&&retired(u.pathname)){res.statusCode=302;res.setHeader('Location','/'+u.search);res.end();return;}next();};
// The loading screen weighs artwork by bytes: asset-sizes.json gives every public image's size before it downloads.
const sizes=()=>{const out:Record<string,number>={},walk=(dir:string)=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(png|webp)$/.test(e.name))out['/'+path.relative('public',p).split(path.sep).join('/')]=fs.statSync(p).size;}};walk('public');return JSON.stringify(out);};
const sizeList:Connect.NextHandleFunction=(req,res,next)=>{if(req.url?.split('?')[0]!=='/asset-sizes.json'){next();return;}res.setHeader('Content-Type','application/json');res.end(sizes());};
// Co-op: /ws and /api go to the Go game server (cd server && go run ./cmd/arkodia, PORT=8787 by default here).
const coop=process.env.COOP_SERVER||'http://127.0.0.1:8787',proxy={'/ws':{target:coop.replace(/^http/,'ws'),ws:true},'/api':{target:coop}};
export default defineConfig({plugins:[{name:'single-page',configureServer(s){s.middlewares.use(toHome);},configurePreviewServer(s){s.middlewares.use(toHome);}},{name:'asset-sizes',configureServer(s){s.middlewares.use(sizeList);},generateBundle(){this.emitFile({type:'asset',fileName:'asset-sizes.json',source:sizes()});}}],server:{proxy},preview:{proxy},build:{rollupOptions:{input:{index:'index.html'}}}});
