import {chromium} from 'playwright';
// The single-process sandbox browser can fail Cloudflare HTTP/3 GLB transfers.
// Use HTTP/2 at the real public URL; no resource mocking or runtime replacement.
export const launch=()=>chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process','--disable-quic','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
