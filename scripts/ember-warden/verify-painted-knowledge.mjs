import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const run=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',maxBuffer:8e6}));
const coverage=JSON.parse(await fs.readFile('docs/ember-warden-v2/knowledge-coverage.json'));
const deployment=JSON.parse(await fs.readFile('docs/ember-warden-v2/deployment.json'));
const [character,sources,review]=coverage.pages.map(id=>run(['knowledge','get',id]));
for(const [page,file]of [[character,'character'],[sources,'sources'],[review,'review']])if(page.markdown!==await fs.readFile(`docs/ember-warden-v2/knowledge-${file}.md`,'utf8'))throw Error('Published Knowledge content mismatch: '+file);
const verified=[];
for(const file of coverage.paths){
 const url=deployment.url+file;
 if(!sources.markdown.includes(']('+url+')'))throw Error('Missing inline image '+file);
 const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok||!r.headers.get('content-type')?.startsWith('image/'))throw Error('Image unavailable '+file);
 if(createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex')!==deployment.resources[file])throw Error('Inline image bytes mismatch '+file);
 verified.push(file);
}
const report={status:'published-knowledge-and-inline-images-pass',pages:coverage.pages,images:verified.length,verified};
await fs.writeFile('docs/ember-warden-v2/knowledge-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,pages:report.pages.length,images:report.images}));
