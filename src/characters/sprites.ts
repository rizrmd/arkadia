import { Assets, Rectangle, Texture } from 'pixi.js';

// Mirrors public/assets/characters/manifest.json written by scripts/extract-characters.mjs.
export type ClipName = 'idle' | 'move' | 'attack' | 'hit' | 'die';
export type TextureClipName = ClipName | 'idleBack' | 'moveBack';
export type Clip = { fps: number; loop: boolean; impact?: number; frames: number[] };
export type FrameMeta = { row: number; col: number; x: number; y: number; w: number; h: number; source: { x: number; y: number; w: number; h: number } };
export type CharacterMeta = { id: string; image: string; atlasSize: [number, number]; scale: number; gutter: number; cell: { w: number; h: number; pivot: { x: number; y: number } }; direction: string; clips: Record<TextureClipName, Clip>; frames: FrameMeta[] };
export type EquipmentMeta = { image: string; atlasSize: [number, number]; icon: number; items: { id: string; x: number; y: number; w: number; h: number; source: { x: number; y: number; w: number; h: number } }[] };
export type CharacterManifest = { alphaThreshold: number; characters: Record<string, CharacterMeta>; equipment: EquipmentMeta };

export type SpriteSet = { meta: CharacterMeta; anchor: { x: number; y: number }; clips: Record<TextureClipName, Texture[]> };

const BASE = '/assets/characters/';

// One texture per frame, cut on the exact padded cell rectangle; every cell shares the same pivot pixel,
// so the sprite anchor never changes between frames or clips (no anchor-induced jitter).
export async function loadCharacters() {
  const manifest: CharacterManifest = await (await fetch(`${BASE}manifest.json`)).json();
  const sets: Record<string, SpriteSet> = {};
  for (const meta of Object.values(manifest.characters)) {
    const atlas: Texture = await Assets.load({ src: BASE + meta.image, data: { autoGenerateMipmaps: true, scaleMode: 'linear' } });
    const frames = meta.frames.map(f => new Texture({ source: atlas.source, frame: new Rectangle(f.x, f.y, f.w, f.h) }));
    const clips = Object.fromEntries(Object.entries(meta.clips).map(([name, clip]) => [name, clip.frames.map(i => frames[i])])) as Record<TextureClipName, Texture[]>;
    sets[meta.id] = { meta, anchor: { x: meta.cell.pivot.x / meta.cell.w, y: meta.cell.pivot.y / meta.cell.h }, clips };
  }
  return { manifest, sets };
}

export const equipmentUrl = (m: EquipmentMeta) => BASE + m.image;
