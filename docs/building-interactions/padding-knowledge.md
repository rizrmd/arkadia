## Inner top padding

All six building upgrade frames retain the approved **0.75 outer scale and dimensions**. Titles move inward by 20 logical design pixels, level lines by 14, and dividers by 12. Portraits are inset and reduced proportionally to leave clear space above and below. First requirement/resource rows are rebalanced within the existing body. Title fonts keep their original size and proportions. The close glyph and its hit area move together by 20 pixels; action buttons, footer text and target-navigation positions retain their existing placement.

At desktop scale the title moves 15 screen pixels down. On a 390px phone it moves about 10.17 screen pixels down. The frame itself remains 405 pixels wide on desktop and 274.5 pixels wide at that phone viewport.

The following annotation is the human's padding correction reference. Its prior gold button is historical and is not a request to change eligibility behavior.

![Annotated reference — add inner space above the title band](/api/rooms/DR2d49ace0025f66084af0c78a/attachments/DAb61a33e88bc4ef7b28347fc3)

## Padding validation

Native Chromium tests use the actual six Pixi panel modules at desktop and phone sizes, with device pixel ratio 2. Glyph-quad bounds verify title/portrait clearance, separation between title and level, and space before the divider. Physical clicks verify every relocated close hit area, each existing target/return control, and ESC/outside-tap restoration. Lumber's decorative text no longer intercepts its Return to current control. Original eligibility, range boundaries, 0.75 proportional scaling and modal gesture tests continue to pass without page errors.

These are isolated Pixi integration captures with controlled state. The earlier full-world visibility-initialization limit remains documented; the padding change needs no new world initialization path.

[Browser and header-clearance report](https://arkodia.online/building-interactions/browser.json) · [Production verification](https://arkodia.online/building-interactions/production.json)

### Stronghold Core

![Core desktop padding](https://arkodia.online/building-interactions/padding-core-desktop.png)

![Core mobile padding](https://arkodia.online/building-interactions/padding-core-mobile.png)

### Farm

![Farm desktop padding](https://arkodia.online/building-interactions/padding-farm-desktop.png)

![Farm mobile padding](https://arkodia.online/building-interactions/padding-farm-mobile.png)

### Lumber Mill

![Lumber desktop padding](https://arkodia.online/building-interactions/padding-lumber-desktop.png)

![Lumber mobile padding](https://arkodia.online/building-interactions/padding-lumber-mobile.png)

### Kitchen

![Kitchen desktop padding](https://arkodia.online/building-interactions/padding-kitchen-desktop.png)

![Kitchen mobile padding](https://arkodia.online/building-interactions/padding-kitchen-mobile.png)

### Walls

![Walls desktop padding](https://arkodia.online/building-interactions/padding-walls-desktop.png)

![Walls mobile padding](https://arkodia.online/building-interactions/padding-walls-mobile.png)

### Mine

![Mine desktop padding](https://arkodia.online/building-interactions/padding-mine-desktop.png)

![Mine mobile padding](https://arkodia.online/building-interactions/padding-mine-mobile.png)
