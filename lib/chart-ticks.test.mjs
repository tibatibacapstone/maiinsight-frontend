import test from "node:test"
import assert from "node:assert/strict"

import { getDailyXTicks, getIsoDateParts } from "./chart-ticks.ts"

const makePoints = (dates) =>
  dates.map((date) => ({
    key: date,
    label: date.replace(/^\d{4}-(\d{2})-(\d{2})$/, "$1/$2"),
  }))

test("parses ISO date keys and rejects non-daily keys", () => {
  assert.deepEqual(getIsoDateParts("2026-03-01"), { year: 2026, month: 3, day: 1 })
  assert.equal(getIsoDateParts("2026-03"), null)
  assert.equal(getIsoDateParts("May"), null)
  assert.equal(getIsoDateParts(undefined), null)
  assert.equal(getIsoDateParts("not-a-date"), null)
})

test("daily mode shows only odd calendar days", () => {
  const ticks = getDailyXTicks(makePoints([
    "2026-03-01",
    "2026-03-02",
    "2026-03-03",
    "2026-03-04",
    "2026-03-05",
    "2026-03-06",
    "2026-03-07",
  ]))

  assert.deepEqual(ticks, ["03/01", "03/03", "03/05", "03/07"])
})

test("parity is based on the calendar day, not the array index", () => {
  // Even index, odd day -> must show; odd index, even day -> must hide.
  const ticks = getDailyXTicks(makePoints([
    "2026-03-01",
    "2026-03-02",
    "2026-03-03",
    "2026-03-04",
  ]))

  assert.deepEqual(ticks, ["03/01", "03/03"])
})

test("missing dates do not affect the odd-day rule", () => {
  const ticks = getDailyXTicks(makePoints([
    "2026-03-01",
    "2026-03-03",
    "2026-03-05",
    "2026-03-08",
    "2026-03-09",
  ]))

  assert.deepEqual(ticks, ["03/01", "03/03", "03/05", "03/09"])
})

test("1-day and 2-day ranges always keep every label", () => {
  assert.deepEqual(getDailyXTicks(makePoints(["2026-03-02"])), ["03/02"])
  assert.deepEqual(getDailyXTicks(makePoints(["2026-03-02", "2026-03-03"])), ["03/02", "03/03"])
})

test("3-day range hides the even date when two odd dates remain", () => {
  assert.deepEqual(getDailyXTicks(makePoints(["2026-03-01", "2026-03-02", "2026-03-03"])), ["03/01", "03/03"])
})

test("fallback: all-even dates keep every label so the X-axis is not empty", () => {
  const ticks = getDailyXTicks(makePoints([
    "2026-03-02",
    "2026-03-04",
    "2026-03-06",
    "2026-03-08",
  ]))

  assert.deepEqual(ticks, ["03/02", "03/04", "03/06", "03/08"])
})

test("fallback: a single odd date among evens keeps every label", () => {
  const ticks = getDailyXTicks(makePoints(["2026-03-02", "2026-03-03", "2026-03-04"]))

  assert.deepEqual(ticks, ["03/02", "03/03", "03/04"])
})

test("ranges crossing months still follow calendar-day parity", () => {
  const ticks = getDailyXTicks(makePoints([
    "2026-02-20",
    "2026-02-21",
    "2026-02-22",
    "2026-02-23",
    "2026-02-24",
    "2026-02-25",
    "2026-02-26",
    "2026-02-27",
    "2026-02-28",
    "2026-03-01",
    "2026-03-02",
    "2026-03-03",
    "2026-03-04",
    "2026-03-05",
    "2026-03-06",
    "2026-03-07",
    "2026-03-08",
    "2026-03-09",
    "2026-03-10",
  ]))

  assert.deepEqual(ticks, [
    "02/21",
    "02/23",
    "02/25",
    "02/27",
    "03/01",
    "03/03",
    "03/05",
    "03/07",
    "03/09",
  ])
})

test("ranges crossing years keep the day-of-month parity", () => {
  const ticks = getDailyXTicks(makePoints([
    "2026-12-30",
    "2026-12-31",
    "2027-01-01",
    "2027-01-02",
    "2027-01-03",
  ]))

  assert.deepEqual(ticks, ["12/31", "01/01", "01/03"])
})

test("leap day Feb 29 is odd and stays visible", () => {
  assert.deepEqual(getDailyXTicks(makePoints(["2024-02-29"])), ["02/29"])
  const ticks = getDailyXTicks(makePoints(["2024-02-28", "2024-02-29", "2024-03-01"]))
  assert.deepEqual(ticks, ["02/29", "03/01"])
})

test("monthly (non-daily) series returns undefined so the default ticks are kept", () => {
  const monthlyPoints = [
    { key: "2026-05", label: "May 26" },
    { key: "2026-06", label: "Jun 26" },
    { key: "2026-07", label: "Jul 26" },
  ]

  assert.equal(getDailyXTicks(monthlyPoints), undefined)
})

test("monthly occupancy points keyed by month name return undefined", () => {
  const monthlyPoints = [
    { key: "May", label: "May 26" },
    { key: "Jun", label: "Jun 26" },
  ]

  assert.equal(getDailyXTicks(monthlyPoints), undefined)
})

test("empty series returns undefined", () => {
  assert.equal(getDailyXTicks([]), undefined)
})
