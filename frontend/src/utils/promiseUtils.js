/**
 * A promise is a version of an installment commitment, not extra debt.
 * Pass the complete promise history (before date/status filtering): even a
 * paid or cancelled child supersedes its parent. Partial Paid is historical
 * in the deal-promise workflow; a missing replacement needs review, not revival.
 * This helper does not repair stored amounts or infer links between root rows.
 * Maintenance promises use a different model and must not use this helper.
 */
export function getActivePromises(promises = []) {
  const supersededIds = new Set(
    promises.map((promise) => promise.parent_promise_id).filter(Boolean)
  );

  return promises.filter((promise) => {
    const remaining = Number(promise.remaining_amount);
    return (
      ["Pending", "Broken"].includes(promise.promise_status) &&
      !supersededIds.has(promise.id) &&
      Number.isFinite(remaining) &&
      remaining > 0
    );
  });
}

// Scheduled rows already describe the debt. A promise is a collection date for
// that same installment, so it contributes only when that installment is absent.
// Do not guess identity for legacy rows without a deal/due date.
export function getCombinedDueAmount(scheduled = [], activePromises = []) {
  const cents = scheduled.reduce((sum, row) =>
    sum + Math.round(Number(row.remainingForDueDate || 0) * 100), 0);
  return (cents + activePromises.reduce((sum, promise) => {
    const included = isPromiseCoveredBySchedule(promise, scheduled);
    return sum + (included ? 0 : Math.round(Number(promise.remaining_amount || 0) * 100));
  }, 0)) / 100;
}

// Match identity only; never infer links for ambiguous legacy obligations.
export function isPromiseCoveredBySchedule(promise, scheduled = []) {
  return Boolean(promise.deal_id && promise.original_due_date && scheduled.some(row =>
    (row.deal?.id || row.deal_id) === promise.deal_id &&
    row.dueDate === promise.original_due_date));
}
