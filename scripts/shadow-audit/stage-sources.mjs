// Include every audited family, including sources only used by legacy layouts.
// A browser scan of the default layout cannot discover these files.
import fs from 'node:fs/promises';
import path from 'node:path';
const target=process.argv[2];if(!target)throw Error('Usage: stage-sources.mjs STAGED_SITE');
const inventory=JSON.parse(await fs.readFile('docs/shadow-audit/inventory.json','utf8'));
const sources=[...new Set(inventory.rows.map(r=>r.source).filter(Boolean))];
for(const source of sources){const relative=source.replace(/^\//,'');if(relative.split('/').includes('..'))throw Error('Invalid inventory path');const dest=path.join(target,relative);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(path.join('public',relative),dest);}
console.log(JSON.stringify({stagedAuditedSources:sources.length}));
