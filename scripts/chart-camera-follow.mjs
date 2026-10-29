import {chromium} from 'playwright';import fs from 'node:fs/promises';
// Renders docs/camera-follow/speed.png: camera speed per frame while the hero walks, stops, turns and stops,
// before and after the spring follow, from the traces measure-camera-follow.mjs writes (REPORT).
const load=async f=>{const t=JSON.parse(await fs.readFile('docs/camera-follow/'+f)).trace,t0=t[0].t;return t.slice(1).map((s,i)=>({t:(s.t-t0)/1000,v:Math.hypot(s.cam[0]-t[i].cam[0],s.cam[1]-t[i].cam[1])/(s.t-t[i].t)*1000}));};
const series=[{name:'Before',color:'#2a78d6',data:await load('before-desktop.json')},{name:'After',color:'#eb6834',data:await load('after-desktop.json')}];
const W=960,H=420,m={l:64,r:24,t:56,b:56},X=t=>m.l+t/6.6*(W-m.l-m.r),Y=v=>H-m.b-v/140*(H-m.t-m.b);
const grid=[0,35,70,105,140].map(v=>`<line x1="${m.l}" x2="${W-m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e4e3df"/><text x="${m.l-10}" y="${Y(v)+4}" text-anchor="end">${v}</text>`).join('');
const ticks=[0,1,2,3,4,5,6].map(t=>`<text x="${X(t)}" y="${H-m.b+22}" text-anchor="middle">${t}s</text>`).join('');
const marks=[[0,'Walk right'],[2.2,'Release'],[3.3,'Walk left'],[5.5,'Release']].map(([t,l])=>`<line x1="${X(t)}" x2="${X(t)}" y1="${m.t-6}" y2="${H-m.b}" stroke="#c3c2b7" stroke-dasharray="3 4"/><text x="${X(t)+5}" y="${m.t-10}" class="muted">${l}</text>`).join('');
const lines=series.map(s=>{const d=s.data.filter(p=>p.t<=6.6);const last=d.at(-1);return `<polyline fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" points="${d.map(p=>X(p.t).toFixed(1)+','+Y(Math.min(p.v,140)).toFixed(1)).join(' ')}"/>`;}).join('');
const html=`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#fcfcfb;font:13px system-ui,sans-serif;color:#3d3d3a}text{fill:#6b6a63;font-size:12px}.muted{fill:#8a897f}h1{font-size:16px;margin:18px 24px 0;color:#1f1f1d;font-weight:600}p{margin:4px 24px 0;color:#6b6a63}.key{display:flex;gap:18px;margin:8px 24px 0}.key span{display:flex;align-items:center;gap:6px}.key i{width:14px;height:3px;border-radius:2px;display:inline-block}</style>
<h1>Camera speed while the hero walks and stops (1280 × 800)</h1><p>Before, the camera dropped from walking pace to zero in one frame on release; after, it eases to rest.</p>
<div class="key">${series.map(s=>`<span><i style="background:${s.color}"></i>${s.name}</span>`).join('')}</div>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${grid}${ticks}${marks}${lines}
<text x="${m.l}" y="${H-12}" class="muted">Time since first key press</text><text transform="translate(16 ${(H)/2}) rotate(-90)" text-anchor="middle" class="muted">Camera speed (screen px/s)</text>
<text x="${X(2.27)}" y="${Y(128)}" style="fill:#3d3d3a">Before: 113 → 0 px/s</text><text x="${X(2.27)}" y="${Y(128)+16}" style="fill:#3d3d3a">in one frame</text><text x="${X(3.55)}" y="${Y(92)}" style="fill:#3d3d3a">Before: the leftover lag jumps in on the next walk</text><text x="${X(3.55)}" y="${Y(40)}" style="fill:#3d3d3a">After: eases to rest in ~0.8 s after release,</text><text x="${X(3.55)}" y="${Y(40)+16}" style="fill:#3d3d3a">so the next walk starts from rest</text></svg>`;
await fs.writeFile('docs/camera-follow/speed.html',html);
const b=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
const p=await b.newPage({viewport:{width:W,height:H+90},deviceScaleFactor:2});await p.setContent(html);await p.screenshot({path:'docs/camera-follow/speed.png'});await b.close();
