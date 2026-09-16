// Stable ordering must be supplied by callers; continue to an empty page so
// a server-side response cap smaller than our requested page cannot hide rows.
export async function readAllRows(query) {
  const rows = [];
  for (;;) {
    const { data, error } = await query().range(rows.length, rows.length + 999);
    if (error) throw error;
    if (!data?.length) return rows;
    rows.push(...data);
  }
}
