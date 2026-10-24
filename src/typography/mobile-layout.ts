/** Shared CSS-pixel geometry for the mobile HUD and live minimap. */
let probe: HTMLElement | undefined;
export function mobileHudLayout(width:number) {
 if (!probe && typeof document!=='undefined') {
  probe=document.createElement('div');
  probe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(probe);
 }
 const style=probe?getComputedStyle(probe):undefined;
 const inset=(side:'Top'|'Right'|'Bottom'|'Left')=>parseFloat(style?.[`padding${side}`]??'0')||0;
 const top=inset('Top'),right=inset('Right'),bottom=inset('Bottom'),left=inset('Left');
 const available=width-left-right;
 return {top,right,bottom,left,scale:Math.min(available/848,.54),mapSize:Math.round(Math.min(112,available*.265)),mapX:width-right-8-Math.round(Math.min(112,available*.265)),mapY:top+10};
}
