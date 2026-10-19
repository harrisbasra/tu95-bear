// Sanity checks run by CI and `npm run check`.
// The game is one self-contained index.html, so this parses every inline
// <script> block and fails on syntax errors before anything ships.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const file = new URL('../index.html', import.meta.url);
const html = readFileSync(file, 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
let failed = false;

if (!scripts.length) {
  console.error('✗ No inline <script> found in index.html');
  failed = true;
}

scripts.forEach((code, i) => {
  try {
    new vm.Script(code, { filename: `index.html <script #${i + 1}>` });
    console.log(`✓ script #${i + 1} parses (${code.split('\n').length} lines)`);
  } catch (err) {
    console.error(`✗ script #${i + 1}: ${err.message}`);
    failed = true;
  }
});

for (const tag of ['<!doctype html>', '<title>', 'name="viewport"']) {
  if (!html.toLowerCase().includes(tag.toLowerCase())) {
    console.error(`✗ index.html is missing ${tag}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('✓ index.html looks good');
