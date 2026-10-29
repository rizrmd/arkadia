import assert from 'node:assert/strict';
import {requireReleaseAncestor} from '../arkodia/publish-layer.mjs';
// The actual later HUD release omitted persistence; publishing it must fail.
assert.throws(()=>requireReleaseAncestor('d63f7192','064aaeae'),/remove shipped gameplay/);
// The cumulative fix retains both the persistence and the later HUD change.
requireReleaseAncestor('d63f7192');
requireReleaseAncestor('064aaeae');
console.log('PASS release ancestry: reproduced rollback rejected, cumulative gameplay and HUD retained');
