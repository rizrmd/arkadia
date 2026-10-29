// Small, bounded render timings. Sub-phases overlap parent phases and must not be added to their totals.
export type RenderOperation={phase:string;startTime:number;duration:number;sourceURL?:string;sourceFunctionName?:string};
let frame:Record<string,number>={};
const operations:RenderOperation[]=[];
export function measureRenderDetail<T>(phase:string,fn:()=>T,source?:()=>Pick<RenderOperation,'sourceURL'|'sourceFunctionName'>):T{
 const startTime=performance.now();
 try{return fn();}finally{
  const duration=performance.now()-startTime;
  frame[phase]=(frame[phase]??0)+duration;
  if(duration>=8)recordRenderOperation({phase,startTime:+startTime.toFixed(2),duration:+duration.toFixed(2),...source?.()});
 }
}
export function takeRenderDetails(){const out=frame;frame={};for(const key in out)out[key]=Math.round(out[key]*100)/100;return out;}
export function recentRenderOperations(){return operations.slice();}

export function recordRenderOperation(op:RenderOperation){operations.push(op);if(operations.length>32)operations.shift();}
