import {defineConfig,type Connect} from 'vite';
// Every page (any .html, directory or extensionless path) redirects to the Stronghold; assets are served as usual.
const HOME='/stronghold.html';
const isPage=(p:string)=>p!==HOME&&(p.endsWith('/')||p.endsWith('.html')||!/\.[^/]+$/.test(p));
const toStronghold:Connect.NextHandleFunction=(req,res,next)=>{const p=new URL(req.url||'/','http://local').pathname;if(req.method==='GET'&&isPage(p)&&!p.startsWith('/@')&&!p.startsWith('/node_modules/')&&!p.startsWith('/src/')){res.statusCode=302;res.setHeader('Location',HOME);res.end();return;}next();};
export default defineConfig({plugins:[{name:'redirect-to-stronghold',configureServer(s){s.middlewares.use(toStronghold);},configurePreviewServer(s){s.middlewares.use(toStronghold);}}],build:{rollupOptions:{input:{stronghold:'stronghold.html'}}}});
