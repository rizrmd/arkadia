import fs from 'node:fs/promises';import {publishLayer} from '../arkadia/publish-layer.mjs';
const files={};
for(const f of await fs.readdir('docs/run-cadence'))if(/\.(json|webp|md)$/.test(f))files['/verification/'+f]=(await fs.readFile('docs/run-cadence/'+f)).toString('base64');
for(const f of ['ember-before.png','rift-before.png'])files['/candidates/'+f]=(await fs.readFile('public/run-cadence/candidates/'+f)).toString('base64');
await publishLayer({name:'run-cadence-evidence',files,prefix:'/run-cadence',check:'/run-cadence/'});
console.log('Run evidence published:',Object.keys(files).length,'files');
