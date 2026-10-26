## Procedural snow height reconstruction

The three drift families now have source-camera height companions reconstructed from the exact deterministic `ground-kit.mjs` recipe. Replaying all three images reproduces 88,760 RGBA pixels byte for byte. Heights come from the source generator's z-buffer, never image brightness. Its camera is screen = `(gx, gy/2 - z)`; exported pixel density is 4 per world pixel.

The companion reproduces the atlas trim, frame and normalized pivot. Area-weighted physical-alpha depth is stored as UNORM16 height divided by logical frame height. Baked source contact shadow has height zero. Bilinear UV lookup supplies the front of a closed solid reaching ground; original atlas alpha supplies each source cell's silhouette. Placement scale, vertical scale, shear, mirror and lift are applied by the existing source-cell sampler. This reconstructs exported source-camera depth, not hidden detail absent from the recipe export. Atlas resampling and receiver-map texel resolution remain finite.

### Low-relief receiver policy

Only procedural drift samples set packed Worker bit 2 (`4`) for low-height self-owner rejection. The 18-float layout stays unchanged. Receiver alpha byte **127** is reserved for this policy; 128–255 retain material response. Byte 127 is a normally lit receiver, not emissive. Its owner is passed to the shader with a negative sign as an internal policy flag; caster matching uses the absolute ID. Own contributions are rejected for positive heights, including 0.5–2 world pixels. Ground height zero still receives the same object's cast. Other objects retain the existing above-two-pixel policy. Foreign owners still cast onto low relief.

No extra texture, sampler, per-object filter, collision geometry, atlas rewrite or painter reordering is introduced. Old and new static pictures are compared: only 13 drift variants change; all 301 others remain pixel-identical (59,179,008 picture pixels). The full audit covers 314 variants and 942 independent asset receive scenarios. The initial QA helper rejected byte 127 as a nonreceiver; its failure is retained in `drift-static-scoped/first-attempt.json`. Corrected focused tests pass all 39 drift receive cases and reproduce the same 2,555,904 picture pixels exactly.

### Current evidence scope

These are local production renderer/Worker GPU fixtures under SwiftShader. Actual compiled live checks and physical-device performance must be recorded separately before claiming those scopes. Pixel-identical carry-forward does not certify native GPU FPS. The initial global threshold experiment was rejected because it changed 257 variants; only the scoped policy is implemented.
