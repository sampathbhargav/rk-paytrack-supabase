import test from 'node:test';
import assert from 'node:assert/strict';
import { getActivePromises, getCombinedDueAmount, isPromiseCoveredBySchedule } from '../src/utils/promiseUtils.js';

const promise = (id, status, remaining, parent = null) => ({
  id, deal_id: 'deal', original_due_date: '2026-06-01',
  promise_status: status, remaining_amount: remaining, parent_promise_id: parent,
});
const balance = (rows) => getActivePromises(rows).reduce(
  (sum, row) => sum + Math.round(Number(row.remaining_amount) * 100), 0
) / 100;

test('partial payment counts the replacement once and retains history', () => {
  const rows = [promise('parent', 'Partial Paid', 500), promise('child', 'Broken', 300, 'parent')];
  const before = structuredClone(rows);
  assert.equal(balance(rows), 300);
  assert.deepEqual(getActivePromises(rows).map(p => p.id), ['child']);
  assert.deepEqual(rows, before);
});

test('a stale open parent is superseded even if its child is paid or cancelled', () => {
  for (const status of ['Paid', 'Cancelled']) {
    assert.deepEqual(getActivePromises([
      promise('parent', 'Pending', 500), promise('child', status, 300, 'parent'),
    ]), []);
  }
});

test('multi-generation reschedules count only the open leaf', () => {
  const rows = [promise('a', 'Rescheduled', 500), promise('b', 'Broken', 400, 'a'), promise('c', 'Pending', 200, 'b')];
  assert.equal(balance(rows), 200);
  assert.deepEqual(getActivePromises([...rows].reverse()).map(p => p.id), ['c']);
});

test('history must be resolved before filtering by collection date', () => {
  const rows = [
    { ...promise('a', 'Broken', 500), promised_date: '2026-06-01' },
    { ...promise('b', 'Pending', 300, 'a'), promised_date: '2026-07-01' },
  ];
  assert.equal(getActivePromises(rows).filter(p => p.promised_date === '2026-06-01').length, 0);
});

test('only positive finite Pending/Broken leaves contribute', () => {
  const rows = [promise('a', 'Pending', '10.25'), promise('b', 'Broken', '20.50')];
  for (const status of ['Paid', 'Partial Paid', 'Rescheduled', 'Cancelled', null, 'Unknown']) {
    rows.push(promise(`status-${status}`, status, 500));
  }
  for (const [i, value] of [0, -1, null, undefined, 'bad', Infinity].entries()) {
    rows.push(promise(`amount-${i}`, 'Pending', value));
  }
  assert.equal(balance(rows), 30.75);
  assert.deepEqual(getActivePromises(), []);
});

test('separate obligations remain separate; no invented parent links', () => {
  const rows = [promise('a', 'Pending', 100), { ...promise('b', 'Broken', 200), original_due_date: '2026-07-01' }];
  assert.equal(balance(rows), 300);
});

test('scheduled and promised amount on one installment counts scheduled debt once', () => {
  const scheduled = [{deal:{id:'deal'},dueDate:'2026-06-01',remainingForDueDate:500}];
  assert.equal(getCombinedDueAmount(scheduled,[promise('a','Broken',300)]),500);
});
test('promises for other installments remain included using exact cents', () => {
  const scheduled = [{deal:{id:'deal'},dueDate:'2026-07-01',remainingForDueDate:100.01}];
  assert.equal(getCombinedDueAmount(scheduled,[promise('a','Broken',200.02)]),300.03);
});

test('priority promise overlap uses deal and original installment, not promised date', () => {
  const scheduled = [{deal:{id:'deal'}, dueDate:'2026-06-01',remainingForDueDate:300}];
  const p = {...promise('a','Broken',300),promised_date:'2026-09-01'};
  assert.equal(isPromiseCoveredBySchedule(p, scheduled),true);
  assert.equal(isPromiseCoveredBySchedule({...p,deal_id:'other'}, scheduled),false);
  assert.equal(isPromiseCoveredBySchedule({...p,original_due_date:'2026-07-01'}, scheduled),false);
  assert.equal(isPromiseCoveredBySchedule({...p,original_due_date:null}, scheduled),false);
  assert.equal(getCombinedDueAmount(scheduled,[p]),300);
});
