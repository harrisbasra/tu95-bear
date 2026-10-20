// Builds 3d/index.html from the sources in 3d/src.
// Run with `npm run build:3d`. The output is committed so GitHub Pages can serve it as-is.
import { readFileSync, writeFileSync } from 'node:fs';

const src = f => readFileSync(new URL(`../3d/src/${f}`, import.meta.url), 'utf8');
let html = src('shell.html');

html = html.replace('      <h2 class="sub">Missions</h2>', `      <div class="pilot-row"><label for="pilot">Pilot name</label><input id="pilot" type="text" maxlength="24" placeholder="Your name" autocomplete="nickname"></div>
      <div id="cloud" class="cloud" hidden><p id="cloud-status"></p><button id="cloud-btn" class="ghost">Sign in with Google</button></div>
      <h2 class="sub">Missions</h2>`);
html = html.replace('.credit-m{', `.pilot-row{display:flex;gap:10px;align-items:center;margin-top:12px;font-size:16px;color:var(--muted)}
.pilot-row input{font:inherit;font-size:17px;background:rgba(235,229,203,.08);border:1.5px solid var(--olive-line);border-radius:3px;color:var(--cream);padding:5px 10px;width:220px;user-select:text;-webkit-user-select:text}
.cloud{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:8px;font-size:15px;color:var(--muted)}.cloud p{margin:0}
.credit-m{`);

const parts = ['b_core.js', 'c_models.js', 'd_world.js', 'e_physics.js', 'f_game.js', 'g_ui.js'].map(src);
html += `<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="firebase-config.js" onerror="window.TU95_FIREBASE=null"></script>
<script>
${parts.join('\n')}
</script>
</body>
</html>
`;
writeFileSync(new URL('../3d/index.html', import.meta.url), html);
console.log(`✓ built 3d/index.html (${Math.round(html.length / 1024)} KB)`);
