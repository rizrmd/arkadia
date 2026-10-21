## Reproduction

The renderer requires the existing home-installed bpy 4.5.3 environment and Pillow. Its pinned library setup is documented in the original repository renderer setup scripts. Node dependencies are the repository's existing Sharp and Playwright packages. The renderer uses CPU Cycles at eight samples with denoising, fixed lights and a fixed orthographic camera.

1. `scripts/ember-warden/render-all.sh` renders all nine body animation families from the isolated identity. It writes four sheets per family, with two facings per sheet, and per-frame source receipts.
2. `scripts/ember-warden/blender.sh scripts/ember-warden/audit-source.py` evaluates neutral endpoints, planted feet, floor clearance and death's held terminal pose from the source.
3. `node scripts/ember-warden/assemble.mjs` packs the manifest, creates the separate deterministic VFX sheets, and audits alpha coverage, clipping, endpoints and frame-sampled contacts.
4. `node scripts/ember-warden/report.mjs` prepares the English QA document. `node scripts/ember-warden/verify.mjs` runs actual local normal/slow playback, both idle/run transition paths and full frame scrubbing. Screenshots are saved in the public evidence folder.
5. `node scripts/ember-warden/report.mjs` updates the report with local evidence. `node scripts/ember-warden/publish.mjs` publishes only this task's review directory to its own named custom sandbox, without touching the gameplay deployment.
6. `DEMO_URL=https://ember-warden-review-whachat.fural.space node scripts/ember-warden/verify.mjs` repeats browser verification publicly and compares every manifest image resource to SHA-256.
7. Update the report, publish the final evidence directory again, then run `node scripts/ember-warden/verify-resources.mjs` to compare every deployed file against the final deployment receipt.
8. `node scripts/ember-warden/publish-knowledge.mjs` embeds all body/VFX sheets and playback screenshots in the existing English Characters hierarchy. The generated material is embedded separately on the Sources page. Commit and push only the three Ember Warden directories.

The first source checkpoint and a second checkpoint differ solely by a corrected death-floor clamp. `source-revisions.json` explicitly records both accepted hashes; this is a motion correction on one model identity. A fresh full render uses only the corrected revision. The assembler rejects unknown source revisions, so intentional source changes require a reviewed revision-receipt update.

Do not run two renderer jobs concurrently: the controlled export currently uses a single temporary frame path. The viewer loads only the selected action and transition dependencies, trimming logical margins into canvas frame crops. It preserves pivot offsets, supports browsers without ImageBitmap, releases unrelated clips, and shows per-sheet progress and Retry errors. Sheets retain the full common grid for external tools.
