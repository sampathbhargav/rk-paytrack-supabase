import { supabase } from "../supabaseClient";
import { logActivity } from "./activityLogsApi";

/*
  ============================================================
  GET FOLLOW-UPS FOR ONE CUSTOMER
  Used by the existing CustomerFollowUps.jsx component.
  KEEP THIS AS-IS.
  ============================================================
*/
export async function getCustomerFollowUps(customerId) {
  if (!customerId) return [];

  const { data, error } = await supabase
    .from("customer_followups")
    .select("*")
    .eq("customer_id", customerId)
    .order("followup_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return data || [];
}

/*
  ============================================================
  GET ALL CUSTOMER INTERACTIONS
  Used ONLY by the new standalone CustomerInteractions.jsx page.

  This does NOT change how CustomerFollowUps.jsx works.
  ============================================================
*/
export async function getAllCustomerFollowUps() {
  const pageSize = 1000;

  let from = 0;
  let allFollowUps = [];

  while (true) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("customer_followups")
      .select("*")
      .order("followup_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    allFollowUps = [...allFollowUps, ...(data || [])];

    if (!data || data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allFollowUps;
}

/*
  ============================================================
  CREATE FOLLOW-UP / CUSTOMER INTERACTION
  ============================================================
*/
export async function createCustomerFollowUp(payload) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const row = {
    customer_id: payload.customer_id,
    deal_id: payload.deal_id || null,
    maintenance_job_id: payload.maintenance_job_id || null,

    followup_type: payload.followup_type,
    contact_method: payload.contact_method || "Phone",
    note: payload.note,

    followup_date: payload.followup_date,
    next_followup_date: payload.next_followup_date || null,

    priority: payload.priority || "Normal",
    status: payload.status || "Completed",

    created_by_user_id: user?.id || null,
    created_by_email: user?.email || "",
  };

  const { data, error } = await supabase
    .from("customer_followups")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logActivity({
    action: "CREATE",
    module: "Follow-Ups",
    entity_type: "customer_followup",
    entity_id: data?.id,
    entity_label: payload.customer_name || "Customer Follow-Up",
    description: `${payload.followup_type} note added for ${
      payload.customer_name || "customer"
    }.`,
    metadata: {
      followup_id: data?.id || null,
      customer_id: payload.customer_id || null,
      customer_name: payload.customer_name || "",
      deal_id: payload.deal_id || null,
      maintenance_job_id: payload.maintenance_job_id || null,
      followup_type: payload.followup_type,
      contact_method: payload.contact_method,
      followup_date: payload.followup_date,
      next_followup_date: payload.next_followup_date || null,
      priority: payload.priority,
      status: payload.status,
    },
  });

  return data;
}

/*
  ============================================================
  UPDATE FOLLOW-UP STATUS
  ============================================================
*/
export async function updateCustomerFollowUpStatus(id, status) {
  const { data, error } = await supabase
    .from("customer_followups")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logActivity({
    action: "UPDATE",
    module: "Follow-Ups",
    entity_type: "customer_followup",
    entity_id: id,
    entity_label: "Customer Follow-Up",
    description: `Customer follow-up status changed to ${status}.`,
    metadata: {
      followup_id: id,
      status,
    },
  });

  return data;
}

/*
  ============================================================
  GET DUE / OVERDUE FOLLOW-UPS
  ============================================================
*/
export async function getDueCustomerFollowUps() {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("customer_followups")
    .select("*")
    .not("next_followup_date", "is", null)
    .lte("next_followup_date", today)
    .in("status", ["Open", "Needs Follow-up"])
    .order("next_followup_date", { ascending: true });

  if (error) throw new Error(error.message);

  return data || [];
}

/*
  ============================================================
  UPDATE FOLLOW-UP
  ============================================================
*/
export async function updateCustomerFollowUp(id, updates) {
  const { data, error } = await supabase
    .from("customer_followups")
    .update({
      followup_type: updates.followup_type,
      contact_method: updates.contact_method,
      note: updates.note,
      followup_date: updates.followup_date,
      next_followup_date: updates.next_followup_date,
      priority: updates.priority,
      status: updates.status,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/*
  ============================================================
  DELETE FOLLOW-UP
  ============================================================
*/
export async function deleteCustomerFollowUp(id) {
  const { error } = await supabase
    .from("customer_followups")
    .delete()
    .eq("id", id);

  if (error) throw error;

  return true;
}