import {chromium} from 'playwright';import fs from 'node:fs';
const [before,after]=['docs/loading-progress/results-before.json','docs/loading-progress/results.json'].map(f=>JSON.parse(fs.readFileSync(f)).samples);
const W=900,H=440,L=64,R=150,T=78,B=56,maxT=Math.ceil(Math.max(before.at(-1).t,after.at(-1).t)/5000)*5000;
const x=t=>L+(W-L-R)*t/maxT,y=p=>T+(H-T-B)*(1-p/100);
const path=s=>s.map((p,i)=>`${i?'L':'M'}${x(p.t).toFixed(1)},${y(p.percent).toFixed(1)}`).join('');
let grid='';for(let p=0;p<=100;p+=25)grid+=`<line x1="${L}" x2="${W-R}" y1="${y(p)}" y2="${y(p)}" stroke="#e4e3df"/><text x="${L-10}" y="${y(p)+4}" text-anchor="end">${p}%</text>`;
for(let t=0;t<=maxT;t+=5000)grid+=`<text x="${x(t)}" y="${H-B+22}" text-anchor="middle">${t/1000} s</text>`;
const end=(s,label,dy)=>{const p=s.at(-1);return `<text x="${x(p.t)+10}" y="${y(p.percent)+dy}" class="lab">${label}</text>`;};
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="system-ui,sans-serif" font-size="13" fill="#5c5b55">
<rect width="${W}" height="${H}" fill="#fcfcfb"/>
<text x="${L}" y="26" font-size="16" font-weight="600" fill="#1f1f1d">Loading bar vs. time, 390 × 844 phone at 10 Mbps</text>
<g transform="translate(${L},56)"><rect y="-9" width="14" height="3" fill="#eb6834"/><text x="20" y="-3">Before: one step per finished file</text><rect x="260" y="-9" width="14" height="3" fill="#2a78d6"/><text x="280" y="-3">After: weighted by downloaded bytes</text></g>
${grid}<line x1="${L}" x2="${W-R}" y1="${y(0)}" y2="${y(0)}" stroke="#a8a79f"/>
<path d="${path(before)}" fill="none" stroke="#eb6834" stroke-width="2" stroke-linejoin="round"/>
<path d="${path(after)}" fill="none" stroke="#2a78d6" stroke-width="2" stroke-linejoin="round"/>
<text x="${x(5600)}" y="${y(8)}" fill="#1f1f1d">Before: flat at 14% for 5 s</text>
<style>.lab{fill:#1f1f1d}</style></svg>`;
fs.writeFileSync('docs/loading-progress/progress-chart.svg',svg);
const b=await chromium.launch({env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:2});await p.setContent(`<body style="margin:0">${svg}</body>`);await p.screenshot({path:'docs/loading-progress/progress-chart.png'});await b.close();
