## Material companion and receiver encoding

The baked brazier combines metal, charred wood, flame and glow in one RGBA source. Its physical companion uses authored source-camera polygons intersected with the original alpha. The complementary emissive companion has alpha `original − physical`; all 531,335 decoded pixels partition exactly, and both outputs retain the source RGB. No brightness determines height or material classification. The authored segmentation and the existing folded height proxy are approximations, especially at small mixed edges; this is not measured internal geometry or spectral emission reconstruction.

The unchanged game sprite supplies displayed color and silhouette. Only the physical companion alpha is additionally sampled on the CPU, at the same source frame, logical size, pivot and sample grid. `E = clamp(1 − physicalAlpha / originalAlpha, 0, 1)` is the source-cell emissive fraction. The physical image is loaded only when the legacy brazier is present, with its SHA in the URL; it never becomes an additional GPU texture or sprite.

The worker record remains 18 floats. Flag bits 0/1 retain cast/receive; bits 8–15 carry the quantized emissive fraction. The light-field caster coverage becomes `originalAlpha × (1 − E)`. Completely emissive cells produce no depth/owner writes, so they cannot erase an opaque caster behind them.

Only the static receiver map changes its alpha interpretation: `R = 255 − round(127 × E × sourceAlpha)`, where sourceAlpha is normalized. Thus 255 is ordinary lit response and 128 is fully emissive response. RGB still packs the same 12-bit owner and 12-bit half-world-pixel height. Receiver alpha is a response channel, not premultiplied color or source coverage. Pixel-center receiver rasterization remains unchanged. A partial emissive fringe below source alpha 0.5 writes ground height zero, retaining the underlying ground shadow rather than inventing a tall opaque receiver.

The scene filter scales shadow strength by `1 − (255 − R)/127`, with no emission response outside receiver coverage. Dynamic height replacement restores ordinary response for the replacing dynamic surface. Actor camera-height tiles retain their own alpha semantics. This is scalar response for a composed static pixel, not exact separation of differently colored subpixel materials or additional transparent depth layers.

## Validation

- Source/companion/rules SHA-256, dimensions and all decoded RGB/alpha values checked; 20 semantic metal/wood/fire/glow probes pass.
- 36 production Worker/filter controls cover opaque and 64/255 alpha, both mirrors and three suns. Metal receives, fire response remains emissive, mixed response interpolates, and transparent glow retains ground shadow. Independent CPU ground-cast coverage controls also pass.
- The actual legacy brazier passes three sun cast and metal receiver controls; source/physical/emissive and GPU plates were directly inspected.
- Full 314-variant static regression passes all 942 sun/receiver cases. All 313 non-brazier picture regions remain identical to `7eb83725`: 61,538,304 RGB/alpha pixel comparisons, no changes. Nine previous solid models, original art and collision/map definitions remain unchanged.

Canvas uses its legacy projection and does not implement this material response. Particle planes retain their documented unlit presentation path. These software-GPU controls do not establish native-device performance.

## Delivered image sizes

The first legacy live run exposed a pre-existing registration failure: the Go delivery policy resizes crate from 619×640 to 256×265 (and barrel similarly), while the solid companion guard demanded authored dimensions. Full-image court geometry is expressed in normalized UVs, so uniform downscaling with rounded decoded height preserves registration. The guard now accepts that full-image case while retaining strict atlas/subframe checks and rejecting nonuniform, oversized or wrong-frame inputs. Logical sprite height follows the image actually drawn.

The source delivery audit checks all 43 unique inventory raster URLs. Eighteen are uniformly downscaled full images; no source-pixel frame table is resized. Native-size alpha is preserved, and raw authored bytes match the repository. Authored-source GPU plates and delivered-source live controls remain distinct evidence; they are not falsely equated pixel-for-pixel.
