// Calibrated source pixels shared by Pixi and the stronghold SVG compositor.
export const wallSources = {
  'wall-a': { file: '/assets/wall-a.png', size: [343, 320], feet: [[68, 158], [274, 282]] },
  'wall-left': { file: '/assets/walls/wall-left.png', size: [1536, 1024], feet: [[420, 894], [1270, 498]] },
  'wall-left-broken': { file: '/assets/walls/wall-left-broken.png', size: [1536, 1024], feet: [[367, 824], [1300, 446]] },
} as const;
