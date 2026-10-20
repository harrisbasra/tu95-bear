# Changelog

Notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
