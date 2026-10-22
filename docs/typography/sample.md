## Rendering sample

This runnable sample uses live DOM labels and Canvas 2D critical-hit numerals with the existing Georgia serif. It has no new dependencies and does not change the game HUD. The background is the original human reference; the foreground text, plates, health fill and sample controls are browser-rendered. Any faint text at the edge of the background belongs to the original screenshot.

The lighting follows the reference's warm upper-left highlights, ivory text, bronze lower shade, dark lower edges and restrained shadows. Dark plates protect small labels. Gradients are reserved for the display specimen and larger critical number; normal HUD text remains solid ivory. Day/night presets change the backdrop exposure while HUD lighting remains stable, as an overlay should. These presets demonstrate composition, not a physically simulated torch-light system.

## Desktop daylight

![Desktop daylight typography rendering sample](/api/rooms/DR301ca66e2d62a33fd39f4c7c/attachments/DA8b09a765e5bf553db7af5ce4)

## Mobile torch night

![Mobile night typography rendering sample](/api/rooms/DR301ca66e2d62a33fd39f4c7c/attachments/DAa39edfb4c3f0402fc3ea5c69)

## Run and reuse

Run `python3 -m http.server 3047 --bind 127.0.0.1 --directory public` from the repository, then open `http://127.0.0.1:3047/typography/` locally. Alternatively open the HTML file directly with its adjacent CSS, JavaScript and reference image intact. Use the health slider to verify dynamic values and the buttons to compare daylight/night.

- [Runnable HTML](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ftypography%2Findex.html)
- [CSS colour, highlight and shade recipe](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ftypography%2Fsample.css)
- [Canvas and interactive controls](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ftypography%2Fsample.js)
- [Original reference file](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ftypography%2Freference.png)
- [Desktop night capture](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ftypography%2Fdesktop-night.png)
- [Mobile daylight capture](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ftypography%2Fmobile-day.png)
- [Browser verification report](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Ftypography%2Fsample-verification.json)

## Verified behaviour

Chromium browser checks passed at desktop 1440×1000 / DPR 1 and mobile 390×1100 / DPR 3, both in daylight and night modes. Checks cover live health changes, mode controls, no horizontal page overflow, skill-name boxes fitting their text (allowing one pixel of CSS metric rounding), minimum 16px skill names and no page JavaScript errors. All four screenshots were saved. Desktop and mobile captures were also inspected visually. `npm run build` passed, including strict TypeScript checking and Vite production output; the sample resources are copied into `dist/typography`.

To repeat browser checks, keep the local HTTP server above running and execute `node scripts/verify-typography-sample.mjs` in another terminal. The screenshot files and report are regenerated.

This verifies the standalone recipe and compatibility with build tooling. Full gameplay integration, accessibility at 200% scaling, real device performance and measured contrast across actual combat states remain the parent design's implementation acceptance checks.
