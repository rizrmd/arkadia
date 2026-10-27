import {publishLayer,readDir,sandboxId} from '../arkodia/publish-layer.mjs';
await publishLayer({targetSandbox:sandboxId(),name:'flame-ember-v2-evidence',files:await readDir('docs/flame-fan-gameplay/ember-v2'),prefix:'/ember-warden-review/flame-fan-gameplay/ember-v2',check:'/ember-warden-review/flame-fan-gameplay/ember-v2/release-verification.json'});
