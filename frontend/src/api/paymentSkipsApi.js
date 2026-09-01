import { supabase } from "../supabaseClient";

export async function getPaymentSkips() {
  const { data, error } = await supabase
    .from("payment_skips")
    .select("*")
    .neq("skip_status", "Cancelled")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function getPaymentSkipsByDealId(dealId) {
  if (!dealId) {
    throw new Error("Deal ID is required.");
  }

  const { data, error } = await supabase
    .from("payment_skips")
    .select("*")
    .eq("deal_id", dealId)
    .neq("skip_status", "Cancelled")
    .order("original_due_date", { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function addPaymentSkip(skipData) {
  if (!skipData.dealId) {
    throw new Error("Deal is required.");
  }

  if (!skipData.originalDueDate) {
    throw new Error("Original due date is required.");
  }

  if (!skipData.installmentNo) {
    throw new Error("Installment number is required.");
  }

  if (!skipData.amountDue || Number(skipData.amountDue) <= 0) {
    throw new Error("Amount due must be greater than 0.");
  }

  const { data: existingSkip, error: existingSkipError } = await supabase
    .from("payment_skips")
    .select("*")
    .eq("deal_id", skipData.dealId)
    .eq("original_due_date", skipData.originalDueDate)
    .neq("skip_status", "Cancelled")
    .maybeSingle();

  if (existingSkipError) throw existingSkipError;

  if (existingSkip) {
    throw new Error("This installment is already skipped.");
  }

  const { data, error } = await supabase
    .from("payment_skips")
    .insert({
      deal_id: skipData.dealId,
      original_due_date: skipData.originalDueDate,
      installment_no: Number(skipData.installmentNo),
      amount_due: Number(skipData.amountDue || 0),
      moved_due_date: skipData.movedDueDate || null,
      moved_installment_no: skipData.movedInstallmentNo
        ? Number(skipData.movedInstallmentNo)
        : null,
      skip_reason: skipData.skipReason || null,
      skip_status: "Active",
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function cancelPaymentSkip(skipId) {
  if (!skipId) {
    throw new Error("Skip ID is required.");
  }

  const { data, error } = await supabase
    .from("payment_skips")
    .update({
      skip_status: "Cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", skipId)
    .select()
    .single();

  if (error) throw error;

  return data;
}