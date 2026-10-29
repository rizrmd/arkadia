## Runtime integration checkpoint

The current candidate replaces the static world shadow path with an original-alpha light-space depth field. Court sprites use measured alpha support profiles; frontier props reuse registered ground profiles. Terrain receiver height follows authored relief geometry. A camera clipmap keeps the active textures near 8 MB in the tested cemetery viewport instead of the initial 28 MB full-map maps. Depth work runs in Web Workers.

Static scenery receives by reconstructed per-pixel height. The native actor sprite batch now receives scenery shadows for the hero, party and enemies, preserving frame alpha/tint and multi-texture batching; it reserves four texture units for light-depth maps instead of installing per-actor filters. The gateway publishes its current unlit frame into a separate dynamic depth field with the original closed-frame support profile. Dynamic worker latency during rapid gate animation is still to be measured and optimized.

GPU fixture passed object and ground reception, original alpha holes, mirrored holes, above-caster rejection, and native actor-batch receiving. Blocked pixels read RGB 137/142/150, while the alpha opening and above-caster receiver remained RGB 255/255/255. Numeric field tests pass 10,935 assertions; existing geometry tests pass 49,358 samples.

Source alpha, atlas packing, map geometry, collisions and pillar/stair assets remain unchanged. Self-proxy acne is suppressed by the instance ID and second distinct-owner depth; same-owner material self-shadowing above the contact region is deliberately suppressed because these are folded billboard proxies, not measured solids. Heights are packed at 0.5 world-pixel precision with a 2047.5 px maximum and 4095 instance IDs per clipmap.

## Honest remaining work

- Project dynamic actor casts onto other geometry, rather than only their existing actor-local ground-shadow canvases.
- Precompute gateway light maps if needed to guarantee all rapid animation frames without worker latency.
- Finish all-map/family exclusion inventory refresh and visual validation at multiple angles, including terrain slopes and all animated/mirrored variants.
- Complete performance optimization and measurements. SwiftShader emulation is not hardware mobile/desktop proof; the actor-shader test exposed a software-rendering slowdown and further optimization remains required.

This is a deployable checkpoint requested for human inspection. The full goal remains active and incomplete.
