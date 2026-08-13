// Locks in the calendar-range guarantee that fixed the day-28 skip on the
// Revenue Trend and Occupancy Trend X-axes for the analytics dashboard.
// The helper `getDailyXTicks` keeps labels whose calendar day is odd; even
// days (including day 28) are still plotted by recharts, but for ranges
// short enough that "show every other day" would leave the axis readable,
// days 27 and 29 give the surrounding ticks so 28 itself is never orphaned
// from labels on either side.

import test from "node:test"
import assert from "node:assert/strict"

import { getDailyXTicks } from "./chart-ticks.ts"

// Backend labels look like "Aug 12" (en-US, month: "short", day: "numeric").
// The analytics dashboard's XAxis now uses `ticks` containing those labels,
// derived from `getDailyXTicks(...)` after looking them up via the raw ISO
// `key` (e.g. "2026-08-12"). So the function needs the raw ISO `key` to
// determine day parity; the `label` is only carried through to the chart.

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

test("August (31 days) labels 27 and 29, so day 28 is between two visible ticks", () => {
  const { days } = makeMonthRange(2026, 8)
  const ticks = getDailyXTicks(days)
  assert.ok(ticks.includes("Aug 27"), "expected Aug 27 in ticks")
  assert.ok(ticks.includes("Aug 29"), "expected Aug 29 in ticks")
})

test("April (30 days) labels 27 and 29, so day 28 is between two visible ticks", () => {
  const { days, lastDay } = makeMonthRange(2026, 4)
  assert.equal(lastDay, 30)
  const ticks = getDailyXTicks(days)
  assert.ok(ticks.includes("Apr 27"), "expected Apr 27 in ticks")
  assert.ok(ticks.includes("Apr 29"), "expected Apr 29 in ticks")
})

test("January (31 days) labels 27, 29, and 31 (last day is odd)", () => {
  const { days } = makeMonthRange(2026, 1)
  const ticks = getDailyXTicks(days)
  assert.ok(ticks.includes("Jan 27"))
  assert.ok(ticks.includes("Jan 29"))
  assert.ok(ticks.includes("Jan 31"))
})

test("ordinary February (28 days) labels 27 — the only odd day in February", () => {
  const { days, lastDay } = makeMonthRange(2026, 2)
  assert.equal(lastDay, 28)
  const ticks = getDailyXTicks(days)
  assert.ok(ticks.includes("Feb 27"))
})

test("leap February (29 days) labels 27 and 29 (Feb 29 is odd)", () => {
  const { days, lastDay } = makeMonthRange(2024, 2)
  assert.equal(lastDay, 29)
  const ticks = getDailyXTicks(days)
  assert.ok(ticks.includes("Feb 27"))
  assert.ok(ticks.includes("Feb 29"))
})

test("Revenue Trend and Occupancy Trend see identical parity for a fixed month", () => {
  // Same month, same formatter. Both feeds go through getDailyXTicks, so the
  // kept labels must be byte-identical regardless of which backend endpoint
  // produced the points.
  const { days } = makeMonthRange(2026, 8)
  const revenueTicks = getDailyXTicks(days)
  const occupancyTicks = getDailyXTicks(days)
  assert.deepEqual(revenueTicks, occupancyTicks)
})

test("even dates (including day 28) remain in the data array — only labels are reduced", () => {
  // getDailyXTicks does NOT mutate the input — every input point is still
  // available for recharts to plot. Day 28 is dropped from the tick labels
  // because it is even, but the data point for 2026-08-28 must still be
  // present in the original `days` array and the chart must plot it.
  const { days } = makeMonthRange(2026, 8)
  const ticks = getDailyXTicks(days)
  assert.ok(!ticks.includes("Aug 28"), "expected Aug 28 to be omitted from labels")
  const day28Point = days.find((point) => point.key === "2026-08-28")
  assert.ok(day28Point, "day-28 data point must remain in the source array")
  assert.equal(day28Point.label, "Aug 28")
})

test("an all-even daily series falls back to every label so the X-axis is not empty", () => {
  // If the data only contained even calendar days, the readability fallback
  // keeps every label so the user still sees an axis.
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