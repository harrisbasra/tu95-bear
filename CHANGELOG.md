# Changelog

Notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
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
