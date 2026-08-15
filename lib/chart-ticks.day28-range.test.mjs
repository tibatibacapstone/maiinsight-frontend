// Locks in the fixed day-of-month milestone pattern for long daily ranges
// (e.g. a full 28-31 day MTD month) on the Revenue Trend and Occupancy
// Trend X-axes: 1, 5, 10, 15, 20, 25, and the actual last day of the month.
//
// History: the axis originally used exactly this milestone set, which
// orphaned day 28 (it jumped from 25 straight to 30/31 with no nearby
// label). That was fixed by switching to "every odd calendar day", but for
// a full month that meant 14-16 visible labels — too crowded to read. The
// milestone pattern was then explicitly requested back for its familiar,
// predictable rhythm, accepting that day 28 (in 30/31-day months) again
// sits a few days from its nearest label as a deliberate readability
// tradeoff rather than a bug.

import test from "node:test"
import assert from "node:assert/strict"

import { getDailyXTicks } from "./chart-ticks.ts"

// Backend labels look like "Aug 12" (en-US, month: "short", day: "numeric").
// The analytics dashboard's XAxis now uses `ticks` containing those labels,
// derived from `getDailyXTicks(...)` after looking them up via the raw ISO
// `key` (e.g. "2026-08-12"). So the function needs the raw ISO `key` to
// determine which day it is; the `label` is only carried through to the
// chart.

const makeBackendPoint = (isoDate) => {
  const [, month, day] = isoDate.split("-").map(Number)
  const monthName = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ][month - 1]
  return { key: isoDate, label: `${monthName} ${day}` }
}

const makeMonthRange = (year, month) => {
  // Build 1..lastDay-of-month daily points. Leap years return 29 for Feb.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const days = []
  for (let day = 1; day <= lastDay; day++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    days.push(makeBackendPoint(iso))
  }
  return { days, lastDay }
}

test("August (31 days) keeps 1, 5, 10, 15, 20, 25, and the last day (31)", () => {
  const { days } = makeMonthRange(2026, 8)
  const ticks = getDailyXTicks(days)
  assert.deepEqual(ticks, ["Aug 1", "Aug 5", "Aug 10", "Aug 15", "Aug 20", "Aug 25", "Aug 31"])
})

test("April (30 days) keeps 1, 5, 10, 15, 20, 25, and the last day (30)", () => {
  const { days, lastDay } = makeMonthRange(2026, 4)
  assert.equal(lastDay, 30)
  const ticks = getDailyXTicks(days)
  assert.deepEqual(ticks, ["Apr 1", "Apr 5", "Apr 10", "Apr 15", "Apr 20", "Apr 25", "Apr 30"])
})

test("January (31 days) keeps 1, 5, 10, 15, 20, 25, and the last day (31)", () => {
  const { days } = makeMonthRange(2026, 1)
  const ticks = getDailyXTicks(days)
  assert.deepEqual(ticks, ["Jan 1", "Jan 5", "Jan 10", "Jan 15", "Jan 20", "Jan 25", "Jan 31"])
})

test("ordinary February (28 days) keeps 1, 5, 10, 15, 20, 25, and the last day (28)", () => {
  const { days, lastDay } = makeMonthRange(2026, 2)
  assert.equal(lastDay, 28)
  const ticks = getDailyXTicks(days)
  // 25 and 28 (the last day) are both milestones/kept here; no duplicate.
  assert.deepEqual(ticks, ["Feb 1", "Feb 5", "Feb 10", "Feb 15", "Feb 20", "Feb 25", "Feb 28"])
})

test("leap February (29 days) keeps 1, 5, 10, 15, 20, 25, and the last day (29)", () => {
  const { days, lastDay } = makeMonthRange(2024, 2)
  assert.equal(lastDay, 29)
  const ticks = getDailyXTicks(days)
  assert.deepEqual(ticks, ["Feb 1", "Feb 5", "Feb 10", "Feb 15", "Feb 20", "Feb 25", "Feb 29"])
})

test("Revenue Trend and Occupancy Trend see identical milestones for a fixed month", () => {
  // Same month, same formatter. Both feeds go through getDailyXTicks, so the
  // kept labels must be byte-identical regardless of which backend endpoint
  // produced the points.
  const { days } = makeMonthRange(2026, 8)
  const revenueTicks = getDailyXTicks(days)
  const occupancyTicks = getDailyXTicks(days)
  assert.deepEqual(revenueTicks, occupancyTicks)
})

test("a full month keeps far fewer labels than the old every-odd-day density", () => {
  const { days } = makeMonthRange(2026, 8)
  const ticks = getDailyXTicks(days)
  // The odd-day rule would have kept 16 labels (1, 3, 5, ..., 31) for a
  // 31-day month; the milestone pattern keeps exactly 7.
  assert.equal(ticks.length, 7)
})

test("even dates (including day 28) remain in the data array — only labels are reduced", () => {
  // getDailyXTicks does NOT mutate the input — every input point is still
  // available for recharts to plot, even when it has no visible label.
  const { days } = makeMonthRange(2026, 8)
  const ticks = getDailyXTicks(days)
  assert.ok(!ticks.includes("Aug 28"), "day 28 is not a milestone and is not the last day, so it stays unlabeled")
  const day28Point = days.find((point) => point.key === "2026-08-28")
  assert.ok(day28Point, "day-28 data point must remain in the source array")
  assert.equal(day28Point.label, "Aug 28")
})

test("a milestone that coincides with the last day of the month is not duplicated", () => {
  // February in a non-leap year ends on day 28, which is not itself a
  // milestone (25 is the last milestone before it), so this is really just
  // "last day appended once" — but a 25-day month would end exactly on a
  // milestone and must still produce one entry, not two.
  const days = Array.from({ length: 25 }, (_, index) => {
    const day = index + 1
    return makeBackendPoint(`2026-05-${String(day).padStart(2, "0")}`)
  })
  const ticks = getDailyXTicks(days)
  assert.deepEqual(ticks, ["May 1", "May 5", "May 10", "May 15", "May 20", "May 25"])
})

test("an all-even daily series (short range) falls back to every label so the X-axis is not empty", () => {
  // If the data only contained even calendar days, the readability fallback
  // keeps every label so the user still sees an axis. This only applies
  // below the wide-spacing threshold — long ranges use the milestone rule.
  const points = [
    makeBackendPoint("2026-03-02"),
    makeBackendPoint("2026-03-04"),
    makeBackendPoint("2026-03-06"),
    makeBackendPoint("2026-03-08"),
    makeBackendPoint("2026-03-28"),
  ]
  const ticks = getDailyXTicks(points)
  assert.equal(ticks.length, 5)
})
