import test from 'node:test';
import assert from 'node:assert/strict';
import { createPaymentRequests } from '../src/utils/paymentRequests.js';

function fixture(beforeNewRequest) {
  const records = new Map();
  const ledger = new Map();
  let inserts = 0;
  let next = 0;
  let loseResponse = false;
  const storage = { getItem: k => records.get(k), setItem: (k,v) => records.set(k,v), removeItem: k => records.delete(k) };
  const makeClient = () => createPaymentRequests({ storage, actorId: 'actor', uuid: () => `key-${++next}`,
    beforeNewRequest,
    lock: async (_key, work) => work(),
    rpc: async (id, _operation, payload) => {
      if (!ledger.has(id)) ledger.set(id, { version: 1, payments: [{ id: ++inserts, amount_paid: payload.amount }] });
      if (loseResponse) { loseResponse = false; throw new Error('Network lost after commit'); }
      return { data: ledger.get(id) };
    },
  });
  return { makeClient, storage, inserts: () => inserts, loseNext: () => { loseResponse = true; } };
}

test('double click shares one in-flight operation', async () => {
  const f = fixture(); const client = f.makeClient();
  const [a,b] = await Promise.all([client.run('record',{amount:200}),client.run('record',{amount:200})]);
  assert.deepEqual(a,b); assert.equal(f.inserts(),1);
});
test('network failure after commit survives restart and recovers exact key', async () => {
  const f = fixture(); f.loseNext();
  await assert.rejects(f.makeClient().run('record',{amount:200}), /Network/);
  const restarted = f.makeClient();
  const a = await restarted.run(null,null,true);
  assert.equal(a.requestId,'key-1'); assert.equal(f.inserts(),1);
  assert.equal(restarted.pending().input.payload.amount,200);
});
test('changed input cannot replace unresolved intent', async () => {
  const f = fixture(); const client = f.makeClient();
  await client.run('record',{amount:200});
  await assert.rejects(client.run('record',{amount:100}), /recovery/);
  assert.equal(f.inserts(),1);
});
test('two legitimate payments get separate keys after confirmation', async () => {
  const f = fixture(); const client = f.makeClient();
  const a = await client.run('record',{amount:100}); client.acknowledge(a.requestId);
  const b = await client.run('record',{amount:100});
  assert.notEqual(a.requestId,b.requestId); assert.equal(f.inserts(),2);
});
test('success is durable until acknowledged and replay does not insert', async () => {
  const f = fixture(); const a = await f.makeClient().run('record',{amount:100});
  const client = f.makeClient(); const b = await client.run('record',{amount:100});
  assert.deepEqual(a,b); assert.equal(f.inserts(),1);
  client.acknowledge('wrong-key'); assert.ok(client.pending());
  client.acknowledge(a.requestId); assert.equal(client.pending(),null);
});
test('storage failure prevents transport', async () => {
  let calls = 0;
  const client = createPaymentRequests({ actorId:'a', uuid:()=> 'id', lock:async (_k,f)=>f(),
    storage:{getItem:()=>null,setItem:()=>{throw Error('Storage unavailable');}}, rpc:()=>{calls++;} });
  await assert.rejects(client.run('record',{}),/Storage/); assert.equal(calls,0);
});
test('a concurrent different intent never receives another payments result', async () => {
  const f = fixture(); const client = f.makeClient();
  const first = client.run('record',{amount:200});
  await assert.rejects(client.run('record',{amount:100}),/in progress/);
  await first; assert.equal(f.inserts(),1);
});

test('unavailable backend blocks new intent without persisting or sending it, and activation permits retry', async () => {
  let enabled = false;
  const f = fixture(async () => { if (!enabled) throw Error('Payment saves unavailable'); });
  const client = f.makeClient();
  await assert.rejects(client.run('record', {amount:100}), /unavailable/);
  assert.equal(client.pending(), null);
  assert.equal(f.inserts(), 0);
  enabled = true;
  await client.run('record', {amount:100});
  assert.equal(f.inserts(), 1);
});

test('lost-response recovery bypasses new-write readiness and retains its original key', async () => {
  let enabled = true;
  const f = fixture(async () => { if (!enabled) throw Error('Payment saves unavailable'); });
  f.loseNext();
  await assert.rejects(f.makeClient().run('record', {amount:100}), /Network/);
  enabled = false;
  const result = await f.makeClient().run(null, null, true);
  assert.equal(result.requestId, 'key-1');
  assert.equal(f.inserts(), 1);
});

test('a revoked RPC during recovery cannot erase an uncertain committed request', async () => {
  const f = fixture();
  f.loseNext();
  await assert.rejects(f.makeClient().run('record', {amount:100}), /Network/);
  const original = f.storage.getItem('rk-payment-intent-v1:actor');
  const paused = createPaymentRequests({ storage:f.storage, actorId:'actor', uuid:()=>assert.fail('new key'),
    lock:async (_key, work)=>work(),
    rpc:async ()=>({error:{code:'42501',message:'permission denied'}}) });
  await assert.rejects(paused.run(null,null,true), /permission denied/);
  assert.equal(f.storage.getItem('rk-payment-intent-v1:actor'), original);
  const result = await f.makeClient().run(null,null,true);
  assert.equal(result.requestId, 'key-1');
  assert.equal(f.inserts(), 1);
});

test('recovery with no pending intent performs no transport', async () => {
  const f = fixture();
  assert.equal(await f.makeClient().run(null,null,true), null);
  assert.equal(f.inserts(), 0);
});
