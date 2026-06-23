import { supabase } from "../supabaseClient";

export async function logActivity({
  action,
  module,
  entity_type = "",
  entity_id = "",
  entity_label = "",
  description = "",
  metadata = {},
}) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("activity_logs").insert({
      user_id: user?.id || null,
      user_email: user?.email || "",
      action,
      module,
      entity_type,
      entity_id: entity_id ? String(entity_id) : "",
      entity_label,
      description,
      metadata,
    });

    if (error) {
      console.warn("Activity log failed:", error.message);
    }
  } catch (error) {
    console.warn("Activity log failed:", error.message);
  }
}

export async function getActivityLogs({
  search = "",
  module = "",
  action = "",
  startDate = "",
  endDate = "",
  limit = 250,
} = {}) {
  let query = supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (module) {
    query = query.eq("module", module);
  }

  if (action) {
    query = query.eq("action", action);
  }

  if (startDate) {
    query = query.gte("created_at", `${startDate}T00:00:00`);
  }

  if (endDate) {
    query = query.lte("created_at", `${endDate}T23:59:59`);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  const text = search.trim().toLowerCase();

  if (!text) return data || [];

  return (data || []).filter((log) => {
    const haystack = [
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

    return haystack.includes(text);
  });
}

export function formatActivityDate(dateString) {
  if (!dateString) return "—";

  return new Date(dateString).toLocaleString();
}