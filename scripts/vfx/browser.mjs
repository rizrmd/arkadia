// Headless Chromium for the VFX scripts. The sandbox needs the HOME-installed browser libraries and a single process.
import {chromium} from 'playwright';
export const launch=()=>chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
