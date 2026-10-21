import {defineConfig,type Connect} from 'vite';
// One page: index.html is the SPA and its router picks the view. Extensionless and directory paths fall back
// to it (Vite's SPA fallback); retired .html pages (stronghold.html, the arena, expeditions) redirect to /.
const retired=(p:string)=>p.endsWith('.html')&&p!=='/index.html';
const toHome:Connect.NextHandleFunction=(req,res,next)=>{const u=new URL(req.url||'/','http://local');if(req.method==='GET'&&retired(u.pathname)){res.statusCode=302;res.setHeader('Location','/'+u.search);res.end();return;}next();};
export default defineConfig({plugins:[{name:'single-page',configureServer(s){s.middlewares.use(toHome);},configurePreviewServer(s){s.middlewares.use(toHome);}}],build:{rollupOptions:{input:{index:'index.html'}}}});
