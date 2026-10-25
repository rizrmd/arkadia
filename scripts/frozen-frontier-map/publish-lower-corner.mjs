import fs from 'node:fs';import {execFileSync} from 'node:child_process';
const cli=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',maxBuffer:20e6}));
const page='NKBDd6f62a5a172a2b0804754e52',room='DR7f0a660e4dfc6ca5002753b3',path='docs/lower-corner/attachments.json';
const receipts=fs.existsSync(path)?JSON.parse(fs.readFileSync(path)):{};
const files=[['Reported lower corner','/home/dev/attachments/TAcd3fe7c0bce4a10a9f897655.png'],['Previous raw corner','assets-src/frozen-frontier/v1/corner-s.png'],['Previous grounded corner','docs/lower-corner/previous-corner.png'],['Generated source','assets-src/frozen-frontier/v4/corner-s.png'],['Discarded generation iteration','docs/lower-corner/discarded-iteration.png'],['Before in game','docs/lower-corner/before/settlement-east.png'],['Corrected assembly','docs/lower-corner/assembly.png'],['Corrected in game','docs/lower-corner/after/settlement-east.png']];
files.push(['Mobile verification','docs/lower-corner/mobile/settlement-east.png']);
if(fs.existsSync('docs/lower-corner/live/settlement-east.png'))files.push(['Verified live','docs/lower-corner/live/settlement-east.png']);
let md='\n\n## Lower corner correction (2026-10-25)\n\n'+fs.readFileSync('docs/lower-corner/README.md','utf8').replace(/^## .*\n\n/,'')+'\n\nLive: https://ark-whachat.fural.space/\n\n';
for(const [label,file] of files){if(!receipts[file]){receipts[file]=cli(['messages','upload','--room',room,'--file',file,'--kind','photo']);fs.writeFileSync(path,JSON.stringify(receipts,null,1)+'\n');}md+=`### ${label}\n\n![${label}](${receipts[file].url})\n\n`;}
const old=cli(['knowledge','get',page]).markdown.split('\n\n## Lower corner correction (2026-10-25)')[0];
cli(['knowledge','update',page,'--markdown',old+md]);console.log('Published inline reference, source, and verification images to '+page);
