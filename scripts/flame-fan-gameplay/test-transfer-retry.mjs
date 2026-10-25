import assert from 'node:assert/strict';
import {retryPartTransfer} from '../arkodia/publish-layer.mjs';
let calls=0;
await retryPartTransfer(()=>{if(++calls<3)throw Error('TLS handshake timeout');return 'ok';},async()=>{});assert.equal(calls,3);
calls=0;await retryPartTransfer(()=>{calls++;throw Error('already exists');},async()=>{});assert.equal(calls,1);
calls=0;await assert.rejects(retryPartTransfer(()=>{calls++;throw Error('permission denied');},async()=>{}),/permission denied/);assert.equal(calls,1);
calls=0;await assert.rejects(retryPartTransfer(()=>{calls++;throw Error('connection reset by peer');},async()=>{}),/connection reset/);assert.equal(calls,5);
console.log('Immutable part transfer: transient recovery, existing-part resume, permission rejection and bounded retries pass');
