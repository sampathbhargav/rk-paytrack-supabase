import { getDueDealsForDate, getPastDueScheduledPayments, getDealDueSchedule } from './duePaymentsUtils.js';
import { getActivePromises, getCombinedDueAmount } from './promiseUtils.js';

// Compose the same schedule/promise rules used by collection screens.
// A promise changes collection timing; it is not additional account debt.
export function getAccountCollectionSummary(deal, payments, promises, skips, today) {
  const validPayments = payments.filter(payment => payment.payment_status !== 'Voided');
  const activePromises = getActivePromises(promises);
  const scheduled = [
    ...getPastDueScheduledPayments([deal], validPayments, today, skips),
    ...getDueDealsForDate([deal], validPayments, today, skips),
  ].filter(row => row.remainingForDueDate > 0);
  const duePromises = activePromises.filter(promise => promise.promised_date && promise.promised_date <= today);
  return {
    hasSchedule: getDealDueSchedule(deal, skips).length > 0,
    dueNow: getCombinedDueAmount(scheduled, duePromises),
  };
}
