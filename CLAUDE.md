# Ту-95 Bear: notes for Claude Code

Owner: Harris Khalid (@harrisbasra). The game, its name and the @harrisbasra™ branding are his.

## Commits and pull requests
- Commit as the repo owner. **Never add `Co-Authored-By`, `Generated with Claude Code`, `Claude-Session` or any other AI attribution** to commits, PRs, code comments or docs.
- `.claude/settings.json` turns attribution off, and `scripts/hooks/commit-msg` strips it as a backstop. Run `npm run setup` once per clone to enable the hook.
- Push straight to `main` unless asked otherwise. GitHub Pages deploys on every push.
- Write in plain British-leaning English, sentence case, no em-dash pileups, matching the existing README tone.

## Layout
- `index.html`: the 2D game, one self-contained file (no build step).
- `3d/index.html`: the 3D game at Lahore, **generated** from `3d/src/*`. Edit the sources, then run `npm run build:3d`. Never hand-edit `3d/index.html`.
  - Files are joined in the order listed in `PARTS` in `scripts/build-3d.mjs`, inside one closure. Top-level `const`s are only usable by later files (function declarations are hoisted).
  - `shell.html` markup and CSS; `b_core.js` geography, runway survey data, military specs, units; `c_models.js` procedural bombers/transports; `c_airliners.js` airliner specs and builder; `d_world.js` sky, terrain, runways, city, landmarks; `d_opla_osm.js` generated OSM airport data (ODbL, regenerate with `scripts/osm-airport.mjs`); `d_airport.js` taxiways, aprons, buildings, parked aircraft; `e_physics.js` flight model (`prepSpec` derives lift from published Vref); `e_autopilot.js` autopilot/autoland; `f_game.js` missions, effects, cameras; `g_cockpit.js` 3D cockpits; `g_pad.js` gamepad, rumble, DualSense WebHID; `g_ui.js` HUD, audio, input, cloud saves, menus, main loop.
  - Uses three.js r128 from cdnjs (pinned). World axes: x east, y up, z south; origin is the OPLA reference point (31.5216 N, 74.4036 E), ground at 217 m MSL. Aircraft local axes: x forward, y up, z right.
  - `window.__bear3d` exposes the game for scripted testing (headless autopilot runs).
- `3d/firebase-config.js`: `window.TU95_FIREBASE` web config, or `null` for browser-only saves. `firestore.rules` allows each signed-in user only `pilots/{uid}` with `name` (≤24 chars), `progress`, `updatedAt`. Setup guide: `docs/FIREBASE.md`.
- `scripts/check.mjs` (CI): parses both games' scripts and fails if `3d/index.html` is out of date with `3d/src`.

## Commands
- `npm run setup`: enable the commit-msg hook.
- `npm run build:3d`: rebuild the 3D game.
- `npm run check`: what CI runs. Must pass before every push.
- `npm start`: serve locally at http://localhost:8080 (3D at /3d/).

## Accuracy rules
- Real-world data (runway thresholds, lengths, elevations, aircraft facts) must come from published sources; say in the UI/README when something is simplified or approximate.
- No real airline liveries or manufacturer logos. Aircraft and landmark names are used descriptively only.
- Fly-test changes to physics with `MISSIONS=1,2,5,6 python3 scripts/flytest.py` (needs `npm start` running, Python Playwright and Google Chrome) for every aircraft before shipping. All must pass.
- OSM-derived data must keep the "© OpenStreetMap contributors" credit (checked by `npm run check`).

## Roadmap (agreed with Harris)
1. ✅ 3D Lahore: runways from survey data, city and landmarks, six aircraft, chase/cockpit/tower cameras, assists, six missions, pilot names, optional Firebase saves.
2. ✅ Airliners (737-800, 747-400, 777-300ER, 787-9, A320, A350-900, A380-800, invented house paint), 3D glass and classic cockpits, autopilot with autoland, hangar categories, controllers (DualSense over WebHID), OPLA rebuilt from OSM, 2D/3D version setting.
3. More airports with real runway data (Islamabad, Karachi, Dubai, London Heathrow, New York JFK, Istanbul, Jeddah) and a world map with time-accelerated cruise; load one airport region at a time.
4. Career mode: pilot profile, charter and airline jobs, pay by distance, load, punctuality and landing quality; fuel, landing fees and maintenance costs; buying or leasing aircraft; loans; an in-game bank account with statements. Virtual currency only.
5. Cloud saves for all of the above through Firebase (Google sign-in already wired).
As the project grows, split `3d/` into ES modules and a small build step if the single file gets unwieldy.
