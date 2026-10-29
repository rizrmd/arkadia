import type {Plugin} from 'vite';

// Embed the actual startup graph and byte sizes, not every diagnostic/lab chunk.
// ResourceTiming reports completion of native module loads, including cache hits;
// no duplicate fetches, extra manifest request, or synthetic percentage timer.
export function bootProgress():Plugin{
 return {name:'boot-code-progress',transformIndexHtml:{order:'post',handler(_html,ctx){
  if(!ctx.bundle)return;
  const chunks=Object.values(ctx.bundle).filter(item=>item.type==='chunk');
  const entry=chunks.find(item=>item.isEntry&&item.facadeModuleId?.endsWith('/src/app/main.ts'));
  const loader=chunks.find(item=>Object.keys(item.modules).some(id=>id.endsWith('/src/app/loader.ts')));
  const graph=(route:string)=>{
   const files:Record<string,number>={};
   const visit=(file:string)=>{const item=ctx.bundle![file];if(!item||item.type!=='chunk'||('/'+file) in files)return;files['/'+file]=Buffer.byteLength(item.code);for(const imported of item.imports)visit(imported);};
   const view=chunks.find(item=>item.facadeModuleId?.endsWith(route));
   for(const chunk of [entry,loader,view])if(chunk)visit(chunk.fileName);
   return files;
  };
  return [{tag:'script',children:`window.__BOOT_ASSETS__=${JSON.stringify({game:graph('/src/stronghold/main.ts')})};`,injectTo:'head'}];
 }}};
}
