## Isolated preview deployment

Only the named `ember-warden-review` custom sandbox is changed. The gameplay deployment, its loader and its resources are untouched.

A direct full-directory publish failed once with a routed-file EOF, then with a gateway timeout. The incident list showed no new resource kill and the existing preview boot process was still running. The publish script now stages immutable small files through the supported organization home-file transfer command, then uses the normal `sandboxes serve` command for the small review loader. This keeps each request short. No host deployment, tar injection or gameplay overlay is used.

The final deployment receipt lists every source resource and SHA-256. Public playback compares all manifest image bytes, and the final resource verification compares every deployed file, including viewer code, manifest, report and screenshots.
