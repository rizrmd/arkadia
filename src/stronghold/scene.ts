import type {Building} from './economy';
import {modularEnclosure} from './terrain';
import {STRONGHOLD,type PrefabBuilding} from './prefabs/stronghold';
import {groundCalibration,project,unproject} from '../isometric';

const LEGACY_LAYOUT=typeof location!=='undefined'&&new URLSearchParams(location.search).get('buildings')==='all';

// 3:2 is the canvas aspect ratio, not the ground projection. Ground is 2:1.
export const WORLD = {...STRONGHOLD.world};
// Building slots from prefabs/stronghold.json. The tent stands in the centre of the court (tile 7.5, 7.5), where a
// new game starts; the old layout keeps it by the gate.
const B=STRONGHOLD.buildings;
export const slots=Object.fromEntries(Object.entries(B).map(([id,{x,y,legacy,width,pivot,asset}])=>[id,{...LEGACY_LAYOUT&&legacy?legacy:{x,y},width,pivot,asset}])) as Record<Building,{x:number;y:number;width:number;pivot:number;asset:string}>;
export function ground(){return '';}
export function enclosure(){return modularEnclosure();}
// Source-pixel landmarks on masonry bases/table edges, never roof diagonals.
// Each pair is [left endpoint, right endpoint]. Keep these auditable: the old
// hand-entered slopes missed the Barracks facade (~-.35, rather than -.43).
// The gate is a standalone sprite; its ground facade is measured from its generated base.
export const groundEdges=Object.fromEntries(Object.entries(B).map(([id,b])=>[id,b.groundEdges])) as Record<Building,PrefabBuilding['groundEdges']>;
function slope(edge:readonly [readonly [number,number],readonly [number,number]]) {
 return (edge[1][1]-edge[0][1])/(edge[1][0]-edge[0][0]);
}
function axes(b:Building):readonly [number,number] {const e=groundEdges[b];return [slope(e.rising),slope(e.falling)];}
export const groundAxes:Record<Building,readonly [number,number]>={
 forge:axes('forge'),barracks:axes('barracks'),altar:axes('altar'),mage:axes('mage'),
 expedition:axes('expedition'),mine:axes('mine'),gate:axes('gate')
};
export function calibration(b:Building){return groundCalibration(...groundAxes[b]);}
export function placement(b:Building){const s=slots[b],grid=unproject(s.x,s.y),p=project(grid.x,grid.y),c=calibration(b);return `left:${p.x}px;top:${p.y}px;--sprite-width:${s.width}px;--pivot:${s.pivot*100}%;--iso-shear:${c.shear};--iso-vertical:${c.vertical};z-index:${Math.round(p.y)}`;}
