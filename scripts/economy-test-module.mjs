// Resolve the economy's TypeScript dependency for Node scripts, as Vite does for the game.
import ts from 'typescript';import fs from 'node:fs';
const compile=path=>ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const url=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const items=url(compile('../src/stronghold/items.ts'));
const daylight=url(compile('../src/stronghold/daylight.ts'));
const gathering=url(compile('../src/stronghold/gathering-rules.ts').replace("'./daylight'",JSON.stringify(daylight)));
const economy=url(compile('../src/stronghold/economy.ts').replace("'./items'",JSON.stringify(items)).replace("'./gathering-rules'",JSON.stringify(gathering)));
export const {fresh,settle,claim,upgrade,action,load,rewardRun,rewardSnowExpedition,BALANCE}=await import(economy);
