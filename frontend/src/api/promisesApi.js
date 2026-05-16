import { supabase } from "../supabaseClient";

export async function getPromises() {
  const { data, error } = await supabase
    .from("payment_promises")
    .select(`
      *,
      deals (
        id,
        deal_tag,
        deal_type,
        deal_subtype,
        customers (
          customer_name,
          phone
        )
      )
    `)
    .order("promised_date", { ascending: true });

  if (error) throw error;

  return data;
}

export async function getPromisesByDealId(dealId) {
  const { data, error } = await supabase
    .from("payment_promises")
    .select("*")
    .eq("deal_id", dealId)
    .order("promised_date", { ascending: true });

  if (error) throw error;

  return markBrokenPromisesInUI(data);
}

export async function updateBrokenPromises() {
  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabase
    .from("payment_promises")
    .update({
      promise_status: "Broken",
    })
    .lt("promised_date", today)
    .eq("promise_status", "Pending");

  if (error) throw error;
}

export async function markPromisePaidAndCreatePayment({
  promise,
  paymentDate,
  paymentMethod,
  notes,
}) {
  const amountPaid = Number(promise.remaining_amount || 0);

  if (amountPaid <= 0) {
    throw new Error("Promise remaining amount must be greater than 0.");
  }

  // Create payment record for the promised remaining amount
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      deal_id: promise.deal_id,
      promise_id: promise.id,
      payment_date: paymentDate,

      // IMPORTANT:
      // This connects the promise payment back to the original installment.
      due_date: promise.original_due_date,

      amount_due: amountPaid,
      amount_paid: amountPaid,
      remaining_amount: 0,
      payment_method: paymentMethod,
      payment_type: "Promise Payment",
      notes:
        notes ||
        `Promise payment received for original due date ${promise.original_due_date}`,
    })
    .select()
    .single();

  if (paymentError) throw paymentError;

  // Mark promise as paid
  const { data: updatedPromise, error: promiseError } = await supabase
    .from("payment_promises")
    .update({
      promise_status: "Paid",
    })
    .eq("id", promise.id)
    .select()
    .single();

  if (promiseError) throw promiseError;

  return {
    payment,
    promise: updatedPromise,
  };
}

function markBrokenPromisesInUI(promises) {
  const today = new Date().toISOString().split("T")[0];

  return promises.map((promise) => {
    if (
      promise.promise_status === "Pending" &&
      promise.promised_date &&
      promise.promised_date < today
    ) {
      return {
        ...promise,
        promise_status: "Broken",
      };
    }

    return promise;
  });
}

export async function reschedulePromise({
  promise,
  newPromisedDate,
  reason,
}) {
  if (!newPromisedDate) {
    throw new Error("New promised date is required.");
  }

  // 1. Mark old promise as Rescheduled
  const { error: oldPromiseError } = await supabase
    .from("payment_promises")
    .update({
      promise_status: "Rescheduled",
      reschedule_reason: reason || "",
    })
    .eq("id", promise.id);

  if (oldPromiseError) throw oldPromiseError;

  // 2. Create new promise for the same remaining amount
  const { data: newPromise, error: newPromiseError } = await supabase
    .from("payment_promises")
    .insert({
      deal_id: promise.deal_id,
      original_due_date: promise.original_due_date,
      amount_due: promise.amount_due,
      amount_paid_now: promise.amount_paid_now,
      remaining_amount: promise.remaining_amount,
      promised_date: newPromisedDate,
      promise_status: "Pending",
      notes:
        reason ||
        `Promise rescheduled from ${promise.promised_date} to ${newPromisedDate}`,
      parent_promise_id: promise.id,
      rescheduled_from_date: promise.promised_date,
      reschedule_reason: reason || "",
    })
    .select()
    .single();

  if (newPromiseError) throw newPromiseError;

  return newPromise;
}

export async function partialPayPromiseAndCreateNewPromise({
  promise,
  paymentDate,
  amountPaid,
  paymentMethod,
  newPromisedDate,
  notes,
}) {
  const paidAmount = Number(amountPaid || 0);
  const oldRemaining = Number(promise.remaining_amount || 0);

  if (paidAmount <= 0) {
    throw new Error("Payment amount must be greater than 0.");
  }

  if (paidAmount >= oldRemaining) {
    throw new Error("For full payment, use Mark Paid instead.");
  }

  if (!newPromisedDate) {
    throw new Error("New promised date is required for remaining balance.");
  }

  const newRemaining = Math.max(oldRemaining - paidAmount, 0);

  // 1. Create payment for the amount customer paid now
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      deal_id: promise.deal_id,
      promise_id: promise.id,
      payment_date: paymentDate,
      due_date: promise.original_due_date,
      amount_due: oldRemaining,
      amount_paid: paidAmount,
      remaining_amount: newRemaining,
      payment_method: paymentMethod,
      payment_type: "Partial Promise Payment",
      notes:
        notes ||
        `Partial promise payment received. Paid ${paidAmount}, remaining ${newRemaining}.`,
    })
    .select()
    .single();

  if (paymentError) throw paymentError;

  // 2. Mark old promise as Partial Paid
  const { error: oldPromiseError } = await supabase
    .from("payment_promises")
    .update({
      promise_status: "Partial Paid",
      notes:
        notes ||
        `Partial payment received. Remaining amount re-promised for ${newPromisedDate}.`,
    })
    .eq("id", promise.id);

  if (oldPromiseError) throw oldPromiseError;

  // 3. Create new promise for remaining amount
  const { data: newPromise, error: newPromiseError } = await supabase
    .from("payment_promises")
    .insert({
      deal_id: promise.deal_id,
      original_due_date: promise.original_due_date,
      amount_due: promise.amount_due,
      amount_paid_now: Number(promise.amount_paid_now || 0) + paidAmount,
      remaining_amount: newRemaining,
      promised_date: newPromisedDate,
      promise_status: "Pending",
      notes:
        notes ||
        `Remaining promise amount ${newRemaining} promised for ${newPromisedDate}.`,
      parent_promise_id: promise.id,
      rescheduled_from_date: promise.promised_date,
      reschedule_reason: "Partial promise payment received and remaining amount re-promised.",
    })
    .select()
    .single();

  if (newPromiseError) throw newPromiseError;

  return {
    payment,
    oldPromiseId: promise.id,
    newPromise,
  };
}