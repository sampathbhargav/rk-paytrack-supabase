import { supabase } from "../supabaseClient";
import { runPaymentOperation } from "./paymentOperationsApi";
import { readAllRows } from "./readAllRows";

export async function getPayments() {
  const pageSize = 1000;
  let from = 0;
  let allPayments = [];

  while (true) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        deals (
          id,
          deal_tag,
          deal_type,
          deal_subtype,
          payment_frequency,
          first_payment_date,
          second_due_day,
          start_date,
          due_day,
          monthly_payment,
          term,
          maturity_date,
          truck,
          year,
          customers (
            id,
            customer_name,
            company_name,
            phone,
            email,
            address
          )
        )
      `)
      .order("payment_date", { ascending: false })
      .range(from, to);

    if (error) throw error;

    allPayments = [...allPayments, ...(data || [])];

    if (!data || data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allPayments;
}

export async function getPaymentsByDealId(dealId) {
  return readAllRows(() => supabase.from("payments").select("*")
    .eq("deal_id", dealId).order("id"));
}

// One request includes every allocation. Never loop over individual inserts.
export async function savePaymentAllocations(payload) {
  return runPaymentOperation("record", payload);
}

export async function voidPayment(payment, reason) {
  if (!payment?.id || !payment.deal_id) throw new Error("Payment and deal are required.");
  if (!reason?.trim()) throw new Error("Void reason is required.");
  return runPaymentOperation("void", {
    dealId: payment.deal_id, paymentId: payment.id, reason: reason.trim(),
  });
}
