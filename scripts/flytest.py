"""Headless fly-test for Ту-95 Bear 3D: a scripted autopilot flies real missions with every aircraft.

Needs Python 3 with Playwright (pip install playwright) and Google Chrome. Start the game first with `npm start`.

    python3 scripts/flytest.py                              # every aircraft, missions 1, 2 and 5
    python3 scripts/flytest.py http://localhost:8080/3d/ b738 a388
    MISSIONS=1,2,5,6 python3 scripts/flytest.py             # 6 is the hands-off autoland
    FINE=1 python3 scripts/flytest.py ...                   # print a detailed log of the last part of each flight

Missions by index: 1 departure from 36R, 2 straight-in to 36R, 5 night crosswind arrival on 18L, 6 autoland on 36R.
The render loop is frozen and physics is stepped by hand at 120 Hz, so a 10 km approach takes a few seconds.
"""
import os
import sys, json
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080/3d/'
ONLY = sys.argv[2:]

AUTOPILOT = r"""
async ({id, mission}) => {
  const B = window.__bear3d;
  window.__hold = true;                       // stop the rAF loop; we step by hand
  await new Promise(r => setTimeout(r, 100));
  B.setPlane(id); B.setMission(mission); B.progress.assist = true; B.progress.landAssist = true;
  const old = B.game; B.startFlight();
  // flights between airports may load a region first
  for (let i = 0; i < 600 && !(B.game && B.game !== old && B.game.mode === 'play'); i++) await new Promise(r => setTimeout(r, 100));
  const g = B.game, p = g.plane, sp = p.spec, IN = B.IN, h = 1/120;
  IN.stickP = 0; IN.stickR = 0; IN.thrSet = null; IN.brake = false; IN.pitch = 0; IN.roll = 0; IN.yaw = 0;
  const D2R = Math.PI/180, clamp = (v,a,b)=>v<a?a:v>b?b:v;
  const wrap = a => { while (a > Math.PI) a -= 2*Math.PI; while (a < -Math.PI) a += 2*Math.PI; return a; };
  const log = []; let t = 0, thr = 0.4, configured = false, maxSink = 0;
  const end = g.M.dest ? B.ENDS.find(e => e.name === g.M.dest) : null;
  const tmax = g.M.key === 'route' ? 2400 : 600;
  while (t < tmax && g.status === 'play') {
    const kmh = p.v*3.6;
    if (g.M.key === 'depart') {
      thr = 1;
      if (p.onGround) { IN.pitch = kmh > sp.rotKmh ? 0.7 : 0; IN.roll = 0; }
      else {
        const pitchCmd = 8*D2R; IN.pitch = clamp((pitchCmd - p.pitch)*4, -1, 1); IN.roll = clamp(-p.bank*2, -1, 1);
        if (p.agl > 30 && p.gearDown) B.act('gear');
        if (p.agl > 150 && p.flapIdx > 0 && kmh > sp.rotKmh*1.3) B.act('flapsUp');
      }
    } else if (g.M.key === 'route') {
      // takeoff by hand, then NAV + VNAV, skip to the descent, and an autoland at the destination
      const P = g.M.route; IN.yaw = 0;
      if (!g.flags.ap) {
        thr = 1;
        if (p.onGround) { IN.pitch = kmh > sp.rotKmh ? 0.7 : 0; IN.roll = 0; }
        else { IN.pitch = clamp((8*D2R - p.pitch)*4, -1, 1); IN.roll = clamp(-p.bank*2, -1, 1);
          if (p.agl > 30 && p.gearDown) B.act('gear'); if (p.agl > 150 && p.flapIdx > 0 && kmh > sp.rotKmh*1.3) B.act('flapsUp');
          if (p.agl > 400 && p.flapIdx === 0) { IN.pitch = 0; IN.roll = 0; B.apEngage(g, true); B.act('nav'); B.act('vnav'); g.flags.ap = true; } }
        IN.thrSet = g.flags.ap ? null : thr;
      } else {
        IN.pitch = 0; IN.roll = 0; IN.thrSet = null;
        if (!g.flags.skipped && p.agl > 2500 && B.REGION.icao !== P.dest) { B.skipToDescent(g); g.flags.skipped = true; }
        if (B.REGION.icao === P.dest && g.nav) {
          if (!p.ap.app && g.nav.dFaf < 6000) B.apArmApp(g);
          if (g.nav.dFaf < 14000 && !p.gearDown) B.act('gear');
          if (g.nav.dFaf < 20000 && p.flapIdx < sp.ldgFlap && kmh < (sp.flaps[p.flapIdx+1].vfe || 999) - 15 && Math.round(t*2) % 4 === 0) B.act('flaps');
        }
      }
      for (let i = 0; i < 6; i++) { B.step(g, h); t += h; if (g.status !== 'play') break; }
      if (Math.round(t*10) % 100 === 0) log.push([Math.round(t), B.REGION.icao, Math.round(p.agl), Math.round(p.ias*3.6), p.ap.lat, p.ap.vert, g.nav ? Math.round(g.nav.dFaf) : null, +p.thr.toFixed(2), p.ap.at, Math.round(p.ap.spd), +p.vs.toFixed(1)]);
      continue;
    } else if (g.M.key === 'autoland') {
      // hands off: arm the approach, then configure like a crew would
      IN.pitch = 0; IN.roll = 0; IN.yaw = 0; IN.thrSet = null;
      if (t > 1 && !p.ap.app && !p.onGround) B.apArmApp(g);
      const rx = p.pos.x - end.T.x, rz = p.pos.z - end.T.z, along = -(rx*end.dx + rz*end.dz);
      if (along < 14000 && !p.gearDown) B.act('gear');
      if (along < 16000 && p.flapIdx < sp.ldgFlap && kmh < (sp.flaps[p.flapIdx+1].vfe || 999) - 15 && Math.round(t*2) % 4 === 0) B.act('flaps');
      for (let i = 0; i < 6; i++) { B.step(g, h); t += h; if (g.status !== 'play') break; }
      if (window.__fine ? (p.agl<30) : Math.round(t*10) % 100 === 0) log.push([+t.toFixed(1), +p.agl.toFixed(1), Math.round(kmh), +p.vs.toFixed(2), p.ap.vert, +(p.pitch*57.3).toFixed(2), +(p.alpha*57.3).toFixed(1), +p.thr.toFixed(2), +(p.cin?p.cin.pin:0).toFixed(2)]);
      continue;
    } else if (end) {
      const rx = p.pos.x - end.T.x, rz = p.pos.z - end.T.z;
      const along = -(rx*end.dx + rz*end.dz), lat = rx*(-end.dz) + rz*end.dx;
      if (!configured && along < 9000) { configured = true; if (!p.gearDown) B.act('gear'); while (p.flapIdx < sp.ldgFlap) B.act('flaps'); }
      const rh = end.hdg*D2R;
      if (!p.onGround) {
        // lateral: track the centreline (wind-corrected via ground track)
        const track = Math.atan2(p.vel.x, -p.vel.z);
        const want = rh - clamp(lat*0.004, -0.5, 0.5);
        const bankCmd = clamp(wrap(want - track)*2.5, -0.4, 0.4);
        IN.roll = clamp((bankCmd - p.bank)*3, -1, 1);
        // vertical: 3° path to a point 300 m past the threshold
        const ht = Math.max(0, (along + 300)*Math.tan(3*D2R));
        const vsCmd = -p.v*Math.sin(3*D2R) + clamp((ht - p.agl)*0.12, -3, 3);
        if (p.agl > 12) {
          IN.pitch = clamp((vsCmd - p.vs)*0.35, -1, 1);
          thr = clamp(thr + (sp.appKmh - kmh)*0.004*h*20, 0, 1);
        } else {               // flare
          thr = 0; IN.pitch = clamp((-0.9 - p.vs)*0.5, -0.2, 1);
          const pmax = sp.bicycle ? 0.02 : sp.tailLim*0.55;
          if (p.pitch > pmax) IN.pitch = Math.min(IN.pitch, (pmax - p.pitch)*8);
          // de-crab just before touchdown
          if (p.agl < 4) { IN.yaw = clamp(wrap(rh - p.hdg)*8, -1, 1); IN.roll = clamp(-p.bank*4, -1, 1); }
        }
        if (p.agl >= 3) IN.yaw = 0;
      } else {
        thr = 0; IN.brake = true; IN.pitch = -0.3;
        IN.yaw = 0; IN.roll = clamp(wrap(rh - clamp(lat*0.01, -0.1, 0.1) - p.hdg)*6, -1, 1);
      }
    }
    IN.thrSet = thr; IN.thrUp = false; IN.thrDown = false;
    for (let i = 0; i < 6; i++) { B.step(g, h); t += h; if (g.status !== 'play') break; }
    if (p.vs < 0) maxSink = Math.max(maxSink, -p.vs);
    if (Math.round(t*10) % (window.__fine?10:100) === 0) log.push([Math.round(t), Math.round(p.agl), Math.round(kmh), +p.vs.toFixed(1)].concat(window.__fine?[+p.thr.toFixed(2),+p.rpm.toFixed(2),+(p.bank*57.3).toFixed(1),+(p.pitch*57.3).toFixed(1),+(p.alpha*57.3).toFixed(1),end?Math.round((p.pos.x-end.T.x)*(-end.dz)+(p.pos.z-end.T.z)*end.dx):0,+(p.hdg*57.3).toFixed(1)]:[]));
  }
  const dbg = B.debug ? B.debug() : null;
  return {dbg, status: g.status, reason: g.reason || '(timed out)', time: Math.round(t), stars: g.starsWon || 0,
          sink: g.stats.sink, offset: g.stats.offset, log: log.slice(window.__fine?-3000:-6).filter(r=>!window.__fine||r[4]!=='ROLLOUT'), end: end ? [Math.round(-((p.pos.x-end.T.x)*end.dx+(p.pos.z-end.T.z)*end.dz)), Math.round((p.pos.x-end.T.x)*(-end.dz)+(p.pos.z-end.T.z)*end.dx)] : null};
}
"""

