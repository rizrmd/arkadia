const paths:Record<string,string>={
 coin:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="7.5"/><path d="M14 7h-3a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-3m2-10v12"/>',
 gem:'<path d="m12 1 7 7-2 10-5 5-5-5L5 8Z"/><path d="m12 1 3 8-3 14L9 9Zm-7 7 4 1h6l4-1"/>',
 skull:'<path d="M5 15C0 4 8 1 12 1s12 3 7 14l-3 1v5H8v-5Z"/><path d="M10 17v4m4-4v4m-3-7 1-2 1 2"/><circle cx="8" cy="10" r="2"/><circle cx="16" cy="10" r="2"/>',
 anvil:'<path d="M2 6h20l-5 5h-4v5l5 3H5l5-3v-5H6Z"/>',
 person:'<circle cx="9" cy="6" r="3"/><path d="M3 20v-5a6 6 0 0 1 12 0v5Zm14-16a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5v2h-4"/>',
 clock:'<circle cx="12" cy="12" r="10"/><path d="M12 5v7l4 3"/>',
 chest:'<path d="M3 10V6l3-3h12l3 3v4Zm0 0v11h18V10M8 3v7m8-7v7M2 10h20M10 9h4v7h-4Z"/>',
 map:'<path d="m2 5 6-3 8 3 6-3-2 18-6 2-8-3-5 2ZM8 2 6 19m10-14-2 17m-4-9 2 2m0-2-2 2"/>',
 swords:'<path d="m3 2 6 3 11 14-2 2L5 7Zm18 0-6 3-4 5m-2 3-5 6 2 2 5-6M2 16l6 6m8-6 6 6"/>'
};
export function icon(name:string){return `<svg class="icon icon-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.anvil}</svg>`;}
