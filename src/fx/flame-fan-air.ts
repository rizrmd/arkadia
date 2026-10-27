// Visual world-pixel heights, independent of combat radius and the ground soil plane.
export const FLAME_FAN_AIR_ORIGIN=44;
export const FLAME_FAN_AIR_RISE=22;
export const flameFanAirHeight=(forward:number)=>FLAME_FAN_AIR_ORIGIN+forward*FLAME_FAN_AIR_RISE;
