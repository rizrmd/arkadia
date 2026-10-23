import { publishLayer, readDir } from '../arkodia/publish-layer.mjs';

const labFiles = await readDir('public/3d-hero-lab');
const assetFiles = await readDir('public/assets/characters/3d');
const docFiles = await readDir('docs/3d-heroes');

const files = {};
for (const [k, v] of Object.entries(labFiles)) {
  files['/3d-hero-lab' + k] = v;
}
for (const [k, v] of Object.entries(assetFiles)) {
  files['/assets/characters/3d' + k] = v;
}
for (const [k, v] of Object.entries(docFiles)) {
  files['/3d-hero-lab/evidence' + k] = v;
}

await publishLayer({
  name: '3d-hero-lab',
  files,
  prefix: '',
  check: '/3d-hero-lab/index.html'
});
