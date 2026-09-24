import { supabase } from "../supabaseClient";
import { activityDateBoundary } from "../utils/activityDateRange";

export async function logActivity(activity = {}) {
  try {
    if (!shouldSaveActivityLog(activity)) {
      return null;
    }

    const {
      action,
      module,
      entity_type,
      entity_id,
      entity_label,
      description,
      metadata,
    } = activity;

    /*
      Always identify the user from the active Supabase Auth session.

      We intentionally do NOT trust activity.user_email or localStorage for
      audit attribution. This ensures the activity log reflects the user who
      is actually authenticated in RK PayTrack.
    */
    const authenticatedUserEmail = await getAuthenticatedUserEmail();

    const payload = {
      action: normalizeAction(action),
      module: module || "System",
      entity_type: entity_type || "",
      entity_id: entity_id ? String(entity_id) : "",
      entity_label: entity_label || "",
      description: description || "",
      metadata: cleanActivityMetadata(metadata || {}),
      user_email: authenticatedUserEmail,
    };

    const { data, error } = await supabase
      .from("activity_logs")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Activity log failed:", error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Activity log failed:", error.message);
    return null;
  }
}

export async function getActivityLogs(filters = {}) {
  let query = supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (filters.module) {
    query = query.eq("module", filters.module);
  }

  if (filters.action) {
    query = query.eq("action", filters.action);
  }

  if (filters.startDate) {
    query = query.gte("created_at", activityDateBoundary(filters.startDate));
  }

  if (filters.endDate) {
    query = query.lt("created_at", activityDateBoundary(filters.endDate, true));
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const searchText = String(filters.search || "").trim().toLowerCase();

  if (!searchText) {
    return data || [];
  }

  return (data || []).filter((log) => {
    const searchableText = [
      log.user_email,
      log.action,
      log.module,
      log.entity_type,
      log.entity_id,
      log.entity_label,
      log.description,
      JSON.stringify(log.metadata || {}),
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(searchText);
  });
}

export function formatActivityDate(dateValue) {
  if (!dateValue) return "—";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
}

function shouldSaveActivityLog(activity = {}) {
  const action = normalizeAction(activity.action);
  const module = String(activity.module || "").trim();
  const moduleLower = module.toLowerCase();
  const description = String(activity.description || "").toLowerCase();
  const metadata = activity.metadata || {};

  /*
    IMPORTANT-EVENTS-ONLY AUDIT POLICY

    Save only events that matter for:
      - money / balances
      - payment schedules
      - promises / collections
      - critical deal status
      - destructive changes
      - data exports
      - security-sensitive changes
  */

  const ignoredActions = [
    "VIEW",
    "OPEN",
    "SEARCH",
    "REFRESH",
    "LOAD",
    "CLOSE",
    "NAVIGATE",
    "CLICK",
    "PRINT",
    "RECEIPT_VIEW",
    "MODAL_OPEN",
    "FILTER",
    "LOGIN",
    "LOGOUT",
  ];

  if (ignoredActions.includes(action)) {
    return false;
  }

  const ignoredDescriptionWords = [
    "viewed",
    "opened",
    "searched",
    "refreshed",
    "loaded",
    "clicked",
    "closed",
    "navigated",
    "printed receipt",
    "receipt printed",
    "account summary printed",
    "contract printed",
    "opened receipt",
    "viewed receipt",
    "filter applied",
  ];

  if (ignoredDescriptionWords.some((word) => description.includes(word))) {
    return false;
  }

  // Financial events are always important.
  if (action === "PAYMENT" || action === "VOID") {
    return true;
  }

  // Collection and schedule events are important.
  if (
    [
      "PROMISE",
      "RESCHEDULE",
      "CANCEL",
      "PAID",
      "STATUS_CHANGE",
      "SKIP",
      "SKIP_PAYMENT",
      "SKIP_CANCEL",
      "CANCEL_SKIP",
    ].includes(action)
  ) {
    return true;
  }

  if (action === "SECURITY" || action === "EXPORT") {
    return true;
  }

  // Important destructive changes only.
  if (action === "DELETE") {
    return [
      "deals",
      "payments",
      "customers",
      "promises",
      "maintenance",
      "payment skips",
      "payment-skips",
      "schedule",
    ].includes(moduleLower);
  }

  /*
    CREATE:
    Keep deal creation because it creates a financial obligation.
    Keep promise/skip creation if older code uses CREATE for those.
  */
  if (action === "CREATE") {
    if (moduleLower === "deals") {
      return true;
    }

    if (
      moduleLower === "promises" &&
      hasAnyWord(description, ["promise", "promised"])
    ) {
      return true;
    }

    if (
      ["payment skips", "payment-skips", "schedule"].includes(moduleLower) &&
      hasAnyWord(description, ["skip", "skipped"])
    ) {
      return true;
    }

    return false;
  }

  /*
    UPDATE:
    Deal edits are logged only when they affect important financial,
    schedule, balance, or status information.
  */
  if (action === "UPDATE") {
    if (moduleLower === "deals") {
      const importantDealWords = [
        "total amount",
        "principal",
        "payment amount",
        "monthly payment",
        "biweekly payment",
        "semi-monthly payment",
        "payment frequency",
        "term",
        "maturity",
        "due day",
        "second due day",
        "first payment date",
        "start date",
        "balance",
        "defaulted",
        "repo",
        "paid off",
        "status changed",
      ];

      const importantDealMetadata = [
        "old_status",
        "new_status",
        "total_amount",
        "old_total_amount",
        "new_total_amount",
        "principal_amount",
        "monthly_payment",
        "old_monthly_payment",
        "new_monthly_payment",
        "payment_frequency",
        "term",
        "due_day",
        "second_due_day",
        "first_payment_date",
        "maturity_date",
        "remaining_balance",
      ];

      return (
        hasAnyWord(description, importantDealWords) ||
        hasAnyMetadataKey(metadata, importantDealMetadata)
      );
    }

    if (moduleLower === "payments") {
      return (
        hasAnyWord(description, [
          "payment",
          "amount",
          "balance",
          "payment method",
          "due date",
          "void",
        ]) ||
        hasAnyMetadataKey(metadata, [
          "amount",
          "amount_paid",
          "payment_method",
          "payment_date",
          "due_date",
          "remaining_balance",
          "remaining_deal_balance",
          "void_reason",
        ])
      );
    }

    if (moduleLower === "promises") {
      return hasAnyWord(description, [
        "promise",
        "promised",
        "rescheduled",
        "cancelled",
        "canceled",
        "broken",
        "paid",
      ]);
    }

    if (
      ["payment skips", "payment-skips", "schedule"].includes(moduleLower)
    ) {
      return hasAnyWord(description, ["skip", "skipped", "cancel"]);
    }

    // Routine maintenance edits are ignored unless the money changed.
    if (moduleLower === "maintenance") {
      return (
        hasAnyWord(description, [
          "amount changed",
          "balance changed",
          "invoice total",
          "payment voided",
        ]) ||
        hasAnyMetadataKey(metadata, [
          "total_before",
          "total_after",
          "previous_balance",
          "remaining_balance",
          "amount_paid",
          "void_reason",
        ])
      );
    }

    return false;
  }

  return false;
}

function hasAnyWord(text, words = []) {
  return words.some((word) => text.includes(String(word).toLowerCase()));
}

function hasAnyMetadataKey(metadata = {}, keys = []) {
  return keys.some(
    (key) =>
      Object.prototype.hasOwnProperty.call(metadata, key) &&
      metadata[key] !== undefined &&
      metadata[key] !== null &&
      metadata[key] !== ""
  );
}

function normalizeAction(action) {
  return String(action || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function cleanActivityMetadata(metadata = {}) {
  const allowedMetadata = {};

  // Keep metadata compact but sufficient for financial/status investigation.
  const allowedKeys = [
    "deal_tag",
    "customer",
    "customer_name",
    "company",
    "company_name",
    "invoice_no",

    "amount",
    "amount_paid",
    "total_amount",
    "principal_amount",
    "monthly_payment",

    "payment_method",
    "payment_date",
    "payment_frequency",
    "due_date",
    "due_day",
    "second_due_day",
    "first_payment_date",
    "maturity_date",
    "term",

    "old_status",
    "new_status",

    "promise_date",
    "promised_date",
    "promised_amount",
    "promise_status",

    "remaining_balance",
    "remaining_deal_balance",
    "previous_balance",

    "void_reason",

    "installment_no",
    "installment_number",
    "original_due_date",
    "moved_due_date",
    "skip_reason",

    "old_total_amount",
    "new_total_amount",
    "old_monthly_payment",
    "new_monthly_payment",
    "total_before",
    "total_after",

    "report_name",
    "deal_type",
  ];

  allowedKeys.forEach((key) => {
    if (metadata[key] !== undefined && metadata[key] !== null) {
      allowedMetadata[key] = metadata[key];
    }
  });

  return allowedMetadata;
}

/*
  Get the actual authenticated RK PayTrack user.

  This replaces the previous localStorage-based attribution:
      localStorage.getItem("rk_user_email")

  Supabase Auth is now the source of truth for audit-log user attribution.
*/
async function getAuthenticatedUserEmail() {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.warn(
        "Unable to determine authenticated user for activity log:",
        error.message
      );
      return "system";
    }

    return user?.email || "system";
  } catch (error) {
    console.warn(
      "Unable to determine authenticated user for activity log:",
      error.message
    );
    return "system";
  }
}
