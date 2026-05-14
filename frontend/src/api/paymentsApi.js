import { supabase } from "../supabaseClient";
import { calculatePaymentType } from "../utils/statusCalculator";

export async function getPayments() {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      *,
      deals (
        deal_tag,
        truck,
        year,
        customers (
          customer_name,
          phone
        )
      )
    `)
    .order("payment_date", { ascending: false });

  if (error) throw error;

  return data;
}

export async function getPaymentsByDealId(dealId) {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("deal_id", dealId)
    .order("payment_date", { ascending: false });

  if (error) throw error;

  return data;
}

export async function addPayment(paymentData) {
  const amountDue = Number(paymentData.amountDue || 0);
  const amountPaid = Number(paymentData.amountPaid || 0);
  const remainingAmount = Math.max(amountDue - amountPaid, 0);

  const paymentType = calculatePaymentType({
    amountDue,
    amountPaid,
    promisedDate: paymentData.promisedDate,
  });

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      deal_id: paymentData.dealId,
      payment_date: paymentData.paymentDate,
      due_date: paymentData.dueDate,
      amount_due: amountDue,
      amount_paid: amountPaid,
      remaining_amount: remainingAmount,
      payment_method: paymentData.paymentMethod,
      payment_type: paymentType,
      notes: paymentData.notes,
    })
    .select()
    .single();

  await updateDealPaidOffStatus(paymentData.dealId);

  if (paymentError) throw paymentError;

  if (remainingAmount > 0 && paymentData.promisedDate) {
    const { error: promiseError } = await supabase
      .from("payment_promises")
      .insert({
        deal_id: paymentData.dealId,
        original_due_date: paymentData.dueDate,
        amount_due: amountDue,
        amount_paid_now: amountPaid,
        remaining_amount: remainingAmount,
        promised_date: paymentData.promisedDate,
        promise_status: "Pending",
        notes: paymentData.notes,
      });

    if (promiseError) throw promiseError;
  }

  return payment;
}

export async function updateDealPaidOffStatus(dealId) {
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id, total_amount, status")
    .eq("id", dealId)
    .single();

  if (dealError) throw dealError;

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("amount_paid, payment_status")
    .eq("deal_id", dealId)
    .neq("payment_status", "Voided");

  if (paymentsError) throw paymentsError;

  const totalPaid = payments.reduce(
    (sum, payment) => sum + Number(payment.amount_paid || 0),
    0
  );

  const totalAmount = Number(deal.total_amount || 0);

  if (totalAmount > 0 && totalPaid >= totalAmount && deal.status !== "Paid Off") {
    const { error } = await supabase
      .from("deals")
      .update({ status: "Paid Off" })
      .eq("id", dealId);

    if (error) throw error;
  }

  if (totalPaid < totalAmount && deal.status === "Paid Off") {
    const { error } = await supabase
      .from("deals")
      .update({ status: "Active" })
      .eq("id", dealId);

    if (error) throw error;
  }
}

export async function voidPayment(paymentId, reason) {
  if (!reason || !reason.trim()) {
    throw new Error("Void reason is required.");
  }

  const { data: payment, error: getError } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (getError) throw getError;

  const { data: voidedPayment, error } = await supabase
    .from("payments")
    .update({
      payment_status: "Voided",
      void_reason: reason,
      voided_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .select()
    .single();

  if (error) throw error;

  if (payment.promise_id) {
    await resetPromiseAfterPaymentVoid(payment.promise_id);
  }

  await updateDealPaidOffStatus(payment.deal_id);

  return voidedPayment;
}

async function resetPromiseAfterPaymentVoid(promiseId) {
  const { data: promise, error: promiseError } = await supabase
    .from("payment_promises")
    .select("*")
    .eq("id", promiseId)
    .single();

  if (promiseError) throw promiseError;

  const today = new Date().toISOString().split("T")[0];

  let newStatus = "Pending";

  if (promise.promised_date && promise.promised_date < today) {
    newStatus = "Broken";
  }

  const { error: updateError } = await supabase
    .from("payment_promises")
    .update({
      promise_status: newStatus,
      notes:
        promise.notes ||
        "Promise status reset because related promise payment was voided.",
    })
    .eq("id", promiseId);

  if (updateError) throw updateError;
}