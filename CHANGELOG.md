# Changelog

Notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **Map data for Istanbul and Jeddah:** both now have their real OpenStreetMap taxiways, aprons, stands and terminals.
- **Cloud saves for everything:**
  - **What syncs:** the pilot profile, career, fleet, loans, monthly summaries and every bank transaction sync to Firestore (`pilots/{uid}`, with transactions in `pilots/{uid}/tx`).
  - **Offline:** it works offline and syncs on reconnect.
  - **Signing in:** stars merge on sign-in, and the newer career wins with the other kept as a backup.
- **Firestore rules** check field types and sizes and keep each pilot to their own data. They reject impossible balances, implausible jumps between saves and flight hours going backwards, and make transactions append-only.
- **A composite index** for loading transactions.
- **Tests:** `npm run test:rules` (19 rule checks in the emulator) and `npm run test:cloud` (end-to-end sync, restore and offline tests with the game's own code).

## Stage 4

### Added
- **Career mode in the 3D game:**
  - **Profile:** pilot profile and ranks, plus a home base.
  - **Jobs:** daily passenger and cargo jobs at every airport, paid by distance and load, with on-time and landing-quality bonuses and penalties.
  - **Costs:** real fuel burn, landing fees, crew, maintenance and wear, overspeed fines, diversions and hull losses.
  - **Fleet:** leasing, buying new or used, selling and maintenance checks.
  - **Bank:** a bank account with a statement, loans and monthly summaries.
  - **Virtual credits only.** Every economy setting is in one `ECON` object.
- **Career fly-tests:** `CAREER=n python3 scripts/flytest.py` flies n consecutive career jobs.

## Stage 3

### Added
- **Seven more airports in the 3D game:** Islamabad, Karachi, Dubai, London Heathrow, New York JFK, Istanbul and Jeddah, with Lahore as home base.
  - **Runways:** real runway data from OurAirports, including displaced thresholds.
  - **Layouts:** OpenStreetMap layouts where available.
  - **Surroundings:** per-region cities, coasts, rivers, hills, visibility and simplified landmarks.
- **A world map and flight planner:**
  - **Planning:** pick a departure and destination; the planner chooses the runways, cruise level, fuel and payload, and warns when a route is beyond the aircraft's range.
- **Flights between airports:**
  - **Navigation:** NAV and VNAV autopilot modes, a VNAV descent that holds speed with the speedbrake.
  - **Long cruises:** time acceleration up to ×32, and a skip to the descent that burns the right fuel.
  - **Local flights:** fly out and back to the same airport.
- **Airport loading:** airports load one region at a time; their map data lives in `3d/data` and loads on demand.
- **Tools:** `scripts/world-map.mjs`, and route tests in `scripts/flytest.py` (`ROUTES=OPLA:OPIS,…`).

### Changed
- **Indicated airspeed:** speeds are now indicated airspeed everywhere, so approach speeds stay right at high airports.
- **Airport collisions:** airport buildings and parked aircraft collide by their own footprints. Their heights respect the runway obstacle surfaces.
- **Autopilot:** glide-path tracking is tighter.

### Fixed
- **PAPI guide:** the approach guide showed "Too high" while exactly on the glide path.
- **Approach mode:** it could capture the reciprocal runway's localiser on a planned flight.

## Stage 2

### Added
- **Seven airliners** in the 3D game: Boeing 737-800, 747-400, 777-300ER and 787-9, and Airbus A320, A350-900 and A380-800.
  - **Published data:** weights, wing areas, thrust, spans, speeds and flap detents come from published sources.
  - **Shapes:** each has its own wingtip, real bogie layouts (including body gear) and an invented house colour scheme.
- **3D cockpits** built as real geometry.
  - **Glass cockpits** for the airliners: live PFD, ND and engine displays, a clickable MCP or FCU, an overhead panel, a moving yoke or sidestick, and thrust, flap, speedbrake and gear levers.
  - **Classic gauge panels** for the bombers and transports.
  - **Free look** with mouse or touch.
- **Autopilot and autothrottle** with heading, altitude and speed hold. Approach mode captures the localiser and glide path and lands automatically (flare, retard, rollout, autobrake and reverse thrust).
- **An autoland mission** on runway 36R.
- **Controller support** through the Gamepad API, with rumble. In Chrome and Edge a DualSense can also connect over WebHID for its lightbar, player LEDs, mute LED and adaptive triggers.
- **A hangar with two categories** (bombers and transports, airliners) and 3D thumbnails.
- **A 2D or 3D version setting** on both menus, remembered between visits.
- **Settings:** a graphics quality setting (low, medium, high) and an aviation-units option (knots and feet).
- **Flight model:** spoilers, ground spoilers, reverse thrust, rudder steering at speed, ISA atmosphere, engine-type thrust lapse and realistic fuel burn.
- `scripts/osm-airport.mjs`, which turns OpenStreetMap data into airport map data, and `scripts/flytest.py`, a headless autopilot fly-test.

### Changed
- **Lahore airport is rebuilt from OpenStreetMap:**
  - The main terminal now stands on the east side, where it really is, with an arched facade (simplified).
  - The real taxiways, aprons, stands and jet bridges, and the footprints of about 2,500 buildings around the field, are in place, with airliners parked on the stands.
  - Map data © OpenStreetMap contributors (ODbL).
- **Real weights and calibrated lift:**
  - The bombers and transports now use their real weights, wing areas and thrust.
  - Lift is calibrated from published approach speeds and realistic lift-off and approach attitudes.
  - Weight falls as fuel burns.
- **Flaps use each aircraft's real detents:** <kbd>F</kbd> extends one notch, <kbd>V</kbd> retracts one.
- **Mission stars are stored by mission rather than by position.** Existing saves are migrated.
- **Flight assist** now prevents tail strikes on rotation, and **landing assist** removes the crosswind crab just before touchdown.
- **Crash messages** explain how to avoid the mistake next time.

### Fixed
- **Crosswind touchdowns no longer drift.** The sideslip side force was about 20 times too strong.
- **The procedural city now fills the area round the airport.** It used to stop at its building budget before it got there.

### Added (first 3D release)
- **3D version (beta)** at `/3d/`, set at Allama Iqbal International Airport, Lahore, with both runways from survey data, full runway lighting and PAPIs, a simplified city with Minar-e-Pakistan, Badshahi Mosque and Lahore Fort, and the Ravi river.
- 3D flight model with banking, sideslip, ground effect, crosswind and nose-wheel steering, plus optional flight and landing assists.
- Chase, cockpit and tower cameras; attitude indicator, compass with runway course, glide-path and centreline guidance; radar map.
- Six 3D missions: free flight, departure, straight-in, the Lahore circuit, an Old City flypast and a night crosswind arrival.
- Pilot names and optional Firebase cloud saves (Google sign-in), with Firestore security rules and a setup guide in `docs/FIREBASE.md`.
- `npm run build:3d`, and CI checks for both games.
- A **Fly in 3D** button on the 2D menu.
- Open-source project setup: README, contributing guide, code of conduct, issue and PR templates, CI and GitHub Pages deployment.

## [1.0.0] - 2026-10-19

### Added
- First public release.
- Eight missions: First takeoff, Ferry flight, Valley run, Bombing range, Thirsty bird, Supply drop, Silent engines and Last flight.
- Six aircraft: Tu-95MS, C-130J, C-17A, B-52H, B-1B and Tu-160.
- Touch controls, synthesised audio, star ratings and saved progress.
