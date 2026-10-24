// Desktop navigation shares one right edge and width, independent of world/HUD scaling.
export function desktopNavigationLayout(width: number, height: number) {
 const panelWidth = Math.round(Math.max(180, Math.min(260, width * .18, height * .36)));
 return { width: panelWidth, right: 20, top: 16, gap: 8 };
}
