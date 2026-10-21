// Sanity checks run by CI and `npm run check`.
// Each game is a self-contained HTML file, so this parses every inline
// <script> block and fails on syntax errors before anything ships.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const files = ['index.html', '3d/index.html'];
let failed = false;

for (const name of files) {
  const html = readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);

  if (!scripts.length) {
    console.error(`✗ ${name}: no inline <script> found`);
    failed = true;
  }

  scripts.forEach((code, i) => {
    try {
      new vm.Script(code, { filename: `${name} <script #${i + 1}>` });
      console.log(`✓ ${name} script #${i + 1} parses (${code.split('\n').length} lines)`);
    } catch (err) {
      console.error(`✗ ${name} script #${i + 1}: ${err.message}`);
      failed = true;
    }
  });

  for (const tag of ['<!doctype html>', '<title>', 'name="viewport"']) {
    if (!html.toLowerCase().includes(tag.toLowerCase())) {
      console.error(`✗ ${name} is missing ${tag}`);
      failed = true;
    }
  }
}

// OpenStreetMap data is ODbL: the game must credit it wherever it is used.
const built = readFileSync(new URL('../3d/index.html', import.meta.url), 'utf8');
if (/_OSM=/.test(built) && !built.includes('OpenStreetMap contributors')) {
  console.error('✗ 3d/index.html embeds OpenStreetMap data but does not credit "OpenStreetMap contributors"');
  failed = true;
}

// Airport and map data loaded on demand: each file must parse, and OpenStreetMap data must carry its credit.
import { readdirSync } from 'node:fs';
for (const f of readdirSync(new URL('../3d/data/', import.meta.url))) {
  if (!f.endsWith('.js')) continue;
  const code = readFileSync(new URL(`../3d/data/${f}`, import.meta.url), 'utf8');
  try { new vm.Script(code, { filename: `3d/data/${f}` }); } catch (err) { console.error(`✗ 3d/data/${f}: ${err.message}`); failed = true; continue; }
  if (code.includes('TU95_OSM') && !code.includes('OpenStreetMap contributors')) { console.error(`✗ 3d/data/${f} is OpenStreetMap data without the credit`); failed = true; }
}
// every airport marked as having map data should have its file
const ap = readFileSync(new URL('../3d/src/b_airports.js', import.meta.url), 'utf8');
for (const [, icao] of ap.matchAll(/icao:'([A-Z]{4})'[^\n]*osm:true/g)) {
  try { readFileSync(new URL(`../3d/data/${icao}.js`, import.meta.url)); } catch { console.warn(`! ${icao} has osm:true but no 3d/data/${icao}.js yet (it falls back to a generic layout)`); }
}
console.log('✓ 3d/data files parse');

// The committed 3D build must match its sources.
const before = readFileSync(new URL('../3d/index.html', import.meta.url), 'utf8');
await import('./build-3d.mjs');
const after = readFileSync(new URL('../3d/index.html', import.meta.url), 'utf8');
if (before !== after) {
  console.error('✗ 3d/index.html was out of date with 3d/src. Run `npm run build:3d` and commit the result.');
  failed = true;
}

if (failed) process.exit(1);
console.log('✓ all games look good');
