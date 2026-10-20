import {spawn} from 'node:child_process';import fs from 'node:fs/promises';
// Clear argv to import the persistent JSON-RPC client without a one-off request.
process.argv.length=2;const {call,child}=await import('/home/dev/tools/mcp-client.mjs');
const server=spawn(process.execPath,['server.mjs']);
async function tool(name,args={}){const r=await call('tools/call',{name,arguments:args});console.log(name,JSON.stringify(r).slice(0,4000));return r;}
try{await tool('browser_navigate',{url:process.env.DEMO_URL||'http://127.0.0.1:3000'});await tool('browser_snapshot');await tool('browser_evaluate',{expression:'JSON.stringify(window.__ARKADIA__)'});await tool('browser_screenshot',{width:1440,height:1000});}finally{server.kill();child.kill();}
