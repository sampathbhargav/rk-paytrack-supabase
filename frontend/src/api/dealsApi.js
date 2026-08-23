import { supabase } from "../supabaseClient";

const customerJoin = `
  id,
  customer_name,
  company_name,
  phone,
  email,
  address
`;

function normalizeReferralPaid(value) {
  return (
    value === true ||
    value === "true" ||
    value === "Yes" ||
    value === "Paid"
  );
}

function normalizeReferralAmount(dealData) {
  const isPaid = normalizeReferralPaid(dealData.referralMoneyPaid);

  if (!isPaid) return 0;

  return Number(dealData.referralAmountPaid || 0);
}

function normalizePaymentFrequency(dealData) {
  if (dealData.dealType === "Cash") return null;

  if (dealData.dealType === "Registration Money") {
    return "One-Time";
  }

  return dealData.paymentFrequency || dealData.payment_frequency || "Monthly";
}

function normalizeFirstPaymentDate(dealData) {
  const paymentFrequency = normalizePaymentFrequency(dealData);

  if (paymentFrequency !== "Biweekly" && paymentFrequency !== "Semi-Monthly") {
    return null;
  }

  return (
    dealData.firstPaymentDate ||
    dealData.first_payment_date ||
    dealData.startDate ||
    null
  );
}

function normalizeSecondDueDay(dealData) {
  const paymentFrequency = normalizePaymentFrequency(dealData);

  if (paymentFrequency !== "Semi-Monthly") {
    return null;
  }

  const secondDueDay = dealData.secondDueDay ?? dealData.second_due_day;

  if (secondDueDay === "" || secondDueDay === null || secondDueDay === undefined) {
    return null;
  }

  return Number(secondDueDay);
}

function normalizePrincipalAmount(dealData) {
  const principalAmount = dealData.principalAmount ?? dealData.principal_amount;

  if (
    principalAmount === "" ||
    principalAmount === null ||
    principalAmount === undefined
  ) {
    return null;
  }

  return Number(principalAmount || 0);
}

function normalizeDueDay(dealData) {
  const isCashDeal = dealData.dealType === "Cash";
  const isRegistrationMoneyDeal = dealData.dealType === "Registration Money";
  const paymentFrequency = normalizePaymentFrequency(dealData);

  if (isCashDeal) return null;

  if (isRegistrationMoneyDeal) {
    return dealData.dueDay ? Number(dealData.dueDay) : null;
  }

  if (paymentFrequency === "Biweekly") return null;

  if (paymentFrequency === "Semi-Monthly") {
    return dealData.dueDay ? Number(dealData.dueDay) : null;
  }

  return dealData.dueDay ? Number(dealData.dueDay) : null;
}

function normalizeTerm(dealData) {
  if (dealData.dealType === "Cash") return null;

  if (dealData.dealType === "Registration Money") {
    return 1;
  }

  return dealData.term ? Number(dealData.term) : null;
}

function normalizeMonthlyPayment(dealData) {
  if (dealData.dealType === "Cash") return 0;

  if (dealData.dealType === "Registration Money") {
    return Number(dealData.totalAmount || 0);
  }

  return Number(dealData.monthlyPayment || 0);
}

function buildDealPayload(dealData) {
  const isCashDeal = dealData.dealType === "Cash";

  const referralMoneyPaid = normalizeReferralPaid(dealData.referralMoneyPaid);
  const paymentFrequency = normalizePaymentFrequency(dealData);
  const firstPaymentDate = normalizeFirstPaymentDate(dealData);
  const secondDueDay = normalizeSecondDueDay(dealData);

  return {
    deal_tag: dealData.dealTag,
    customer_id: dealData.customerId,

    deal_type: dealData.dealType,
    deal_subtype:
      dealData.dealType === "In-house" ? dealData.dealSubtype || null : null,

    start_date: dealData.startDate || null,

    payment_frequency: paymentFrequency,
    first_payment_date: firstPaymentDate,
    second_due_day: secondDueDay,

    truck: dealData.truck || "",
    year: dealData.year || "",
    vin: dealData.vin || "",

    total_amount: Number(dealData.totalAmount || 0),
    principal_amount: normalizePrincipalAmount(dealData),

    monthly_payment: normalizeMonthlyPayment(dealData),

    due_day: normalizeDueDay(dealData),

    term: normalizeTerm(dealData),

    maturity_date: isCashDeal ? null : dealData.maturityDate || null,

    referred_by_name: dealData.referredByName || "",
    referred_by_phone: dealData.referredByPhone || "",
    referral_money_paid: referralMoneyPaid,
    referral_amount_paid: normalizeReferralAmount(dealData),

    status: dealData.status || "Active",
    notes: dealData.notes || "",
  };
}

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
  const payload = buildDealPayload(dealData);

  const { data, error } = await supabase
    .from("deals")
    .insert(payload)
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
  const payload = {
    ...buildDealPayload(dealData),
    updated_at: new Date().toISOString(),
  };

  delete payload.customer_id;

  const { data, error } = await supabase
    .from("deals")
    .update(payload)
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

export async function getDealByIdOrTag(value) {
  if (!value) {
    throw new Error("Deal ID or deal tag is required.");
  }

  const searchValue = String(value).trim();

  const { data, error } = await supabase
    .from("deals")
    .select(
      `
      *,
      customers (*)
    `
    )
    .or(`id.eq.${searchValue},deal_tag.eq.${searchValue}`)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`No deal found for ${searchValue}.`);
  }

  return data;
}