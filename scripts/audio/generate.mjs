import {writeFileSync} from 'node:fs';
// Original deterministic noise swoosh: no sampled or third-party material.
const rate=22050,n=Math.round(rate*.22),wav=Buffer.alloc(44+n*2);
wav.write('RIFF');wav.writeUInt32LE(36+n*2,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(n*2,40);
let seed=7421,prev=0;
for(let i=0;i<n;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1,high=noise-prev;prev=noise;const t=i/rate,envelope=Math.sin(Math.PI*i/n)**2*Math.exp(-t*14);wav.writeInt16LE(Math.round(high*envelope*6000),44+i*2);}
writeFileSync('src/app/audio/skill-swoosh.wav',wav);
