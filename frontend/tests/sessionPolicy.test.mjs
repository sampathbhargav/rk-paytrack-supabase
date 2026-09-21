import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionMonitor, sessionIdentity, MAX_SESSION_MS, IDLE_SESSION_MS } from '../src/auth/sessionPolicy.js';
const fixture = () => {
  let time = 1000000;
  const rows = new Map([['rk-payment-intent-v1:user', 'pending-request']]);
  const storage = { getItem: key => rows.get(key), setItem: (key, value) => rows.set(key, value) };
  const identity = { id: 'session-a', started: time };
  return { rows, storage, identity, now: () => time, advance: value => { time += value; } };
};
test('warns two minutes before idle lock; activity cannot unlock expired session', () => {
  const f = fixture(); const m = createSessionMonitor(f.identity, f.storage, f.now);
  f.advance(IDLE_SESSION_MS - 120000); assert.equal(m.status(), 'warning:120');
  f.advance(120000); m.activity(); assert.equal(m.status(), 'inactive');
  assert.equal(f.rows.get('rk-payment-intent-v1:user'), 'pending-request');
});
test('activity extends idle deadline but never absolute deadline', () => {
  const f = fixture(); const m = createSessionMonitor(f.identity, f.storage, f.now);
  for (let i = 0; i < 143; i++) { f.advance(600000); m.activity(); }
  f.advance(600000); assert.equal(m.status(), 'expired');
  assert.equal(MAX_SESSION_MS, 86400000);
});
test('tabs and reload share activity and lock; new login starts independently', () => {
  const f = fixture(); const first = createSessionMonitor(f.identity, f.storage, f.now);
  f.advance(1200000); first.activity();
  const second = createSessionMonitor(f.identity, f.storage, f.now);
  f.advance(1200000); assert.equal(second.status(), 'active');
  f.advance(IDLE_SESSION_MS - 1200000); assert.equal(second.status(), 'inactive'); assert.equal(first.status(), 'inactive');
  const next = createSessionMonitor({ id: 'session-b', started: f.now() }, f.storage, f.now);
  assert.equal(next.status(), 'active');
});
test('token refresh preserves original authentication time', () => {
  const token = claims => `header.${btoa(JSON.stringify(claims))}.signature`;
  const session = { access_token: token({ session_id: 'a', iat: 9999, amr: [{ timestamp: 100 }] }), user: {} };
  assert.deepEqual(sessionIdentity(session), { id: 'a', started: 100000 });
});
test('storage failure does not disable the in-memory lock', () => {
  const f = fixture(); const m = createSessionMonitor(f.identity, null, f.now);
  f.advance(IDLE_SESSION_MS); assert.equal(m.status(), 'inactive');
});
