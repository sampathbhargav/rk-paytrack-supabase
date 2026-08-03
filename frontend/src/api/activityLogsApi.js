import { supabase } from "../supabaseClient";

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
      user_email,
    } = activity;

    const payload = {
      action: normalizeAction(action),
      module: module || "System",
      entity_type: entity_type || "",
      entity_id: entity_id ? String(entity_id) : "",
      entity_label: entity_label || "",
      description: description || "",
      metadata: cleanActivityMetadata(metadata || {}),
      user_email: user_email || getCurrentUserEmail(),
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
    query = query.gte("created_at", `${filters.startDate}T00:00:00`);
  }

  if (filters.endDate) {
    query = query.lte("created_at", `${filters.endDate}T23:59:59`);
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
  const description = String(activity.description || "").toLowerCase();

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
    "opened receipt",
    "viewed receipt",
    "filter",
  ];

  if (ignoredDescriptionWords.some((word) => description.includes(word))) {
    return false;
  }

  const importantActions = [
    "CREATE",
    "UPDATE",
    "DELETE",
    "VOID",
    "PAYMENT",
    "PROMISE",
    "RESCHEDULE",
    "CANCEL",
    "PAID",
    "EXPORT",
    "STATUS_CHANGE",
    "LOGIN",
    "SECURITY",
  ];

  if (importantActions.includes(action)) {
    return true;
  }

  const importantModules = [
    "Deals",
    "Payments",
    "Promises",
    "Maintenance",
    "Customers",
    "Reports",
    "Auth",
  ];

  if (!importantModules.includes(module)) {
    return false;
  }

  const importantDescriptionWords = [
    "created",
    "updated",
    "deleted",
    "voided",
    "payment",
    "paid",
    "promise",
    "rescheduled",
    "cancelled",
    "canceled",
    "defaulted",
    "paid off",
    "completed",
    "exported",
    "status changed",
    "balance changed",
    "customer updated",
    "deal updated",
    "maintenance updated",
    "invoice updated",
  ];

  return importantDescriptionWords.some((word) =>
    description.includes(word)
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

  const allowedKeys = [
    "deal_tag",
    "customer",
    "company",
    "invoice_no",
    "amount",
    "payment_method",
    "payment_date",
    "due_date",
    "old_status",
    "new_status",
    "promise_date",
    "remaining_balance",
    "void_reason",
    "report_name",
    "deal_type",
    "payment_frequency",
  ];

  allowedKeys.forEach((key) => {
    if (metadata[key] !== undefined && metadata[key] !== null) {
      allowedMetadata[key] = metadata[key];
    }
  });

  return allowedMetadata;
}

function getCurrentUserEmail() {
  try {
    return localStorage.getItem("rk_user_email") || "system";
  } catch {
    return "system";
  }
}