import path from 'node:path';
export const originalCornerGradient=`function cornerGradient(ix, iy, iz, seed, out) {
  const azimuth = hash3(ix, iy, iz, seed) * Math.PI * 2;
  const cosPolar = hash3(ix, iy, iz, seed ^ 2654435769 | 0) * 2 - 1;
  const sinPolar = Math.sqrt(Math.max(0, 1 - cosPolar * cosPolar));
  out[0] = Math.cos(azimuth) * sinPolar;
  out[1] = Math.sin(azimuth) * sinPolar;
  out[2] = cosPolar;
}`;
// Small, explicit adapter for pinned nixie-fx 0.1.22. Apply to both dependency
// optimization and production builds; leave installed third-party files intact.
export function nixieNoiseCache(){return {name:'nixie-exact-gradient-cache',transform(code:string,id:string){
 if(!id.split('?')[0].endsWith('/nixie-fx/dist/chunk-DDYEJ3XB.js'))return;
 if(!code.includes(originalCornerGradient))throw Error('NixieFX gradient contract changed; review exact-noise cache adapter');
 const helper=path.resolve('src/fx/noise-gradient-cache.ts').replaceAll('\\','/');
 return `import {cacheCornerGradient} from ${JSON.stringify(helper)};\n`+code.replace(originalCornerGradient,originalCornerGradient.replace('function cornerGradient(','function uncachedCornerGradient(')+'\nconst cornerGradient=cacheCornerGradient(uncachedCornerGradient);');
 }};}
