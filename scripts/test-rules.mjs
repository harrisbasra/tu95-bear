// Tests firestore.rules against the Firestore emulator, with no extra dependencies.
//   npm run test:rules     (needs firebase-tools and Java; starts the emulator on port 8085)
const PROJECT = 'demo-tu95', HOST = `http://127.0.0.1:${process.env.FIRESTORE_PORT || 8085}`;
const base = `${HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;
// the emulator accepts unsigned tokens
const token = uid => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); const now = Math.floor(Date.now() / 1000);
  return `${b({ alg: 'none', typ: 'JWT' })}.${b({ sub: uid, user_id: uid, aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}`, iat: now, exp: now + 3600, auth_time: now, firebase: { sign_in_provider: 'google.com' } })}.`; };
const enc = v => v === null ? { nullValue: null } : typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v }
  : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } }
  : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
async function write(uid, path, data, stamp = true) {
  const name = `projects/${PROJECT}/databases/(default)/documents/${path}`;
  const w = { update: { name, fields: enc(data).mapValue.fields } };
  if (stamp) w.updateTransforms = [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }];
  const r = await fetch(`${base}:commit`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(uid ? { Authorization: `Bearer ${token(uid)}` } : {}) }, body: JSON.stringify({ writes: [w] }) });
  return r.ok;
}
async function read(uid, path) { const r = await fetch(`${base}/${path}`, { headers: uid ? { Authorization: `Bearer ${token(uid)}` } : {} }); return r.ok; }
const career = (o = {}) => Object.assign({ v: 1, created: 1, updated: 2, pilot: { name: 'Test', base: 'OPLA', hours: 10, landings: 3, smooth: 2, flights: 3 }, day: 4,
  cash: 250000, fleet: [{ id: 'f1', type: 'b738' }], loans: [], months: [], month: { n: 1, revenue: 0, costs: 0, flights: 0 }, seq: 2, txN: 5, active: null }, o);
const pilot = (c, extra = {}) => Object.assign({ name: 'Test', progress: { stars: { free: 3 }, plane: 'b738', region: 'OPLA' }, career: c }, extra);
const tx = (o = {}) => Object.assign({ n: 1, d: 1, desc: 'Opening balance', amount: 150000, bal: 150000, kind: 'bank', career: 1 }, o);

const cases = [
  ['a pilot can create their own document', () => write('alice', 'pilots/alice', pilot(career())), true],
  ['a pilot can read their own document', () => read('alice', 'pilots/alice'), true],
  ['nobody else can read it', () => read('bob', 'pilots/alice'), false],
  ['signed-out visitors cannot read it', () => read(null, 'pilots/alice'), false],
  ['nobody else can write it', () => write('bob', 'pilots/alice', pilot(career())), false],
  ['an impossible balance is rejected', () => write('alice', 'pilots/alice', pilot(career({ cash: 5e9 }))), false],
  ['a 100 million credit jump in one save is rejected', () => write('alice', 'pilots/alice', pilot(career({ cash: 100250000 }))), false],
  ['flight hours cannot go backwards', () => write('alice', 'pilots/alice', pilot(career({ pilot: { name: 'Test', base: 'OPLA', hours: 1, landings: 3, smooth: 2, flights: 3 } }))), false],
  ['an ordinary flight settlement is accepted', () => write('alice', 'pilots/alice', pilot(career({ cash: 310000, day: 5, pilot: { name: 'Test', base: 'OPLA', hours: 14, landings: 4, smooth: 3, flights: 4 } }))), true],
  ['a new career may start from scratch', () => write('alice', 'pilots/alice', pilot(career({ created: 99, cash: 150000, pilot: { name: 'Test', base: 'OPLA', hours: 0, landings: 0, smooth: 0, flights: 0 } }))), true],
  ['unknown fields are rejected', () => write('alice', 'pilots/alice', pilot(career(), { admin: true })), false],
  ['a name over 24 characters is rejected', () => write('alice', 'pilots/alice', pilot(career(), { name: 'x'.repeat(40) })), false],
  ['a career with 100 aircraft is rejected', () => write('alice', 'pilots/alice', pilot(career({ created: 99, fleet: Array(100).fill({ id: 'x' }) }))), false],
  ['a client-chosen timestamp is rejected', () => write('alice', 'pilots/alice', pilot(career({ created: 99 }), { updatedAt: 'yesterday' }), false), false],
  ['a pilot can add a transaction', () => write('alice', 'pilots/alice/tx/1-1', tx(), false), true],
  ['a transaction can’t be edited afterwards', () => write('alice', 'pilots/alice/tx/1-1', tx({ amount: 9e6 }), false), false],
  ['an absurd transaction is rejected', () => write('alice', 'pilots/alice/tx/1-2', tx({ n: 2, amount: 9e9 }), false), false],
  ['nobody else can add transactions', () => write('bob', 'pilots/alice/tx/1-3', tx({ n: 3 }), false), false],
  ['an existing save without a career still works', () => write('carol', 'pilots/carol', { name: 'Carol', progress: { stars: { free: 1 }, plane: 'tu95' } }), true]
];
let failed = 0;
for (const [name, fn, expect] of cases) { const got = await fn(); const ok = got === expect; if (!ok) failed++; console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : ` (expected ${expect ? 'allowed' : 'denied'})`}`); }
console.log(failed ? `${failed} rule test(s) failed` : `✓ all ${cases.length} rule tests pass`); process.exit(failed ? 1 : 0);
