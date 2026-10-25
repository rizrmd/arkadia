## Static family acceptance

The current layout registers 447 static surfaces. Its 285 distinct geometry variants, including explicit unused foundation and forge-level fixtures, pass 855 directional cases. The all-building/legacy layout registers 456 static surfaces; 293 distinct variants including the supplements pass 879 directional cases. Every case uses the production GPU filter, Worker, original alpha and registered geometry. Each visible asset receives an independent higher caster and rejects a lower caster at an actual GPU receiver pixel. Ground-cast coverage, exclusions and available raised-receiver probes are checked separately.

All current geometry signatures are represented in the legacy gallery. Numeric reports retain actual placement coordinates in both layouts, rather than claiming the screenshots cover every placement. Rotated zero-height decals use the common terrain receiver and intentionally have no independent height/caster surface. The unused foundation is labeled as a catalog fixture; it is not claimed as a placed object.

### Receiver order correction

The previous frontier receiver list followed placement-file order, while its color layer sorts by depth and cap offset. This could choose an occluded surface's height/owner at overlapping pixels. The receiver list now uses the exact stable color order. Both layouts compare all 296 upright color sprites against receiver records with zero mismatches. A separate GPU overlap fixture confirms that changing the visible receiver order changes the shadow result appropriately. Collision, navigation, source art, pillar/stair geometry and strip counts are unchanged.

Four preliminary probes selected CPU height texels at alpha boundaries. Those coordinates did not identify the same GPU pixel after float32 camera reconstruction. Final probes read the packed GPU receiver output, choose a visible interior receiver pixel and position independent higher/lower casters on that exact ray. The rock cases and full current/legacy audits then pass. The superseded observations remain in `family-probe-diagnostics.json`; they are not presented as four renderer bugs.

### Visual review gallery

The gallery includes 66 family/source groups and every one of the 293 geometry variants. Images are lossless WebP with decoded RGBA bytes checked against the original production-renderer PNG. The unlit source art is composited over the actual production shadow result for inspection. This is an explicit geometry-proxy audit, not a claim of measured volumetric self-shadowing.

<iframe src="https://ark-whachat.fural.space/shadow-audit/family-gallery.html" title="Shadow family and geometry variant acceptance" height="760"></iframe>

### Checklist

- [x] Current-layout static cast/receive controls, three sun vectors.
- [x] Legacy/all-building static cast/receive controls, three sun vectors.
- [x] Forge levels and unused foundation catalog fixture.
- [x] Receiver order matches all 296 actual color sprites in both layouts.
- [x] GPU overlap-order regression.
- [x] Source alpha, frame, pivot, lift and mirror metadata retained.
- [ ] Finish visual review of all family plates and resolve findings.
- [ ] Exercise every actor atlas frame and gateway animation frame on GPU.
- [ ] Complete dense dynamic-caster profiling and consolidate real-device telemetry.
- [ ] Push, deploy and revalidate this receiver-order correction live.

### Review plates

![Static family review plate 1](https://ark-whachat.fural.space/shadow-audit/family-review/families-0.png)

![Static family review plate 2](https://ark-whachat.fural.space/shadow-audit/family-review/families-1.png)

![Static family review plate 3](https://ark-whachat.fural.space/shadow-audit/family-review/families-2.png)

![Static family review plate 4](https://ark-whachat.fural.space/shadow-audit/family-review/families-3.png)

![Static family review plate 5](https://ark-whachat.fural.space/shadow-audit/family-review/families-4.png)

![Static family review plate 6](https://ark-whachat.fural.space/shadow-audit/family-review/families-5.png)

![Static family review plate 7](https://ark-whachat.fural.space/shadow-audit/family-review/families-6.png)

![Static family review plate 8](https://ark-whachat.fural.space/shadow-audit/family-review/families-7.png)

![Static family review plate 9](https://ark-whachat.fural.space/shadow-audit/family-review/families-8.png)

