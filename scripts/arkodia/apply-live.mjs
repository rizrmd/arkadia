// Runs inside the custom sandbox via the supported sandboxes exec command.
import http from 'node:http';
import path from 'node:path';
const req=http.request({socketPath:path.join(process.cwd(),'.gateway-control.sock'),method:'POST',path:'/apply'},res=>{
 let body='';res.setEncoding('utf8');res.on('data',b=>body+=b);res.on('end',()=>{console.log(body);if(res.statusCode!==200)process.exitCode=1;});
});
req.setTimeout(180000,()=>req.destroy(Error('Live release timed out; inspect gateway logs before retrying')));
req.on('error',error=>{console.error(error.message);process.exitCode=1;});req.end();
