import {readDir,publishLayer,URL_BASE} from '../arkodia/publish-layer.mjs';
const files=await readDir('docs/rift-bolt-no-cleave');
await publishLayer({name:'rift-bolt-no-cleave-evidence',files,prefix:'/rift-runner/rift-bolt-no-cleave',check:'/rift-runner/rift-bolt-no-cleave/live-1440-160.png'});
console.log(URL_BASE+'/rift-runner/rift-bolt-no-cleave/live-1440-160.png');
