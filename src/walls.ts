import { Matrix, Sprite, Texture } from 'pixi.js';

// Source-pixel ground contacts at the centres of the end posts, not image bounds.
// A small vertical shear matches the 2:1 ground slope while keeping posts upright.
import {wallSources} from './wall-sources';
export {wallSources} from './wall-sources';
export type WallId = keyof typeof wallSources;

export function makeWall(id: WallId, texture: Texture, slope: number) {
  const source = wallSources[id], [[x0, y0], [x1, y1]] = source.feet;
  const scale = 128 / (x1 - x0);
  const shear = (128 * slope - scale * (y1 - y0)) / (x1 - x0);
  const sprite = new Sprite(texture);
  sprite.label = id;
  sprite.anchor.set((x0 + x1) / 2 / texture.width, (y0 + y1) / 2 / texture.height);
  sprite.setFromMatrix(new Matrix(scale, shear, 0, scale, 0, 0));
  return sprite;
}
