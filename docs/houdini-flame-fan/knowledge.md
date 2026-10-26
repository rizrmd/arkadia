## Houdini Flame Fan — noncommercial render experiment

PC-FATAN ran Houdini 22.0.466 with an Apprentice license. All five levels were simulated and rendered through Karma CPU: **36 RGBA frames each at 1280×720, 24 FPS**, with consistent camera and pivot. The final batch exited successfully in 367 seconds. Earlier 128/256-pixel drafts are superseded.

**Not production approved:** these assets remain noncommercial, and visible sampling noise, rolling-flame appearance, directional coverage, game depth/occlusion integration and physical-device performance remain unresolved. Cropping or offsetting a watermark does not change licensing. Nothing imports these assets into commercial gameplay.

<iframe src="https://ark-whachat.fural.space/houdini-flame-fan/" title="Houdini Flame Fan — noncommercial Lv1–Lv5 experiment" height="860"></iframe>

[Open Pixi experiment](https://ark-whachat.fural.space/houdini-flame-fan/) · [1280×720 master archive](https://ark-whachat.fural.space/houdini-flame-fan/master-1280x720.zip) · [English pipeline and 3D integration notes](https://ark-whachat.fural.space/houdini-flame-fan/evidence/README.md) · [PC-FATAN batch evidence](https://ark-whachat.fural.space/houdini-flame-fan/evidence/device-batch.json) · [Atlas validation](https://ark-whachat.fural.space/houdini-flame-fan/evidence/atlas-validation.json).

The source supports Lv1–Lv5, range, fan angle, intensity, duration, seed and vertical offset. It retains the approved 108° footprint, per-level range growth and two-thirds forward visual reach. Raw pivot is (0.20, 0.35). The effect is shifted upward by 15% with the bottom 20% reserved; raw watermarks are retained. The proposed crop rectangle is metadata only. Experimental normal-blend atlases explicitly increase coverage alpha by 16 in the top 80%; raw masters and watermark pixels remain untouched.

Mobile atlas memory is 8.19 MiB per active level; desktop inspection uses 32.19 MiB. The player loads one level/tier and unloads old sources. Every visible label and control is English and rendered in Pixi. Local desktop/phone viewport checks passed all levels and playback; these are browser checks, not physical-device GPU benchmarks.

For a 3D game, animate the atlas on a registered transparent quad with correct world scale, camera alignment, sorting/depth testing and soft intersections as appropriate. This canonical east-view bake is not a freely viewable volume. Arkodia additionally needs its existing projection, wall clipping and object mask. The separate preview does not prove game integration. Burn Soil timing is metadata only and its tick damage remains unset.

[Generator source](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=tools%2Fhoudini-flame-fan%2Fbuild.py) · [Complete implementation notes](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fhoudini-flame-fan%2FREADME.md).

### Render and player evidence

![Experimental evidence — master-lv5-frame09.png](https://ark-whachat.fural.space/houdini-flame-fan/evidence/master-lv5-frame09.png)

![Experimental evidence — local-1440.png](https://ark-whachat.fural.space/houdini-flame-fan/evidence/local-1440.png)

![Experimental evidence — local-390.png](https://ark-whachat.fural.space/houdini-flame-fan/evidence/local-390.png)

![Experimental evidence — local-320.png](https://ark-whachat.fural.space/houdini-flame-fan/evidence/local-320.png)

### Diagnostic images shared during development

These earlier blank, overexposed, undersampled and small-frame experiments are retained for traceability. They are not successful game art.

![Superseded diagnostic — initial-blank](https://ark-whachat.fural.space/houdini-flame-fan/evidence/diagnostics/initial-blank.png)

![Superseded diagnostic — preview-envelope](https://ark-whachat.fural.space/houdini-flame-fan/evidence/diagnostics/preview-envelope.png)

![Superseded diagnostic — preview-final](https://ark-whachat.fural.space/houdini-flame-fan/evidence/diagnostics/preview-final.png)

![Superseded diagnostic — preview-frame-v2](https://ark-whachat.fural.space/houdini-flame-fan/evidence/diagnostics/preview-frame-v2.png)

![Superseded diagnostic — preview-frame](https://ark-whachat.fural.space/houdini-flame-fan/evidence/diagnostics/preview-frame.png)

![Superseded diagnostic — preview-offset](https://ark-whachat.fural.space/houdini-flame-fan/evidence/diagnostics/preview-offset.png)

![Superseded diagnostic — square-diagnostic](https://ark-whachat.fural.space/houdini-flame-fan/evidence/diagnostics/square-diagnostic.png)

![Superseded diagnostic — test-bind](https://ark-whachat.fural.space/houdini-flame-fan/evidence/diagnostics/test-bind.png)

![Superseded diagnostic — test-exposure](https://ark-whachat.fural.space/houdini-flame-fan/evidence/diagnostics/test-exposure.png)

![Superseded diagnostic — test-material](https://ark-whachat.fural.space/houdini-flame-fan/evidence/diagnostics/test-material.png)

![Superseded diagnostic — wide-preview](https://ark-whachat.fural.space/houdini-flame-fan/evidence/diagnostics/wide-preview.png)

