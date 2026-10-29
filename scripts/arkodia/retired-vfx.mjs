// Retire page entry points only; gameplay still needs their texture/model assets.
export function retiredVfxPage(path){
 const p=path.replace(/\/+$/,'');
 // Retire executable preview entry points; image/model/font assets remain available.
 if(/\.(?:js|mjs)$/.test(p) && /^\/(?:sprite-player|environment-editor|3d-hero-lab|modular-stronghold|rift-runner|ember-warden|enemies|run-cadence)\//.test(p) && !p.startsWith('/3d-hero-lab/vendor/')) return true;
 if(/^\/(?:dev|environment-editor|sprite-player|3d-hero-lab|run-cadence|modular-stronghold|environment-corners|typography|rift-runner|enemies|ember-warden-review|shadow-audit)(?:$|\/)/.test(p) && (!/\.[^/]+$/.test(p) || p.endsWith('.html'))) return true;
 return /^\/fx-lab(?:\/|$)/.test(p) || /^\/(?:skill-player|flame-burst|flame-fan(?:-player|-preview|-static|-flipbook)?|rift-bolt-player|rift-dash-player)(?:\.html)?$/.test(p)
  || /^\/rift-dash(?:\/player)?(?:\/index\.html)?$/.test(p)
  || /^\/rift-runner\/(?:rift-bolt-levels|rift-bolt-player|rift-trap-player)(?:\/index\.html)?$/.test(p)
  || /^\/ember-warden-review\/(?:flame-fan-levels|flame-fan-preview|flame-fan-flipbook|flame-fan-static|flame-fan-gameplay)(?:\/index\.html)?$/.test(p)
  || /^\/houdini-flame-fan(?:\/index\.html)?$/.test(p);
}

// Cumulative release layers may still contain old art; never serve retired VFX textures.
export function retiredFanAsset(p){
 return /^\/(?:flame-fan-(?:static|supplemental|burst-candidate|ember-candidate|flipbook)|houdini-flame-fan)\//.test(p)
  || /^\/ember-warden\/v[123]\/(?:vfx|sheets|metadata|source|previews)\/flame-fan[^/]*$/.test(p);
}
