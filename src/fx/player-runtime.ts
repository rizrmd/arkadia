import {Application} from 'pixi.js';

/** Shared runtime primitives for every Pixi media player. */
export type PlayerClockState = {time:number; playing:boolean; speed:number};

export function playerBaseUrl(): string { return import.meta.env.BASE_URL; }

export async function createPlayerApplication(options: {backgroundColor:number; antialias?:boolean}): Promise<Application> {
  const app = new Application();
  await app.init({
    resizeTo: window,
    backgroundColor: options.backgroundColor,
    antialias: options.antialias ?? true,
    resolution: Math.min(2, window.devicePixelRatio || 1),
    autoDensity: true,
  });
  document.body.appendChild(app.canvas);
  return app;
}

export function createPlayerClock(speed = 1): PlayerClockState {
  return {time: 0, playing: true, speed};
}

export function advancePlayerClock(clock: PlayerClockState, deltaMs: number, durationMs: number): number {
  if (clock.playing) clock.time = (clock.time + deltaMs * clock.speed) % durationMs;
  return clock.time;
}

export function resetPlayerClock(clock: PlayerClockState): void { clock.time = 0; }
