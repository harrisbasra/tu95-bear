// Converts OpenStreetMap data for an airport into the compact data file the 3D game loads.
//
//   node scripts/osm-airport.mjs <aeroways.json> <buildings.json> <out.js> <ICAO> <refLat> <refLon>
//
// The reference point must match `ref` for the airport in 3d/src/b_airports.js; write the output to 3d/data/<ICAO>.js.
// Both inputs are Overpass API JSON with `out geom` (the same file can be passed twice). For an airport's own area:
//   [out:json];(way["aeroway"="aerodrome"]["icao"="EGLL"];)->.ad;.ad out geom;.ad map_to_area->.a;
//   (way["aeroway"](area.a);node["aeroway"](area.a);way["building"](area.a);rel["building"](area.a););out geom;
// For Lahore, which also includes the neighbourhoods round the airport:
//   [out:json];(way["aeroway"](31.48,74.38,31.56,74.43);node["aeroway"](31.48,74.38,31.56,74.43);rel["aeroway"](31.48,74.38,31.56,74.43););out geom;
//   [out:json];(way["building"](31.495,74.385,31.548,74.425);rel["building"](31.495,74.385,31.548,74.425););out geom;
//
// The output is derived from OpenStreetMap, © OpenStreetMap contributors, and is available under the
// Open Database Licence 1.0 (https://opendatacommons.org/licenses/odbl/). See README.md.
import { readFileSync, writeFileSync } from 'node:fs';

const [, , aeroFile, bldFile, outFile, icao = 'OPLA', refLat = '31.5216', refLon = '74.4036'] = process.argv;
if (!aeroFile || !bldFile || !outFile) {
  console.error('usage: node scripts/osm-airport.mjs <aeroways.json> <buildings.json> <out.js> [ICAO refLat refLon]');
  process.exit(1);
}
const LAT0 = +refLat, LON0 = +refLon;
const MLAT = 111320, MLON = 111320 * Math.cos(LAT0 * Math.PI / 180);
const xy = p => [Math.round((p.lon - LON0) * MLON), Math.round(-(p.lat - LAT0) * MLAT)];

// Douglas-Peucker in metres
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const d = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return Math.abs((p[0] - a[0]) * dz - (p[1] - a[1]) * dx) / l; };
  let idx = 0, max = 0;
  for (let i = 1; i < pts.length - 1; i++) { const v = d(pts[i], pts[0], pts[pts.length - 1]); if (v > max) { max = v; idx = i; } }
  if (max <= tol) return [pts[0], pts[pts.length - 1]];
  return simplify(pts.slice(0, idx + 1), tol).slice(0, -1).concat(simplify(pts.slice(idx), tol));
}
const area = p => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return Math.abs(a / 2); };
const ring = geom => { let p = geom.map(xy); if (p.length > 1 && p[0][0] === p.at(-1)[0] && p[0][1] === p.at(-1)[1]) p = p.slice(0, -1); return p; };
const flat = p => p.flat();
const outers = e => e.type === 'way' ? (e.geometry ? [e.geometry] : []) : (e.members || []).filter(m => m.role === 'outer' && m.geometry).map(m => m.geometry);

const aero = JSON.parse(readFileSync(aeroFile, 'utf8')).elements;
const blds = JSON.parse(readFileSync(bldFile, 'utf8')).elements;

const out = { taxiways: [], aprons: [], stopways: [], stands: [], bridges: [], towers: [], boundary: null, buildings: [] };
for (const e of aero) {
  const t = e.tags || {}, a = t.aeroway;
  if (a === 'taxiway' && e.geometry) out.taxiways.push([t.ref || '', +(t.width || 23), flat(simplify(e.geometry.map(xy), 1.5))]);
  else if (a === 'apron') for (const g of outers(e)) out.aprons.push([t.name || '', flat(simplify(ring(g), 1))]);
  else if (a === 'stopway' && e.geometry) out.stopways.push(flat(e.geometry.map(xy)));
  else if (a === 'jet_bridge' && e.geometry) out.bridges.push(flat(e.geometry.map(xy)));
  else if (a === 'parking_position') {
    if (e.type === 'node') out.stands.push([...xy(e), null, t.ref || '']);
    else if (e.geometry && e.geometry.length > 1) { const a0 = xy(e.geometry[0]), a1 = xy(e.geometry.at(-1)); out.stands.push([...a1, Math.round(Math.atan2(a1[0] - a0[0], -(a1[1] - a0[1])) * 180 / Math.PI), t.ref || '']); }
  } else if (a === 'aerodrome') { const g = outers(e)[0]; if (g && (!out.boundary || g.length * 2 > out.boundary.length)) out.boundary = flat(simplify(ring(g), 3)); }
  if (a === 'control_tower' || (t['tower:type'] === 'air_traffic_control')) { const g = e.type === 'node' ? [e] : outers(e)[0]; if (g && g.length) { let x = 0, z = 0; for (const q of g) { const p = xy(q); x += p[0]; z += p[1]; } out.towers.push([Math.round(x / g.length), Math.round(z / g.length)]); } }
}
// Heights: OSM rarely has them here, so use building:levels where tagged and typical values otherwise.
const H = { house: 7.5, residential: 9, apartments: 16, commercial: 11, retail: 8, hospital: 15, college: 13, school: 10, mosque: 9, stadium: 18, transportation: 20, hangar: 16, industrial: 10, warehouse: 11, roof: 5 };
const KIND = { transportation: 't', hangar: 'h', mosque: 'm', house: 'r', residential: 'r', apartments: 'r' };
for (const e of blds) {
  const t = e.tags || {};
  if (!t.building || t.building === 'roof' && !t.aeroway) continue;
  for (const g of outers(e)) {
    const p = simplify(ring(g), 0.8); if (p.length < 3) continue;
    const A = area(p); if (A < 30) continue;
    let h = t.height ? parseFloat(t.height) : t['building:levels'] ? +t['building:levels'] * 3.2 + 1 : H[t.building] || (A > 3000 ? 14 : A > 800 ? 10 : 7);
    let k = KIND[t.building] || (t.aeroway === 'terminal' ? 't' : t.aeroway === 'hangar' || /hang[ae]r/i.test(t.name || '') ? 'h' : A > 2500 ? 'h' : 'c');
    if (t.aeroway === 'terminal') { k = 't'; if (A > 20000) h = 22; }
    out.buildings.push([Math.round(h * 2) / 2, k, flat(p), (t.name || '').slice(0, 60)]);
  }
}
const js = `
/* ---------- ${icao} map data from OpenStreetMap ---------- */
// Generated by scripts/osm-airport.mjs. Do not edit by hand.
// © OpenStreetMap contributors. This data is available under the Open Database Licence 1.0:
// https://opendatacommons.org/licenses/odbl/ (see README.md). Coordinates are metres from the
// ${icao} reference point (x east, z south). Building heights are typical values unless OSM tags them.
window.TU95_OSM = window.TU95_OSM || {};
TU95_OSM.${icao} = ${JSON.stringify(out)};
`;
writeFileSync(outFile, js);
console.log(`✓ ${outFile}: ${out.taxiways.length} taxiways, ${out.aprons.length} aprons, ${out.stands.length} stands, ${out.bridges.length} jet bridges, ${out.buildings.length} buildings (${Math.round(js.length / 1024)} KB)`);
