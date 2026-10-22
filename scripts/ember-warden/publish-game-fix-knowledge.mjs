import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const run=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',maxBuffer:8e6}));
const base='https://ark-whachat.fural.space',dir='docs/ember-game-fix';
const section=`## Live game integration — painted Ember Warden

The reported phone screenshot showed the old 3D Ember portrait. The painted redesign had only been published to the art review pages; the game packer still read the legacy v1 animation sources.

The game now packs the painted v2 directional idle/run art and v3 animation atlas into its actual character assets. The picker portrait is regenerated from the painted front idle and has a versioned URL. The atlas has a content revision. Local players and co-op allies use the same updated character manifest.

[Play Arkadia](${base}/?pick=1) · [Live browser verification](${base}/ember-warden-review/game-fix/live.json)

### Verification

TypeScript/Vite build, Go tests and deployment smoke checks pass. Browser checks pass locally and on public HTTPS: phone picker, selection persistence, all six walking headings, combat, switching heroes without moving position, and co-op ally updates. No browser errors were recorded. Published atlas, manifest and portrait hashes match the committed files.

### Animation scope

Directional idle/run art covers all six game headings without mirroring. The eight-frame v3 run is used for SE; other headings use the existing four-frame painted run studies. Painted attack, hurt and death exports currently cover SE only and are reused for other combat headings. Combat timing and game rules retain their existing server contract. Directional combat and gait cleanup remain animation limitations.

### Reported image

![Reported phone screenshot showing the old Ember model](${base}/ember-warden-review/game-fix/reported-phone.jpg)

### Deployed result

![Painted Ember portrait on the live phone picker](${base}/ember-warden-review/game-fix/picker-phone-live.webp)

![Painted Ember playing on the live phone game](${base}/ember-warden-review/game-fix/game-phone-live.webp)

![Painted Ember in the live co-op game](${base}/ember-warden-review/game-fix/coop-live.webp)

### Local verification images

![Local phone picker](${base}/ember-warden-review/game-fix/picker-phone.webp)

![Local phone game](${base}/ember-warden-review/game-fix/game-phone.webp)

![Local co-op game](${base}/ember-warden-review/game-fix/coop.webp)
`;
for(const file of ['public/assets/characters/manifest.json','public/assets/characters/ember-warden.webp','public/assets/characters/portraits/ember-warden.webp']){
 const response=await fetch(base+'/'+file.replace('public/','')+'?verify=painted-game');if(!response.ok)throw Error('Missing '+file);
 const hash=b=>createHash('sha256').update(b).digest('hex');if(hash(Buffer.from(await response.arrayBuffer()))!==hash(await fs.readFile(file)))throw Error('Hash mismatch '+file);
}
for(const file of ['reported-phone.jpg','picker-phone-live.webp','game-phone-live.webp','coop-live.webp','picker-phone.webp','game-phone.webp','coop.webp']){
 const r=await fetch(base+'/ember-warden-review/game-fix/'+file);if(!r.ok||!r.headers.get('content-type')?.startsWith('image/'))throw Error('Missing image '+file);
}
run(['knowledge','list','--project','PJ8758f22f61165f3d3215e454']);
for(const id of ['NKBDc8ca8c735a55009062b64a64','NKBD5ffd3b14510c319ca962d83f']){
 const old=run(['knowledge','get',id]).markdown,marker='<!-- ember-game-integration-archive -->';
 const historical=old.includes(marker)?old.split(marker)[1]:old;
 const body=section+'\n'+marker+'\n## Earlier art review history\n\nThe following notes describe earlier review-only releases, before the game integration above.\n\n'+historical;
 const file=dir+'/'+id+'.md';await fs.writeFile(file,body);run(['knowledge','update',id,'--markdown-file',file]);
 if(run(['knowledge','get',id]).markdown.trim()!==body.trim())throw Error('Knowledge mismatch');
}
await fs.writeFile(dir+'/knowledge-verification.json',JSON.stringify({status:'pass',liveAssetHashes:'match',inlineImages:7,knowledgePages:2},null,2)+'\n');
console.log('Live asset hashes, 7 inline images and 2 published Knowledge pages verified');
