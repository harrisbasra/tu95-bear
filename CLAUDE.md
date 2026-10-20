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
  - `shell.html` markup and CSS; `b_core.js` geography, runway survey data, aircraft specs; `c_models.js` procedural aircraft; `d_world.js` sky, terrain, airport, city, landmarks; `e_physics.js` 3D flight model and touchdown checks; `f_game.js` missions, rings, effects, cameras; `g_ui.js` instrument panel, radar, audio, input, Firebase cloud saves, menus, main loop.
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
- Fly-test changes to physics with a scripted autopilot (takeoff, approach, landing) for every aircraft before shipping.

## Roadmap (agreed with Harris)
1. ✅ 3D Lahore: runways from survey data, city and landmarks, six aircraft, chase/cockpit/tower cameras, assists, six missions, pilot names, optional Firebase saves.
2. Airliners (737, 747, 777, 787, A320, A350, A380 families, plain or invented paint) and a detailed 3D glass cockpit for them; classic-gauge cockpits for the bombers.
3. More airports with real runway data (Islamabad, Karachi, Dubai, London Heathrow, New York JFK, Istanbul, Jeddah) and a world map with time-accelerated cruise; load one airport region at a time.
4. Career mode: pilot profile, charter and airline jobs, pay by distance, load, punctuality and landing quality; fuel, landing fees and maintenance costs; buying or leasing aircraft; loans; an in-game bank account with statements. Virtual currency only.
5. Cloud saves for all of the above through Firebase (Google sign-in already wired).
As the project grows, split `3d/` into ES modules and a small build step if the single file gets unwieldy.
