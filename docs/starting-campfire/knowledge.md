## Concept preview

Approved by the human on 29 October 2026: “ok, genimg lalu terapkan ke task”. A modest campfire marks the player spawn point inside the snowy starter boundary. A rough stone fire ring, burning logs and a small thawed patch create a readable warm focal point. Keep clear walkable space beside the fire for spawning. No tent or elaborate central structure appears in this concept.

![Starting campfire player spawn concept](/api/rooms/DR2d49ace0025f66084af0c78a/attachments/DA86ed81e8f043d9ca230c81e4)

## Reference

The supplied reference establishes the snowy mountain setting, low rough stone boundary, wooden gate and isometric view.

![Supplied starter boundary reference](/api/rooms/DR2d49ace0025f66084af0c78a/attachments/DA624093133bf5c4f0561fac4b)

## Generation

Created using the built-in imagegen tool and imagegen skill. Prompt: Paint an isometric fantasy survival starter enclosure matching the supplied snowy boundary reference, with a small simple campfire as the central player spawn landmark, one traveler beside it for scale, open playable ground, rough stone ring, burning logs, light smoke and melted snow. Cold mountain scenery with warm orange firelight. No tent, ornate pedestal, magical crystal or developed buildings. Include a campfire detail inset and English title “STARTING CAMPFIRE”.

Implementation is underway. The level-1 starting landmark will use the approved campfire; higher Stronghold Core progression and saved resources remain intact.

## Generated runtime asset

![Generated transparent starting campfire raster sprite](/api/rooms/DR2d49ace0025f66084af0c78a/attachments/DA01623422b85ac7fba0a49ee7)

Built-in imagegen generated a single transparent RGBA raster sprite using the approved concept as reference. Prompt: isolate the modest rough gray stone fire ring, burning split logs, small warm orange flame, short smoke and irregular thawed earth patch with snowy edges; hand-painted Arkadia style, orthographic 2:1 isometric ground, generous transparent padding. No traveler, tent, lavish core, buildings, wall, scenery, crystal, text or 3D model. Original alpha is retained.


## Local functional validation

Fresh level-1 saves load the campfire. A saved level-12 Core retains level-10 milestone artwork plus repair decals, Gold, expedition level, defense choice and rewarded runs. Both cases walk from (590, 420) toward the gate without collision. No JavaScript page errors occurred.

![Local campfire spawn before shadow-material polish](/api/rooms/DR2d49ace0025f66084af0c78a/attachments/DA513c2359ba41950832a4bd73)

The first screenshot exposed a ground-decal shadow issue: the whole snowy patch was interpreted as an upright object. The final material treats this sprite as ground for depth-shadow purposes, retaining the stone-ring collision and emissive fire light.


![Local corrected campfire shadow material](/api/rooms/DR2d49ace0025f66084af0c78a/attachments/DA761b424065f40bc4dc2d8857)

![Existing level-12 Core preserved](/api/rooms/DR2d49ace0025f66084af0c78a/attachments/DA463019470fb3e10dcd532c3a)

The corrected local capture also includes another active task’s uncommitted boundary preview; that peer work is excluded from this task’s release until its own approved commit is available. The final production capture below is the release evidence. TypeScript and all Go server packages pass. Server/client navigation retains all unrelated columns and replaces only 85 old Core columns with 27 stone-ring columns.
