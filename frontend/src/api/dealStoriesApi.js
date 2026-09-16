import { supabase } from "../supabaseClient";

const fields = "id,title,body,created_at,updated_at";
export const STORY_PAGE_SIZE = 20;

export async function listDealStories(search = "", page = 0) {
  let query = supabase.from("deal_stories").select(fields, { count: "exact" });
  if (search.trim()) {
    const literal = search.trim().replace(/[\\%_]/g, "\\$&");
    query = query.ilike("search_text", `%${literal}%`);
  }
  const { data, count, error } = await query
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .range(page * STORY_PAGE_SIZE, (page + 1) * STORY_PAGE_SIZE - 1);
  if (error) throw error;
  return { stories: data, count };
}

export async function saveDealStory(draft, original) {
  const values = { title: draft.title.trim(), body: draft.body.trim() };
  if (!values.title || !values.body) throw new Error("Please enter a title and story.");
  if (values.title.length > 200 || values.body.length > 100000) {
    throw new Error("Use up to 200 characters for the title and 100,000 for the story.");
  }
  const query = original
    ? supabase.from("deal_stories").update(values)
      .eq("id", original.id).eq("updated_at", original.updated_at)
    : supabase.from("deal_stories").insert({ id: draft.id, ...values });
  const { data, error } = await query.select(fields).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("This story changed since you opened it. Copy your edits, close this window, and reopen the latest story before saving.");
  return data;
}
