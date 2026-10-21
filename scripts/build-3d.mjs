// Builds 3d/index.html from the sources in 3d/src.
// Run with `npm run build:3d`. The output is committed so GitHub Pages can serve it as-is.
// The JavaScript files are joined in order inside one closure, so they share scope.
import { readFileSync, writeFileSync } from 'node:fs';

export const PARTS = ['b_core.js', 'b_airports.js', 'c_models.js', 'c_airliners.js', 'd_world.js', 'd_airport.js', 'e_physics.js', 'e_autopilot.js', 'f_game.js', 'f_route.js', 'f_career.js', 'g_cockpit.js', 'g_pad.js', 'g_map.js', 'g_career.js', 'g_ui.js'];

const src = f => readFileSync(new URL(`../3d/src/${f}`, import.meta.url), 'utf8');
let html = src('shell.html');
html += `<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="firebase-config.js" onerror="window.TU95_FIREBASE=null"></script>
<script>
${PARTS.map(src).join('\n')}
</script>
</body>
</html>
`;
writeFileSync(new URL('../3d/index.html', import.meta.url), html);
console.log(`✓ built 3d/index.html (${Math.round(html.length / 1024)} KB)`);
