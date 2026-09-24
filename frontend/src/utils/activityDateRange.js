// UI date filters use the same local timezone as displayed activity timestamps.
export function activityDateBoundary(value, nextDay = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    throw new Error("Select a valid activity date.");
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error("Select a valid activity date.");
  }
  // Calendar arithmetic preserves local midnight across daylight-saving changes.
  if (nextDay) date.setDate(date.getDate() + 1);
  return date.toISOString();
}
