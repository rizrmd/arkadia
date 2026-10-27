import {publishLayer,restart,sandboxId} from '../arkodia/publish-layer.mjs';
import {execFileSync} from 'node:child_process';
const paths=['public/flame-fan-supplemental/v1','docs/flame-fan-supplemental-v1','scripts/flame-fan-supplemental'];
execFileSync('git',['diff','--exit-code','HEAD','--',...paths],{stdio:'inherit'});
const files={};
for(const root of paths.slice(0,2))for(const p of execFileSync('git',['ls-files',root],{encoding:'utf8'}).trim().split('\n')){const name=p.split('/').pop();files['/'+name]=execFileSync('git',['show','HEAD:'+p],{maxBuffer:12e6}).toString('base64');}
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();files['/release.json']=Buffer.from(JSON.stringify({commit:sha,originalCount:30,newCandidateCount:3,integrated:false})).toString('base64');
const id=sandboxId();await publishLayer({name:'flame-supplemental-'+sha.slice(0,8),files,prefix:'/ember-warden-review/flame-fan-supplemental/v1',deferRestart:true,targetSandbox:id});await restart(id,'/ember-warden-review/flame-fan-supplemental/v1/release.json');
