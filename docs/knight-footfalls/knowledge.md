[Play the Stronghold](https://arkadia-custom-whachat.fural.space/) · [Open the before/after animation player](https://arkadia-custom-whachat.fural.space/knight-footfalls/review.html)

## Alternating foot support

Human review found that diagonal and rear walking still looked like hopping. The v4 frames often repeated the same supporting leg. Earlier automated checks covered visibility and registration, but did not establish that the supporting legs alternated.

The corrected cycle uses grounded contact → right-foot swing → grounded contact → left-foot swing. Boot clearance is low, one foot remains planted, and the body stays level. The diagonal and rear step cycle covers 1.6 times the previous ground distance, reducing cadence while movement speed stays the same.

Straight-down walking, the accepted reference, keeps its exact artwork and timing. Attack, hurt and death artwork also retain their exact RGBA pixels.

## Review the movement

The animation player supports pause, normal speed, 40% speed and a cycle scrubber. It shows previous and corrected movement beside each other in all four facings. The final sheet uses three reviewed key poses for each corrected facing; contact is repeated between the opposite swings. This is a compact four-beat cycle rather than eight purportedly different poses repeating one leg.

![Before and after animation player](https://arkadia-custom-whachat.fural.space/knight-footfalls/comparison.png)

![Corrected knight in the mobile game](https://arkadia-custom-whachat.fural.space/knight-footfalls/local-390.png)

## Selected imagegen artwork

![Low-clearance diagonal front key poses: contact, right swing, left swing](https://arkadia-custom-whachat.fural.space/knight-footfalls/knight-footfalls-front-v5.png)

![Low-clearance diagonal rear and straight rear key poses](https://arkadia-custom-whachat.fural.space/knight-footfalls/knight-footfalls-rear-v5.png)

The built-in imagegen tool produced these sources. Each facing shares one scale and a grounded baseline. Nine poses are appended to the original atlas; unused v4 rows remain for reproducibility. The game now has 57 unique knight frames. [Exact prompts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fknight-footfalls%2Fprompts.json) · [Packing and verification notes](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fknight-footfalls%2FREADME.md)

## Verification

Production build and local browser checks passed against a clean committed release. Checks inspect actual boot pixels to establish that the lower supporting foot switches screen sides, supporting soles remain on the ground line, and crown movement stays within two atlas pixels. They also verify transparent cell borders, clip indices, atlas revision, exact preservation of down-facing and combat artwork, desktop/mobile direction selection and successful combat without browser errors.

These checks establish those invariants. Naturalness remains a visual judgement, made easier to inspect with the comparison player.

[Verification script](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fverify-knight.mjs) · [Local report](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fknight-footfalls%2Flocal.json)

## Generation attempts

These six discarded images record why checking the actual leg poses matters. The early sheets still repeated one leg; later keys established opposing support but lifted the knees too high. They are reference evidence and are not loaded by the game.

![Rejected full gait with repeated legs](https://arkadia-custom-whachat.fural.space/knight-footfalls/attempts/01-repeated-gait.png)

![Rejected front cycle with repeated legs](https://arkadia-custom-whachat.fural.space/knight-footfalls/attempts/02-repeated-front.png)

![Rejected contact comparison](https://arkadia-custom-whachat.fural.space/knight-footfalls/attempts/03-contact-pair.png)

![Front key poses before reducing the raised sole height](https://arkadia-custom-whachat.fural.space/knight-footfalls/attempts/04-front-keys-high.png)

![Rejected eight-frame extension repeating one side](https://arkadia-custom-whachat.fural.space/knight-footfalls/attempts/05-repeated-eight.png)

![Rear key poses before reducing the raised sole height](https://arkadia-custom-whachat.fural.space/knight-footfalls/attempts/06-rear-keys-high.png)


## Live release

Deployed atlas revision: `a2750639f0e49585`. The live desktop/mobile browser checks passed, including alternating boot pixels, grounded support, six input direction cases, combat and no page errors. [Live report](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fknight-footfalls%2Flive.json).
