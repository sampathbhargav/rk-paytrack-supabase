import { supabase } from "../supabaseClient";

const customerJoin = `
  id,
  customer_name,
  company_name,
  phone,
  email,
  address
`;

export async function getDeals() {
  const { data, error } = await supabase
    .from("deals")
    .select(`
      *,
      customers (
        ${customerJoin}
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function getDealById(dealId) {
  const { data, error } = await supabase
    .from("deals")
    .select(`
      *,
      customers (
        ${customerJoin}
      )
    `)
    .eq("id", dealId)
    .single();

  if (error) throw error;

  return data;
}

export async function getDealByTag(dealTag) {
  const { data, error } = await supabase
    .from("deals")
    .select(`
      *,
      customers (
        ${customerJoin}
      )
    `)
    .eq("deal_tag", dealTag)
    .single();

  if (error) throw error;

  return data;
}

export async function createDeal(dealData) {
  const isCashDeal = dealData.dealType === "Cash";

  const { data, error } = await supabase
    .from("deals")
    .insert({
      deal_tag: dealData.dealTag,
      customer_id: dealData.customerId,

      deal_type: dealData.dealType,
      deal_subtype:
        dealData.dealType === "In-house" ? dealData.dealSubtype || null : null,

      start_date: dealData.startDate || null,

      truck: dealData.truck || "",
      year: dealData.year || "",
      vin: dealData.vin || "",

      total_amount: Number(dealData.totalAmount || 0),
      monthly_payment: isCashDeal ? 0 : Number(dealData.monthlyPayment || 0),

      due_day: isCashDeal
        ? null
        : dealData.dueDay
        ? Number(dealData.dueDay)
        : null,

      term: isCashDeal ? null : dealData.term ? Number(dealData.term) : null,

      maturity_date: isCashDeal ? null : dealData.maturityDate || null,

      status: dealData.status || "Active",
      notes: dealData.notes || "",
    })
    .select(`
      *,
      customers (
        ${customerJoin}
      )
    `)
    .single();

  if (error) throw error;

  return data;
}

export async function updateDeal(dealId, dealData) {
  const isCashDeal = dealData.dealType === "Cash";

  const { data, error } = await supabase
    .from("deals")
    .update({
      deal_tag: dealData.dealTag,

      deal_type: dealData.dealType,
      deal_subtype:
        dealData.dealType === "In-house" ? dealData.dealSubtype || null : null,

      start_date: dealData.startDate || null,

      truck: dealData.truck || "",
      year: dealData.year || "",
      vin: dealData.vin || "",

      total_amount: Number(dealData.totalAmount || 0),
      monthly_payment: isCashDeal ? 0 : Number(dealData.monthlyPayment || 0),

      due_day: isCashDeal
        ? null
        : dealData.dueDay
        ? Number(dealData.dueDay)
        : null,

      term: isCashDeal ? null : dealData.term ? Number(dealData.term) : null,

      maturity_date: isCashDeal ? null : dealData.maturityDate || null,

      status: dealData.status || "Active",
      notes: dealData.notes || "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", dealId)
    .select(`
      *,
      customers (
        ${customerJoin}
      )
    `)
    .single();

  if (error) throw error;

  return data;
}

export async function checkDealTagExists(dealTag) {
  const { data, error } = await supabase
    .from("deals")
    .select("id, deal_tag")
    .eq("deal_tag", dealTag)
    .maybeSingle();

  if (error) throw error;

  return data;
}