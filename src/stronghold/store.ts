import {KEY,load,type State} from './economy';
export async function transact(fn:(s:State)=>void){if(!navigator.locks)throw Error('This browser needs Web Locks for safe resource transactions.');return navigator.locks.request(KEY,()=>{const s=load(localStorage.getItem(KEY));fn(s);s.revision++;localStorage.setItem(KEY,JSON.stringify(s));return s;});}

export async function restore(raw:string){const s=load(raw);if(!navigator.locks)throw Error("This browser needs Web Locks for safe resource transactions.");return navigator.locks.request(KEY,()=>{s.revision++;localStorage.setItem(KEY,JSON.stringify(s));return s;});}
