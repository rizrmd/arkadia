import fs from 'node:fs/promises';import {publishLayer} from './arkadia/publish-layer.mjs';
// Publish a clean gameplay build and task assets as the Stronghold build of the Arkadia sandbox (/?build=stronghold).
// Use RELEASE_DIR to point at a clean build of the committed release.
const release=process.env.RELEASE_DIR||'.',files={};
files['/index.html']=(await fs.readFile(release+'/dist/index.html')).toString('base64');
for(const n of await fs.readdir(release+'/dist/assets'))if(/\.(js|css)$/.test(n))files['/assets/'+n]=(await fs.readFile(release+'/dist/assets/'+n)).toString('base64');
files['/asset-sizes.json']=(await fs.readFile(release+'/dist/asset-sizes.json')).toString('base64');
for(const n of await fs.readdir('public/camera-follow'))files['/camera-follow/'+n]=(await fs.readFile('public/camera-follow/'+n)).toString('base64');
await publishLayer({name:'camera-follow',files,build:'stronghold',check:'/camera-follow/'+(await fs.readdir('public/camera-follow'))[0]});
