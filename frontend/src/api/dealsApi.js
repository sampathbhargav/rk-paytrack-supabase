import { supabase } from "../supabaseClient";

export async function getDeals() {
  const { data, error } = await supabase
    .from("deals")
    .select(`
      *,
      customers (
        customer_name,
        phone,
        email,
        address
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}

export async function getDealById(dealId) {
  const { data, error } = await supabase
    .from("deals")
    .select(`
      *,
      customers (
        customer_name,
        phone,
        email,
        address
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
        customer_name,
        phone,
        email,
        address
      )
    `)
    .eq("deal_tag", dealTag)
    .single();

  if (error) throw error;

  return data;
}

export async function createDeal(dealData) {
  const { data, error } = await supabase
    .from("deals")
    .insert({
      deal_tag: dealData.dealTag,
      customer_id: dealData.customerId,
      deal_type: dealData.dealType,
      deal_subtype:
        dealData.dealType === "In-house" ? dealData.dealSubtype || null : null,
      start_date: dealData.startDate || null,
      truck: dealData.truck,
      year: dealData.year,
      vin: dealData.vin,
      total_amount: Number(dealData.totalAmount || 0),
      monthly_payment: Number(dealData.monthlyPayment || 0),
      due_day: Number(dealData.dueDay || 0),
      term: Number(dealData.term || 0),
      maturity_date: dealData.maturityDate || null,
      status: "Active",
      notes: dealData.notes || "",
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateDeal(dealId, dealData) {
  const { data, error } = await supabase
    .from("deals")
    .update({
      deal_tag: dealData.dealTag,
      deal_type: dealData.dealType,
      deal_subtype:
        dealData.dealType === "In-house" ? dealData.dealSubtype || null : null,
      start_date: dealData.startDate || null,
      truck: dealData.truck,
      year: dealData.year,
      vin: dealData.vin,
      total_amount: Number(dealData.totalAmount || 0),
      monthly_payment: Number(dealData.monthlyPayment || 0),
      due_day: dealData.dueDay ? Number(dealData.dueDay) : null,
      term: dealData.term ? Number(dealData.term) : null,
      maturity_date: dealData.maturityDate || null,
      status: dealData.status || "Active",
      notes: dealData.notes || "",
    })
    .eq("id", dealId)
    .select()
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