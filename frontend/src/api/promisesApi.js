import { supabase } from "../supabaseClient";
import { runPaymentOperation } from "./paymentOperationsApi";
import { readAllRows } from "./readAllRows";

const promiseDealJoin = `
  *,
  deals (
    id,
    deal_tag,
    deal_type,
    deal_subtype,
    payment_frequency,
    first_payment_date,
    start_date,
    due_day,
    monthly_payment,
    term,
    maturity_date,
    customer_id,
    customers (
      id,
      customer_name,
      company_name,
      phone,
      email,
      address
    )
  )
`;

export async function getPromises() {
  return markBrokenPromisesInUI(await readAllRows(() =>
    supabase.from("payment_promises").select(promiseDealJoin).order("id")));
}

export async function getPromisesByDealId(dealId) {
  return markBrokenPromisesInUI(await readAllRows(() =>
    supabase.from("payment_promises").select(promiseDealJoin).eq("deal_id", dealId).order("id")));
}

// Compatibility for readers: aging is derived, never a write on page load.
export async function updateBrokenPromises() {}

function payloadFor(promise, fields) {
  return { dealId: promise.deal_id, promiseId: promise.id,
    expectedRemaining: Number(promise.remaining_amount), ...fields };
}

export async function markPromisePaidAndCreatePayment({ promise, paymentDate, paymentMethod, notes }) {
  return runPaymentOperation("promise_paid", payloadFor(promise, { paymentDate, paymentMethod, notes }));
}

export async function partialPayPromiseAndCreateNewPromise({ promise, paymentDate, amountPaid, paymentMethod, newPromisedDate, notes }) {
  return runPaymentOperation("promise_partial", payloadFor(promise, {
    paymentDate, amountPaid: Number(amountPaid), paymentMethod, newPromisedDate, notes,
  }));
}

export async function reschedulePromise({ promise, newPromisedDate, reason }) {
  return runPaymentOperation("reschedule", payloadFor(promise, { newPromisedDate, reason }));
}

function markBrokenPromisesInUI(promises) {
  const today = new Date().toISOString().slice(0, 10);
  return promises.map(p => p.promise_status === "Pending" && p.promised_date && p.promised_date < today
    ? { ...p, promise_status: "Broken" } : p);
}
