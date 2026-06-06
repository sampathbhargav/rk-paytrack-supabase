import { supabase } from "../supabaseClient";
import { getPromises } from "./promisesApi";

export async function getCustomerProfileById(customerId) {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getDealsByCustomerId(customerId) {
  const { data, error } = await supabase
    .from("deals")
    .select(`
      *,
      customers (*)
    `)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function getPaymentsByDealIds(dealIds) {
  if (!dealIds || dealIds.length === 0) return [];

  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .in("deal_id", dealIds)
    .order("payment_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function getPromisesByDealIds(dealIds) {
    if (!dealIds || dealIds.length === 0) return [];
  
    const allPromises = await getPromises();
  
    return (allPromises || []).filter((promise) =>
      dealIds.includes(promise.deal_id)
    );
  }

export async function getMaintenanceJobsByCustomerId(customerId) {
  const { data, error } = await supabase
    .from("maintenance_jobs")
    .select(`
      *,
      maintenance_payments (*),
      maintenance_promises (*)
    `)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export function calculateDealTotals(deal, payments = []) {
  const activePayments = payments.filter(
    (payment) => payment.payment_status !== "Voided"
  );

  const totalAmount = Number(deal.total_amount || 0);

  const totalPaid = activePayments.reduce(
    (sum, payment) => sum + Number(payment.amount_paid || 0),
    0
  );

  const balance = Math.max(totalAmount - totalPaid, 0);

  return {
    totalAmount,
    totalPaid,
    balance,
    activePayments,
  };
}