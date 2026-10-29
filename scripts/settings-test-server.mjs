import http from 'node:http';import {readFile,stat} from 'node:fs/promises';import path from 'node:path';
export async function settingsTestServer(port,buildDir){
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff'};
 const server=http.createServer(async(req,res)=>{try{const relative=decodeURIComponent(new URL(req.url,'http://local').pathname).replace(/^\/+/,''),safe=relative&&!relative.split('/').includes('..')?relative:'index.html';let file;
 for(const root of [buildDir,'public']){const candidate=path.join(root,safe);if(await stat(candidate).then(s=>s.isFile(),()=>false)){file=candidate;break;}}
 if(!file){res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(await readFile(file));}catch{res.writeHead(500);res.end();}});
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));return {close:()=>new Promise(resolve=>server.close(resolve))};
}
