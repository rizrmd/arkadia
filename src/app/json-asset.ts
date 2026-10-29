// Required sprite metadata can briefly receive an ingress error during a release.
// Keep the normal URL/cache on success; only failed attempts get a fresh key.
type Dependencies={request:typeof fetch;pause:(ms:number)=>Promise<void>;nonce:()=>string;timeoutMs:number};
class AssetResponseError extends Error{constructor(message:string,readonly retryable=true){super(message);}}
function freshUrl(url:string,nonce:string){const hash=url.indexOf('#'),head=hash<0?url:url.slice(0,hash),tail=hash<0?'':url.slice(hash);return head+(head.includes('?')?'&':'?')+'_assetRetry='+encodeURIComponent(nonce)+tail;}
export async function loadJsonAsset<T>(url:string,dependencies:Partial<Dependencies>={}):Promise<T>{
 const request=dependencies.request??fetch,pause=dependencies.pause??(ms=>new Promise(r=>setTimeout(r,ms))),nonce=dependencies.nonce??(()=>Date.now().toString(36)),timeoutMs=dependencies.timeoutMs??10000;
 let failure:unknown;
 for(let attempt=0;attempt<5;attempt++){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs),target=attempt?freshUrl(url,nonce()+'-'+attempt):url;
  try{
   const response=await request(target,{signal:controller.signal,cache:attempt?'reload':'default'});
   if(!response.ok)throw new AssetResponseError(`JSON asset ${url}: HTTP ${response.status}`,response.status===404||response.status===408||response.status===425||response.status===429||response.status>=500);
   const contentType=response.headers.get('content-type');
   if(contentType&&!contentType.toLowerCase().includes('json'))throw new AssetResponseError(`JSON asset ${url}: expected JSON, received ${contentType}`);
   return await response.json() as T;
  }catch(error){failure=error;if(error instanceof AssetResponseError&&!error.retryable)throw error;}
  finally{clearTimeout(timer);}
  if(attempt<4)await pause(1000*2**attempt);
 }
 throw new Error(`Unable to load JSON asset ${url} after 5 attempts: ${failure instanceof Error?failure.message:String(failure)}`);
}
