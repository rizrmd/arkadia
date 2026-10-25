import assert from 'node:assert/strict';
import {partitionLayerFiles} from './batch-files.mjs';
const files=Object.fromEntries(Array.from({length:100},(_,i)=>['/evidence/é-'+i+'.png',Buffer.alloc(31,i).toString('base64')]));
const batches=partitionLayerFiles(files,400);assert(batches.length>1);assert.deepEqual(Object.assign({},...batches),files);assert(batches.every(b=>Buffer.byteLength(JSON.stringify(b))<=400));assert.deepEqual(partitionLayerFiles({},400),[]);assert.throws(()=>partitionLayerFiles({'/large':'x'.repeat(500)},400),/exceeds/);
console.log('Evidence batch byte bounds, exact reconstruction, empty input and oversize rejection pass');
