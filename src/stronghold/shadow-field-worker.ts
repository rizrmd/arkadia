import {receiverMap,casterMaps,clippedScene,type PackedShadowMap} from './shadow-map-builder';
import type {ShadowSample,ShadowSun} from './shadow-field';
let all:ShadowSample[]=[],casters:ShadowSample[]=[],height:PackedShadowMap|null=null,viewKey='';
const scope=globalThis as unknown as {onmessage:(e:MessageEvent)=>void;postMessage:(message:unknown,transfer:Transferable[])=>void};
scope.onmessage=({data})=>{
 try{
  if(data.type==='scene'){const p=data.packed as Float32Array;all=[];casters=[];for(let i=0;i<p.length;i+=18){const q={x:p[i],y:p[i+1],z:p[i+2],alpha:p[i+3],owner:p[i+4],quad:p.subarray(i+6,i+18)};all.push(q);if(p[i+5])casters.push(q);}height=null;viewKey='';return;}
  const start=performance.now(),sun=data.sun as ShadowSun,nextView=JSON.stringify(data.view??null);if(nextView!==viewKey){viewKey=nextView;height=null;}const selected=clippedScene(all,casters,sun,data.view),sendHeight=!height;if(!height)height=receiverMap(selected.receivers,data.view?.step??3);const maps=casterMaps(selected.casters,sun,data.view?.step??3),transfer:Transferable[]=[maps.depth.pixels.buffer,maps.second.pixels.buffer];
  // Keep the receiver map in the worker between sun changes; send a copy only for
  // layout changes. Main-thread rendering never waits for depth reconstruction.
  const receiver=sendHeight?{bounds:height.bounds,pixels:height.pixels.slice()}:null;if(receiver)transfer.push(receiver.pixels.buffer);
  scope.postMessage({id:data.id,revision:data.revision,sun,...maps,height:receiver,samples:selected.casters.length,buildMs:performance.now()-start},transfer);
 }catch(error){scope.postMessage({id:data.id,error:String(error)},[]);}
};
