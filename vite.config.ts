import {defineConfig,type Connect} from 'vite';
// One page: index.html is the SPA and its router picks the view. Extensionless and directory paths fall back
// to it (Vite's SPA fallback); retired .html pages (stronghold.html, the arena, expeditions) redirect to /.
const retired=(p:string)=>p.endsWith('.html')&&p!=='/index.html';
const toHome:Connect.NextHandleFunction=(req,res,next)=>{const u=new URL(req.url||'/','http://local');if(req.method==='GET'&&retired(u.pathname)){res.statusCode=302;res.setHeader('Location','/'+u.search);res.end();return;}next();};
// Co-op: /ws and /api go to the Go game server (cd server && go run ./cmd/arkadia, PORT=8787 by default here).
const coop=process.env.COOP_SERVER||'http://127.0.0.1:8787',proxy={'/ws':{target:coop.replace(/^http/,'ws'),ws:true},'/api':{target:coop}};
export default defineConfig({plugins:[{name:'single-page',configureServer(s){s.middlewares.use(toHome);},configurePreviewServer(s){s.middlewares.use(toHome);}}],server:{proxy},preview:{proxy},build:{rollupOptions:{input:{index:'index.html'}}}});
