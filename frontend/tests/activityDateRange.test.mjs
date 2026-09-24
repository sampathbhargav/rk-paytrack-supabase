import test from "node:test";
import assert from "node:assert/strict";
import { activityDateBoundary } from "../src/utils/activityDateRange.js";

process.env.TZ = "America/Chicago";

test("activity dates begin at local midnight, excluding the preceding evening", () => {
  assert.equal(activityDateBoundary("2026-09-17"), "2026-09-17T05:00:00.000Z");
  assert.equal(activityDateBoundary("2026-09-23", true), "2026-09-24T05:00:00.000Z");
});
test("exclusive next-day boundary includes the entire last second", () => {
  const end = activityDateBoundary("2026-09-23", true);
  assert.ok("2026-09-24T04:59:59.999Z" < end);
  assert.equal("2026-09-24T05:00:00.000Z" < end, false);
});
test("spring and fall daylight-saving days use calendar boundaries", () => {
  const hours = day => (Date.parse(activityDateBoundary(day, true)) - Date.parse(activityDateBoundary(day))) / 3600000;
  assert.equal(hours("2026-03-08"), 23);
  assert.equal(hours("2026-11-01"), 25);
});
test("rejects malformed and impossible dates", () => {
  for (const value of ["", "2026-02-30", "2026-13-01", "garbage"]) {
    assert.throws(() => activityDateBoundary(value), /valid activity date/);
  }
});
