## Opening soundtrack

The supplied opening MP3 is bundled into the actual Stronghold game and played through the existing Pixi Sound engine. Music begins after a user gesture, loops once, and follows the existing Music volume setting independently of sound effects. Hidden tabs stop the loop; returning resumes it after audio unlock. No HTML controls are added.

`node scripts/bgm/verify.mjs` verifies desktop and mobile gesture unlock, duplicate suppression, independent volume/mute, visibility, and disposal. The browser binary must have the HOME-only runtime prepared by the organization setup script. Evidence: local-verification.json.

After `npm run build`, run `node scripts/bgm/publish.mjs` while holding the standard deployment lock. This publishes a frontend-only game release through the existing release publisher, retaining the game server and public artwork. The publisher enforces shipped ancestry and applies the release through the gateway. `/bgm/release.json` records exact client hashes.