INIT = """
(() => { const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => window.__hold ? 0 : raf(cb); })();
"""

with sync_playwright() as pw:
    br = pw.chromium.launch(channel=os.environ.get('CHANNEL', 'chrome'), headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    errors = []
    results = []
    ctx = br.new_context(viewport={'width': 1280, 'height': 720})
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.add_init_script(INIT)
    import os
    if os.environ.get('FINE'): page.add_init_script('window.__fine=1')
    page.goto(URL)
    page.wait_for_function('window.__bear3d && !document.querySelector("#menu").classList.contains("hidden")', timeout=60000)
    ids = ONLY or page.evaluate('window.__bear3d.AIRCRAFT.map(a => a.id)')
    ROUTES = [r.split(':') for r in os.environ['ROUTES'].split(',')] if os.environ.get('ROUTES') else None
    for id in ids:
        for mission in (ROUTES or [int(m) for m in os.environ['MISSIONS'].split(',')] if os.environ.get('MISSIONS') or ROUTES else (1, 2, 5)):
            page.evaluate('window.__hold = false')
            if ROUTES:
                page.evaluate("([id, a, b]) => { const B = window.__bear3d; B.setPlan(B.planFlight(B.AIRCRAFT.find(x => x.id === id), a, b, {})); }", [id, mission[0], mission[1]])
                page.wait_for_timeout(200)
            r = page.evaluate(AUTOPILOT, {'id': id, 'mission': 0 if ROUTES else mission})
            ok = r['status'] == 'success'
            sink = f"{r['sink']:.2f} m/s" if r['sink'] is not None else '-'
            print(f"{'PASS' if ok else 'FAIL'} {id:8} {('m'+str(mission)) if not ROUTES else ':'.join(mission)}  {r['time']:4}s  stars {r['stars']}  sink {sink}  {r['reason']}")
            if not ok or os.environ.get('FINE'): print('    ', r['log'], 'along/lat at end', r['end'], r.get('dbg') if os.environ.get('FINE') else '')
            results.append(ok)
    if errors: print('PAGE ERRORS:', errors)
    br.close()
    print(f"{sum(results)}/{len(results)} passed")
    sys.exit(0 if all(results) and not errors else 1)
