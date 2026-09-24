import { supabase } from "../supabaseClient";
import { readAllRows } from "./readAllRows";
import { getPromises } from "./promisesApi";

// Stable unique ordering prevents equal dates from shuffling across pages.
// Resolve all reads before publishing a report; never present a partial load.
export async function getBusinessInsightsData() {
  const [deals, payments, promises, paymentSkips] = await Promise.all([
    readAllRows(() => supabase.from("deals").select("*, customers(*)").order("id")),
    readAllRows(() => supabase.from("payments").select("*").order("id")),
    getPromises(),
    readAllRows(() => supabase.from("payment_skips").select("*").neq("skip_status", "Cancelled").order("id")),
  ]);
  return { deals, payments, promises, paymentSkips };
}
