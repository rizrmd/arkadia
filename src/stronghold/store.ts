import {withEconomyLock} from './gameplay-save';
import {KEY,load,type State} from './economy';
export async function transact(fn:(s:State)=>void){return withEconomyLock(()=>{const s=load(localStorage.getItem(KEY));fn(s);s.revision++;localStorage.setItem(KEY,JSON.stringify(s));return s;});}

export async function restore(raw:string){const s=load(raw);return withEconomyLock(()=>{s.revision++;localStorage.setItem(KEY,JSON.stringify(s));return s;});}
