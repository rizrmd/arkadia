## Supplemental asset review v1

Generated with the built-in image_gen tool, one call per distinct component. Review only: no gameplay, Pixi scene, composition, existing atlas, or previous output changed. Revision 60ef170c is rejected and must not be deployed as an improvement. The earlier composition remains the comparison baseline.

### Audit and count

Original manifest: 30 parts — 6 ground, 6 cracks, 6 flames, 6 smoke, 6 accents. Original atlas DAfcba584e98ce6d1456a9f8e0, target DA239e37bdd088732afed6c968 and earlier output DA3c5f46081632dc0d832fec29 were downloaded and visually inspected. Existing smoke is predominantly rounded gray mass; cracks have broad detached emissive margins. Existing ground/debris/embers already cover their roles, so no additional slabs or particles were generated.

**30 original + 3 new review candidates = 33 parts.** The separately generated rejected plates-v3 component is excluded from that kit count; including that historical rejected file gives 34 physical component assets. None of the three is integrated or production approved.

| Filename | Gap and intended use | Inspection limitation |
| --- | --- | --- |
| smoke-veil-v1.png | Wide asymmetric warm-base bank for sparse base/middle smoke, screen-up | More dense and pale than requested; internal negative space is limited. Requires opacity review. |
| smoke-split-curl-v1.png | Narrow split curl to break rounded-cloud repetition, screen-up | Too tall for the requested low smoke role; faint surrounding haze and warm base resemble a flame. Use only as occasional accent if approved. |
| fire-seam-junction-v1.png | Unequal branching connector, narrow attached char and locally lit edges | More angular than target; baked flames restrict arbitrary rotation. Ground seam alignment still needs a later representative-patch review. |

All outputs contain actual alpha and partially transparent pixels, with no opaque smoke pixels. See alpha-audit.json. Faint nonzero edge pixels remain (veil 335, curl 119, seam 1); clean empty margins are therefore **not fully achieved**. Preserve the generated originals for review; these are not claimed production-ready cutouts. No broad-glow cleanup or repainting was performed. No final scene illustration was generated.

Source prompts are preserved verbatim in prompts.json. Original generated PNGs are versioned in public/flame-fan-supplemental/v1. Asset-only deployment uses a separate URL prefix and shared lock, leaving the fan composition untouched.
