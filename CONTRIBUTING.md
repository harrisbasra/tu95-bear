# Contributing to Ту-95 Bear

Thanks for wanting to help! This project is small and has no dependencies, so getting started takes about a minute.

## Ground rules

- Be kind. Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).
- **Keep it in one file.** The game is a single `index.html` with no build step and no runtime dependencies, and we'd like to keep it that way. Please open an issue to discuss before adding libraries, bundlers or extra assets.
- **Keep pull requests focused.** One fix or feature per PR is much easier to review than a combined one.
- **Keep the credits.** Please leave the @harrisbasra credit lines in the UI as they are.

## Getting set up

```bash
git clone https://github.com/<you>/tu95-bear.git
cd tu95-bear
git checkout -b my-change
open index.html     # or: npm start, then visit http://localhost:8080
```

Edit `index.html`, then reload the browser. That's the whole development loop.

Before you push:

```bash
npm run check       # parses the inline script and catches syntax errors
```

Then play the missions your change touches from start to finish.

## Finding something to work on

- Issues labelled [`good first issue`](https://github.com/harrisbasra/tu95-bear/labels/good%20first%20issue) are small and well defined.
- Issues labelled [`help wanted`](https://github.com/harrisbasra/tu95-bear/labels/help%20wanted) are bigger pieces we'd love help with.
- Have your own idea? Open a [feature request](https://github.com/harrisbasra/tu95-bear/issues/new/choose) first so we can agree on the approach before you put time in.

## Code tour

The script inside `index.html` is split into sections marked like this:

```js
/* ---------- missions ---------- */
```

Search for a section name to jump to it. The main ones are `utilities`, `progress`, `audio`, `skies`, `missions`, `terrain`, `physics`, `objects`, `actions`, `camera`, the aircraft drawing sections, `specs`, `render`, `predictions`, `HUD`, `UI`, `input` and `loop`.

### Style

Match the code around you:

- Compact, terse JavaScript in an IIFE with `'use strict'`. Short local names are fine where the surrounding code uses them.
- SI units inside the simulation: metres, seconds, m/s and radians. Convert to km/h or degrees only for display.
- No new globals. Keep everything inside the IIFE.
- Player-facing text is plain, friendly English in short sentences. Look at the existing briefings for the tone.

## Adding a mission

1. Add an object to the `MISSIONS` array in the `missions` section. Copy the closest existing mission and change it. The key fields are:
   - `key`: the mission type. It drives the objectives, scoring and HUD (`takeoff`, `ferry`, `gates`, `bomb`, `tanker`, `drop`, `glide`, `eject`).
   - `name`, `place`, `summary`, `steps`: the text shown in the menu and briefing.
   - `sky`: one of the entries in `SKIES`.
   - `terrain`: `{base, hill, seed}`. Change the seed for a new landscape.
   - `fields`, `zones`, `targets`, `gates`: the world objects.
   - `start`: where you spawn and with what speed, throttle and fuel.
2. If you reuse an existing `key`, that's usually all you need to do. A brand-new mission type also needs code in the objectives/HUD (`case` blocks for the checklist and guidance panel), in star scoring, and in the success check in `mission flow`.
3. Update the missions table in `README.md` and the mission list in `.github/ISSUE_TEMPLATE/bug_report.yml`.
4. Fly it with at least two different aircraft and make sure it can earn three stars.

## Adding an aircraft

1. Write a `drawXxx(ctx, …)` function next to the other aircraft drawing sections, using the helpers in the `aircraft drawing kit`.
2. Add an entry to the specs list in the `specs` section, with:
   - **Facts** (`facts`, `blurb`, `feel`): real public figures, rounded. Please include a source in your PR.
   - **Flight model** (`m`, `S`, `T`, `cd0`, `k`, `cla`, `clmax`, flap values, `vne` …): start from the most similar existing aircraft and tune until it flies believably.
   - **Geometry** (`gear`, `body`, `hull`, `probe`, `bay`, …): contact points in metres relative to the aircraft's origin. These drive touchdown, tail strikes and effects.
3. Check takeoff, landing, a tail strike and every mission type with the new aircraft.
4. Update the README and the bug-report template.

## Working on the 3D game

The 3D game lives in [`3d/src`](3d/src) and is joined into `3d/index.html` by `npm run build:3d`; the README lists what is in each file. Never edit `3d/index.html` by hand.

### Adding a 3D aircraft

- **Military types** go in `AIRCRAFT` in `b_core.js`; **airliners** go in `AIRLINERS` in `c_airliners.js`.
- Use published figures and name the source in your PR: weights (`oew`, `mtow`, `mlw`, `fuelCap`, `payload`), wing area `S`, `span`, total static thrust `T` (plus `power` for turboprops), `vmo`, the flap detents with their limit speeds, and `vrefKt`, the reference approach speed at maximum landing weight.
- The flight model derives its lift coefficients from those numbers (`prepSpec` in `e_physics.js`), so you shouldn't need to hand-tune lift.
- For an airliner, the `geo` block gives the fuselage, wing, engine, tail and gear layout; the tail cone is lengthened automatically to match the published `tailStrike` angle.

### Fly-testing

Changes to the flight model, the autopilot or an aircraft must pass the scripted fly-test for every aircraft before they ship:

```bash
npm start                                   # in one terminal
pip install playwright                      # once; uses your installed Google Chrome
MISSIONS=1,2,5,6 python3 scripts/flytest.py # departure, straight-in, night crosswind, autoland
```

### Airport data from OpenStreetMap

`3d/src/d_opla_osm.js` is generated from OpenStreetMap by `scripts/osm-airport.mjs` (the queries are in its header). OSM data is © OpenStreetMap contributors under the [ODbL](https://opendatacommons.org/licenses/odbl/): keep the credit in the game and the README, and keep the generated file under the ODbL. Improve the map on [openstreetmap.org](https://www.openstreetmap.org/) and regenerate, rather than editing the data file by hand.

## Commit messages

Use short messages in the imperative mood that say what changed:

```
Add Il-76 transport
Fix tail-strike check on bicycle gear
Tune B-1B approach speed
```

## Pull requests

- Fill in the PR template checklist.
- Attach screenshots or a short clip for any visual change.
- Mention which browsers and devices you tested on.
- A maintainer will review your PR. Small requested changes are normal and not a rejection.

By contributing, you agree that your contribution is licensed under the project's [MIT License](LICENSE).
