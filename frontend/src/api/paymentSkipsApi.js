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

  // ---------------------------------------------------------
  // STEP 1:
  // Get the skip record so we know:
  // - which deal it belongs to
  // - which installment was originally skipped
  // - the original due date
  // ---------------------------------------------------------

  const { data: skip, error: skipError } = await supabase
    .from("payment_skips")
    .select("*")
    .eq("id", skipId)
    .maybeSingle();

  if (skipError) {
    throw skipError;
  }

  if (!skip) {
    throw new Error("Skip record was not found.");
  }

  if (skip.skip_status === "Cancelled") {
    throw new Error("This payment skip has already been cancelled.");
  }

  if (!skip.deal_id) {
    throw new Error(
      "This skip does not have a deal associated with it and cannot be cancelled."
    );
  }

  if (!skip.original_due_date) {
    throw new Error(
      "This skip does not have an original due date and cannot be cancelled safely."
    );
  }

  // ---------------------------------------------------------
  // STEP 2:
  // Check if ANY payment has been made toward an installment
  // AFTER the skipped installment.
  //
  // IMPORTANT:
  // We compare payment.due_date with skip.original_due_date.
  //
  // We DO NOT compare payment_date because someone may pay a
  // future installment early.
  //
  // Example:
  //
  // Skipped installment:
  // Due Date: 07/05/2026
  //
  // Next installment:
  // Due Date: 08/05/2026
  //
  // Customer paid it early on:
  // Payment Date: 07/20/2026
  //
  // This still counts as a later installment and therefore
  // MUST prevent cancelling the skip.
  // ---------------------------------------------------------

  const { data: laterPayments, error: laterPaymentsError } = await supabase
    .from("payments")
    .select(`
      id,
      deal_id,
      due_date,
      payment_date,
      amount_paid,
      payment_status
    `)
    .eq("deal_id", skip.deal_id)
    .neq("payment_status", "Voided")
    .gt("due_date", skip.original_due_date)
    .gt("amount_paid", 0)
    .order("due_date", { ascending: true });

  if (laterPaymentsError) {
    throw laterPaymentsError;
  }

  // ---------------------------------------------------------
  // STEP 3:
  // If a later installment already has a payment,
  // DO NOT allow the skipped payment to be cancelled.
  // ---------------------------------------------------------

  if (laterPayments && laterPayments.length > 0) {
    const firstBlockingPayment = laterPayments[0];

    throw new Error(
      `This skip cannot be cancelled because a payment has already been recorded for a later installment due ${formatDateForMessage(
        firstBlockingPayment.due_date
      )}. Void all payments assigned to installments after the skipped installment before cancelling this skip.`
    );
  }

  // ---------------------------------------------------------
  // STEP 4:
  // No later installment payments exist.
  //
  // It is safe to cancel the skip.
  // ---------------------------------------------------------

  const { data, error } = await supabase
    .from("payment_skips")
    .update({
      skip_status: "Cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", skipId)
    .neq("skip_status", "Cancelled")
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

function formatDateForMessage(dateString) {
  if (!dateString) {
    return "an unknown date";
  }

  const [year, month, day] = String(dateString).split("-");

  if (!year || !month || !day) {
    return dateString;
  }

  return `${month}/${day}/${year}`;
}