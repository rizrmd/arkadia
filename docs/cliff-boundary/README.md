## Status

Draft implementation; not deployed or accepted. Task zvjcirtiepnkiphromouebju.

The original west-terrace screenshot was downloaded from discussion attachment DAe06780879164f7cca906791f. Baselines match the coherent natural-hill artwork. Hill height contained artificial +1 meter shoulder rises, and collision used only center-point height changes.

The draft removes those artificial rises, checks a 9 x 4.5 world-pixel foot ellipse against a normalized snow-surface contour of the rendered core atlas (mirrored for the west terrace), and sweeps cliff movement at 4 pixel intervals. Solo navigation, auto-walk, client prediction, and authoritative Go navigation use these rules. No UI changes.

## Verification

- TypeScript check passed.
- Go `go test ./...` passed, including existing ramp/court/authority regressions.
- 7,290 dense client/server foot-contour samples agree.
- Sixteen movement directions from four summit/ramp positions stay within the surface; long steps cannot tunnel across the ridge.
- Desktop browser reached gameplay and completed terrace-back (5.5,25 to 4.01,23.51) and terrace-front (5.5,25 to 6.05,25.55) input cases. `after/desktop-terrace-back.png` is the revised contour capture.
- Browser run exceeded its 500 second command limit before completing ridge/mobile cases. Earlier screenshot attempts timed out, and an earlier context reuse failed with a closed browser. These attempts are not acceptance evidence.

## Remaining

Complete desktop/mobile real-input checks, inspect all edge/corner visuals, confirm the hand-traced contour preserves every intended trail, review invalid saved-position recovery, run the supported full game build/deployment under the shared release lock, verify public release, and update Knowledge with accepted release evidence. Keep peer persistence and BGM work intact. Do not deploy this draft as accepted.

## Commands

`node scripts/cliff-boundary/parity.mjs` regenerates the height golden and collision parity samples. `ONLY=desktop node scripts/cliff-boundary/browser.mjs` runs the pending browser harness; use `ONLY=mobile` for the touch viewport. The harness currently takes too long under software rendering and needs a shorter bounded simulation/capture strategy.
