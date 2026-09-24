import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBusinessInsights, parseInsightDate, getMonthKey } from '../src/utils/businessInsights.js';
import { readAllRows } from '../src/api/readAllRows.js';

const deal = { id: 'd', customer_id: 'c', deal_type: 'In-house', status: 'Active', total_amount: 1000, principal_amount: 900, start_date: '2026-09-01' };
const payment = (id, date, amount, extra = {}) => ({ id, deal_id: 'd', payment_date: date, amount_paid: amount, payment_status: 'Active', ...extra });
const report = (deals, payments) => buildBusinessInsights({ deals, payments, promises: [], paymentSkips: [], selectedFilter: 'all', currentMonthKey: '2026-09', currentYear: 2026 });

test('unknown dates stay in lifetime balances but never become current collections', () => {
  const result = report([deal], [payment('a', '2026-09-01', 100), payment('b', null, 200, { created_at: '2026-09-21', paid_date: '2026-09-21' }), payment('c', '2026-02-30', 50), payment('v', null, 600, { payment_status: 'Voided' }), payment('r', null, 25, { payment_method: 'Referral Credit' })]);
  assert.equal(result.totalAmountPaid, 350);
  assert.equal(result.currentTotalBalance, 625);
  assert.equal(result.paidThisMonth, 100);
  assert.equal(result.paidThisYear, 100);
  assert.equal(result.unknownPaymentDateCount, 2);
  assert.equal(result.unknownPaymentDateAmount, 250);
});
test('undated deals remain in portfolio but not origination periods', () => {
  const result = report([{ ...deal, start_date: null, created_at: '2026-09-21' }], []);
  assert.equal(result.totalPrincipal, 900);
  assert.equal(result.principalThisMonth, 0);
  assert.equal(result.principalThisYear, 0);
  assert.equal(result.unknownDealDateCount, 1);
});
test('strict calendar dates preserve month boundaries and leap days', () => {
  assert.equal(getMonthKey(parseInsightDate('2026-09-01')), '2026-09');
  assert.ok(parseInsightDate('2024-02-29'));
  for (const date of [null, '', 'junk', '2025-02-29', '2026-13-01', '2026-04-31']) assert.equal(parseInsightDate(date), null);
  const result = report([deal], [payment('a', '2025-12-31', 10), payment('b', '2026-01-01', 20), payment('c', '2026-09-01', 30)]);
  assert.equal(result.paidThisMonth, 30);
  assert.equal(result.paidThisYear, 50);
});
test('reads beyond 1000 records even when server caps each response at 200', async () => {
  const records = Array.from({ length: 1501 }, (_, id) => ({ id }));
  const result = await readAllRows(() => ({ range: async from => ({ data: records.slice(from, from + 200) }) }));
  assert.deepEqual(result, records);
});
test('later page errors reject instead of returning incomplete totals', async () => {
  await assert.rejects(readAllRows(() => ({ range: async from => from ? { error: new Error('offline') } : { data: [{ id: 1 }] } })), /offline/);
});
