// Load the same TypeScript dependency graph as Vite, including construction validation.
import {registerHooks} from 'node:module';import {readFileSync} from 'node:fs';import ts from 'typescript';
registerHooks({resolve(spec,ctx,next){if(spec.startsWith('.')&&ctx.parentURL?.endsWith('.ts')&&!/\.[a-z]+$/.test(spec))spec+='.ts';return next(spec,ctx);},load(url,ctx,next){if(url.endsWith('.ts'))return {format:'module',source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,shortCircuit:true};return next(url,ctx);}});
export const {fresh,settle,claim,upgrade,action,load,rewardRun,rewardSnowExpedition,BALANCE}=await import('../src/stronghold/economy.ts');
