## Result

The desktop top-right HUD and minimap now share one responsive column: the same width, a 20 px right inset, a 16 px top inset, and an 8 px gap. The column is capped at 260 px and contracts on shorter screens. Gold, Time, location and FPS have tighter vertical spacing. Timer popovers follow the new screen position. Returning from mobile restores desktop text scale.

## Reported desktop layout

![Original desktop layout with mismatched HUD and minimap widths](/api/rooms/DR2acdbf9c7c4af10516c89541/attachments/DA4d12ad60c0df540e56d44494)

## Verified desktop layout

![Aligned desktop HUD and minimap at 1440 by 900](/api/rooms/DR2acdbf9c7c4af10516c89541/attachments/DA7cf2e0bf163f19e430329ee8)

## Verification

Production build passed. Browser checks passed at 1440×900, 1920×1080, 1470×583, 1024×768, 390×844 and 844×390, including mobile-to-desktop resizing and a seven-digit gold balance. Checks cover actual HUD bounds, column alignment, map visibility, viewport bounds, restored text scale and browser errors. Browser layout checks use the 2D hero fallback to reduce software-renderer load; hero rendering is unchanged.
