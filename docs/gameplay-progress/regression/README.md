## XP reset after a later deployment

The October 27 player report was correct. An unrelated later `feat/stronghold` release replaced the active game from a branch without the complete-state persistence changes. Its health response had no build identity and its active main bundle lacked the gameplay save guard. The old additive persistence manifest still existed, so checking its URL alone could give a false impression of the active version. See `before.json` and the original player screenshot.

The fix merges the delivered persistence/Pixi Settings/cliff branch with the newest Stronghold HUD changes. The common release publisher requires the shipped persistence baseline and latest recognized applied game release as ancestors before uploading anything. The default deployment also uses the shared lock and tags the Go binary with its commit. This cumulative branch is pushed to the canonical `feat/stronghold` branch so subsequent work begins from the full game.

Browser checks now earn nonzero XP from an actual enemy soul pickup before testing two exact reloads and real persistent-browser shutdown/relaunch. The Pixi Settings pause helper follows the delivered native renderer. A queued offer is omitted from this particular case because the delivered Settings entry intentionally blocks while a blessing is pending; earlier checkpoint and server tests still cover pending offers.

Progress lost during the rollback release cannot be reconstructed if that version overwrote the older economy envelope. Existing surviving checkpoints are restored; this fix never intentionally resets player progress.
