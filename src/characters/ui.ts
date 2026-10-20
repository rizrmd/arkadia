import type { Arena } from './arena';
import { equipmentUrl, type EquipmentMeta } from './sprites';

// Equipment panel driven by the 4 × 3 equipment atlas. Icons are inventory art only: they are not attachments
// and do not change the hero frames (the hero sheet already paints helm, armour, cloak and sword).
const NAMES: Record<string, string> = { sword: 'Pedang pendek', axe: 'Kapak', spear: 'Tombak', staff: 'Tongkat relik', helm: 'Helm gading', armor: 'Zirah lempeng', cloak: 'Jubah biru kobalt', shield: 'Perisai', potion: 'Potion amber', backpack: 'Ransel', map: 'Peta ekspedisi', 'soul-shard': 'Soul shard' };
const WORN = ['sword', 'helm', 'armor', 'cloak'];
const BAG = ['potion', 'shield', 'axe', 'spear', 'staff', 'backpack', 'map', 'soul-shard'];
const SIZE = 46;

export function mountEquipment(root: HTMLElement, detail: HTMLElement, meta: EquipmentMeta, arena: Arena) {
  let potions = 3;
  const k = SIZE / meta.icon, url = equipmentUrl(meta);
  const icon = (id: string, extra = '') => {
    const it = meta.items.find(i => i.id === id)!;
    return `<button class="slot${extra}" data-item="${id}" title="${NAMES[id]}" style="background-image:url(${url});background-size:${meta.atlasSize[0] * k}px ${meta.atlasSize[1] * k}px;background-position:-${it.x * k}px -${it.y * k}px"><span data-count="${id}"></span></button>`;
  };
  root.innerHTML = `<div class="slot-label">Terpasang (terlihat di sprite)</div><div class="slots">${WORN.map(id => icon(id, ' worn')).join('')}</div>` +
    `<div class="slot-label">Tas</div><div class="slots">${BAG.map(id => icon(id)).join('')}</div>`;
  const count = (id: string, v: number | string) => { root.querySelector<HTMLElement>(`[data-count="${id}"]`)!.textContent = String(v); };
  root.querySelectorAll<HTMLButtonElement>('.slot').forEach(b => {
    const id = b.dataset.item!, it = meta.items.find(i => i.id === id)!;
    b.onmouseenter = b.onfocus = () => { detail.textContent = `${NAMES[id]} · atlas ${it.x},${it.y} · sumber ${it.source.w}×${it.source.h}${WORN.includes(id) ? ' · dilukis di sheet hero' : id === 'potion' ? ' · klik untuk minum (+35 HP)' : ' · ikon saja, belum attachment'}`; };
    if (id === 'potion') b.onclick = () => {
      const h = arena.hero;
      if (!potions || !h.alive || h.hp >= 100) return;
      potions--; h.hp = Math.min(100, h.hp + 35); count('potion', potions); b.classList.toggle('empty', !potions);
    };
  });
  count('potion', potions);
  let shown = -1;
  return () => { if (arena.kills !== shown) { shown = arena.kills; count('soul-shard', shown); } };
}

export function hud(arena: Arena) {
  const bar = document.getElementById('hp-bar')!, label = document.getElementById('hero-state')!;
  let last = '';
  return () => {
    const s = arena.snapshot(), text = `${s.hero.state.toUpperCase()} · HP ${Math.ceil(s.hero.hp)} · ${s.alive}/${s.enemies} revenant · ${s.kills} tumbang`;
    if (text === last) return;
    last = text; label.textContent = text; bar.style.width = `${s.hero.hp}%`;
  };
}
