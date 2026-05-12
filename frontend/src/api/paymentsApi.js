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