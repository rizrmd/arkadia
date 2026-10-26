## Folded source opacity retention

A folded sprite can project a higher translucent texel and a lower opaque texel onto the same light-field texel. The old per-owner depth reduction kept only the higher sample's alpha, losing opaque coverage behind it. This is independent of source brightness and geometry height.

All static casters now retain the existing opaque envelope (source alpha ≥ 240) under their reserved alias owner, not only closed-volume props. Envelope alpha remains the original source alpha. Receiver geometry is unchanged; duplicate envelope samples never receive. Static aliases remain `2N + owner` below the actor owner range. Texture dimensions, sampler count, color sprites, batching, collision and navigation do not change.

The focused control reconstructs fourteen drift/forge production variants from recorded frame/pivot/scale/mirror/lift/shear metadata. An independent raster selects the nearest eligible opaque source at receiver heights 0, 8 and 20 for three suns. The old reduction misses 4,188 contributions; the corrected path misses zero across 35,830 checks. All rays without an eligible opaque source retain their previous partial-alpha/clear value. Forty-two production GPU cast/receive controls pass. The complete static rerun passes 313 variants / 939 sun cases / 939 independent high-low receiver controls.

Ground-only GPU sheets hide color art and evaluate height-zero terrain. They separate genuine cast loss from white source-art fringes and self-receiver cutouts in composite plates. Remaining open silhouette branches are retained from the original source; they are not filled by guessed volume or brightness-derived height.

## Release boot memory

The gateway previously expanded each JSON evidence layer into compressed bytes, full expanded JSON and a complete base64 asset object in one process, immediately before applying a game tar. The JSON applier now streams gzip and base64 to temporary files, verifies complete JSON and gzip CRC, then publishes files. Invalid/truncated JSON or corrupt gzip cannot partially overwrite the live files. The publisher installs this helper with its matching gateway.

Tests cover escaped/Unicode filenames, zero/short payloads, malformed JSON and corrupt gzip. A 64 MiB expanded JSON applies at 71,528 KiB peak RSS in a fresh process. The real gateway applies that JSON followed by a 96 MiB incompressible tar at 66,328 KiB peak RSS, below its 100 MiB test limit. This removes the observed unbounded allocation path; live release stability still requires verification.

## Remaining renderer limits

The tracked inventory includes the 76 packaged particle effects and all 57 cue-bound effect keys, plus ground/foundation/procedural dressing. Particle effects use separate unlit planes and visual occlusion masks, without directional cast/receive or volumetric smoke shadows. The baked brazier flame/metal share one material, so an independent emissive receiver mask remains unavailable. Authored sprite proxies do not constitute measured volumetric self-shadowing. Physical-device dense-scene performance has not been established.
