"""End-to-end test of cloud saves against the Firebase emulators, using the game's own Firebase code.
    npm start          # in one terminal (serves the game on :8080)
    npm run test:cloud # starts the Auth and Firestore emulators and runs this script
Needs Python Playwright, Google Chrome, firebase-tools and Java 21+.
"""
import json, sys, urllib.request
from playwright.sync_api import sync_playwright
URL = 'http://localhost:8080/3d/?emulator'
FS = 'http://127.0.0.1:8085/v1/projects/tu95-bear-harrisbasra/databases/(default)/documents'
def admin_get(path):
    req = urllib.request.Request(f'{FS}/{path}', headers={'Authorization': 'Bearer owner'})
    try: return json.load(urllib.request.urlopen(req))
    except Exception as e: return {'error': str(e)}
fails = 0
def check(name, ok):
    global fails; print(('✓ ' if ok else '✗ ') + name); fails += 0 if ok else 1
with sync_playwright() as pw:
    br = pw.chromium.launch(channel='chrome', headless=True); ctx = br.new_context(); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_function('window.__bear3d && window.__bear3d.CLOUD.user', timeout=60000)
    uid = pg.evaluate('window.__bear3d.CLOUD.user.uid')
    pg.evaluate("() => { const B = window.__bear3d; B.newCareer('Cloud test', 'OPLA'); B.CAREER.cash += 50000; B.buyAircraft('a320', true, true); B.saveCareer(); }")
    pg.wait_for_timeout(5000)
    doc = admin_get(f'pilots/{uid}')
    cash = doc.get('fields', {}).get('career', {}).get('mapValue', {}).get('fields', {}).get('cash', {})
    check('the career reaches Firestore', 'integerValue' in cash or 'doubleValue' in cash)
    txs = admin_get(f'pilots/{uid}/tx').get('documents', [])
    check(f'its bank transactions are stored one per document ({len(txs)})', len(txs) >= 2)
    local_cash = pg.evaluate('window.__bear3d.CAREER.cash')
    # a fresh browser profile (same account) restores everything from the cloud
    pg.evaluate("() => { localStorage.clear(); }"); pg.reload(); pg.wait_for_function('window.__bear3d && window.__bear3d.CLOUD.user', timeout=60000)
    pg.wait_for_function('window.__bear3d.CAREER', timeout=20000)
    got = pg.evaluate('({cash: window.__bear3d.CAREER.cash, fleet: window.__bear3d.CAREER.fleet.length, tx: window.__bear3d.CAREER.tx.length})')
    check(f'a cleared browser gets the career back (balance {got["cash"]}, {got["fleet"]} aircraft, {got["tx"]} transactions)', got['cash'] == local_cash and got['fleet'] == 2 and got['tx'] >= 2)
    # offline: keep playing, then sync on reconnect
    ctx.set_offline(True); pg.evaluate("() => { window.dispatchEvent(new Event('offline')); const B = window.__bear3d; B.takeLoan(100000, 12); }"); pg.wait_for_timeout(3000)
    offline_cash = pg.evaluate('window.__bear3d.CAREER.cash')
    check(f'the offline change happened ({local_cash} to {offline_cash})', offline_cash == local_cash + 100000)
    ctx.set_offline(False); pg.evaluate("() => window.dispatchEvent(new Event('online'))"); pg.wait_for_timeout(6000)
    doc = admin_get(f'pilots/{uid}'); f = doc.get('fields', {}).get('career', {}).get('mapValue', {}).get('fields', {}).get('cash', {})
    synced = int(f.get('integerValue', f.get('doubleValue', -1)))
    check(f'changes made offline sync when back online ({synced} = {offline_cash})', synced == offline_cash)
    check('no page errors', not errs)
    if errs: print(errs)
    br.close()
sys.exit(1 if fails else 0)
