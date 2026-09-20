import test from 'node:test';
import assert from 'node:assert/strict';
import { getAccountCollectionSummary } from '../src/utils/accountCollectionSummary.js';
const deal = { id: 'd', deal_type: 'In-house', status: 'Active', payment_frequency: 'Monthly', start_date: '2026-01-01', due_day: 1, term: 2, monthly_payment: 500 };
const payment = { deal_id: 'd', due_date: '2026-02-01', amount_paid: 200, payment_status: 'Active' };
const promise = { id: 'p', deal_id: 'd', original_due_date: '2026-02-01', promised_date: '2026-02-15', remaining_amount: 300, promise_status: 'Pending' };
const summary = (payments=[], promises=[], today='2026-02-15') => getAccountCollectionSummary(deal, payments, promises, [], today);
test('due-now excludes future installments and does not double count a partial promise', () => {
  assert.equal(summary([payment], [promise]).dueNow, 300);
  assert.equal(summary().dueNow, 500);
});
test('voided payments do not reduce collection amounts', () => {
  assert.equal(summary([{...payment, payment_status:'Voided'}]).dueNow, 500);
});
test('promise due before its installment contributes once', () => {
  const early = {...promise, original_due_date:'2026-03-01', promised_date:'2026-01-15', remaining_amount:500};
  assert.equal(summary([], [early], '2026-01-15').dueNow, 500);
});
test('historical and cancelled promises are not actionable', () => {
  const parent={...promise, promised_date:'2026-01-15', original_due_date:'2026-03-01'};
  const child={...parent,id:'child',parent_promise_id:'p',promise_status:'Cancelled'};
  assert.equal(summary([], [parent, child], '2026-01-15').dueNow, 0);
});
test('missing schedule is explicitly unavailable and inputs are not changed', () => {
  const input=structuredClone(deal);
  assert.equal(getAccountCollectionSummary({...input,term:null}, [], [], [], '2026-02-15').hasSchedule, false);
  assert.deepEqual(input, deal);
});
