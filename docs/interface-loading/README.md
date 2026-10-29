## Interface and font loading

Startup previously reported 14% before awaiting every HUD texture and MSDF font atlas, then reported 18% only after all had finished. Mobile HUD textures also started after the standard frames finished. Artwork started its own range at zero, leaving another apparent pause until it caught up.

The loader now counts completed interface textures and fully loaded font atlases (including their texture dependencies). It shows both counts, advances through 14–32%, and continues artwork byte progress through 32–92%. Both HUD texture sets and their manifests start in parallel. Failed resources still reach the existing error/retry screen; unfinished resources are never counted as ready.

Run `npm run build` and `node scripts/verify-interface-loading.mjs`. The browser test delays interface/font requests, checks multiple intermediate percentage updates and visible resource counts, checks monotonic progress into artwork, and waits for the playable canvas without JavaScript errors. Set `VERIFY_URL` and `REPORT` for live verification. This is completed-resource progress, not a download-speed estimate; an individual slow resource can still take time.
