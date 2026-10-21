import fs from 'node:fs/promises';
const root='public/ember-warden/v1',docs='docs/ember-warden',m=JSON.parse(await fs.readFile(root+'/manifest.json')),pixels=JSON.parse(await fs.readFile(docs+'/pixel-and-contact-audit.json')),source=JSON.parse(await fs.readFile(docs+'/source-audit.json'));let local,live;try{local=JSON.parse(await fs.readFile(docs+'/local-playback.json'))}catch{}try{live=JSON.parse(await fs.readFile(docs+'/live-playback.json'))}catch{}
const text=`## Acceptance status

**Production candidate published; final art acceptance is pending.** The simplified 3D rendering does not yet match the approved hand-painted concept. No game-ready quality claim is made.

[Play the isolated review](https://ember-warden-review-whachat.fural.space/) · [Atlas manifest](https://ember-warden-review-whachat.fural.space/manifest.json)

## Asset coverage

- ${pixels.bodyClips} body clips, ${pixels.bodyFrames} body frames: idle, run, four full-body skills, hurt and death in all eight facings; plus eight moving Flame Fan variants. There are exactly four skills.
- ${pixels.vfxClips} separate VFX clips: Flame Fan, its moving variant, Cinder Step trail, Ember Snare seal/eruption and Furnace Heart aura.
- Body cells 256 × 256, common ground pivot (128,179.2). VFX cells 384 × 384, pivot (192,243.2); pixel scale is identical. Per-frame sockets follow the anatomical right wrist.
- All ${pixels.alpha.length} body atlases have alpha, nonempty frame coverage and transparent cell margins. Every VFX active frame is checked for clipping. Unused VFX frames are transparent.

## Source constraints

All four stationary skill endpoints and hurt return exactly to the shared neutral transforms. Death's terminal transforms remain identical from normalized time 0.8 through 1.0, and rendered frames 12–15 are pixel-identical in all eight directions. Two 482-sample foot audits cover run and moving Flame Fan: maximum measured planted-foot displacement ${Math.max(...source.contacts.map(x=>x.maxStanceSlide)).toExponential(3)} world units; floor error ${Math.max(...source.contacts.map(x=>x.maxStanceFloorError)).toExponential(3)}. These numerical checks do not replace visual review.

The source audit found a 0.032-unit floor penetration during death's fall. Removing a partial floor-clamp multiplier corrected it; the repeated mesh audit now reports minimum death height ${source.floor.find(x=>x.action==='death').minimumMeshHeight.toFixed(6)}. The two accepted source revisions differ only by this death correction; body identity, camera and all other motions are unchanged. Source receipts retain both hashes.

## Playback evidence

Local browser: ${local?'PASS — '+local.results.length+' playback/scrub/transition checks, zero page or resource errors.':'pending'}

Public browser: ${live?'PASS — '+live.results.length+' playback/scrub/transition checks; '+Object.keys(live.resourcesVerified).length+' deployed image resources match SHA-256; zero page or resource errors.':'pending'}

The verifier observes every frame of all eight facings for each action at 1× and 0.25× through requestAnimationFrame playback. It tests every frame with the scrubber, idle/action/idle-or-run transitions, hurt recovery and death's terminal hold. Trace evidence is stored in local-playback.json and live-playback.json, separately from the art review. Screenshots of each action are embedded in project Knowledge.

## Mobile loading correction

The original viewer decoded every body/VFX sheet before its first draw. It now loads only the selected action, uses browser-compatible canvas crops, releases unrelated actions and displays per-sheet progress, a timeout and Retry. Startup requests only four idle sheets. Android-sized touch emulation with ImageBitmap disabled verifies moving attack, death hold and recovery from a deliberately failed sheet. This is browser emulation, not a physical-phone claim. See local-mobile-loader.json and live-mobile-loader.json for evidence.

## Visual inspection and limitations

- Fixed yaw rotations and one camera prevent mirrored-arm swaps and sheet-to-sheet scale guesses. Right-arm anatomy is explicit in the source. Heading should still receive human review at production sprite size.
- Planted locomotion feet pass numerical checks. The in-place dash needs game-driven root travel before ground contacts during travel can be accepted. Background scrolling in the viewer is an inspection aid; it is not game movement.
- Shared non-death endpoints avoid neutral pose popping. The moving attack has a distinct aimed upper body; its entry/exit and run posture need a production animator's refinement. The viewer uses approximate cross-fades and does not supply authored transition clips.
- Face, curls, jacket silhouette, shoulder forms, cloth articulation and toy-like limbs remain below the painterly reference. The fixed rig prevents independent-frame silhouette drift, but it does not establish attractive final anatomy.
- VFX are deterministic vector-authored shapes rasterized to transparent PNGs. Flame Fan follows the actual right wrist, while seal/trail/aura use the ground pivot. Activation begins on the manifest event frame. Painterly flame detail and per-pixel limb occlusion remain unresolved; facing selects front/back draw order.
- No physical-device, gameplay, collision, combat, numerical balance or runtime performance-budget acceptance is claimed.

## Death and optional downed use

Death plays once and holds its final pose; it does not recover to idle. Optional co-op downed use would require a separate revive policy and recovery animation. Those are not included and do not replace Death.

## Review outcome

The delivered pack is a reproducible animation and VFX candidate with an isolated playable review. Final visual approval and further art refinement remain required before game-ready acceptance. Gameplay deployments and peer work are outside this pack.
`;
await fs.writeFile(root+'/qa.md',text);await fs.writeFile(docs+'/QA.md',text);console.log('QA report updated');
