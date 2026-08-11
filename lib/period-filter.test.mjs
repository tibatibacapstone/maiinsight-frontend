import assert from "node:assert/strict"
import test from "node:test"

import {
  formatBangkokDate,
  getBangkokCalendarDate,
  getPreviousCalendarMonth,
  REPORTING_TIME_ZONE,
  resolvePeriodDateRange,
} from "./period-filter.ts"

const monthFilter = (month, year, periodType = "MTD") => ({
  month,
  year,
  periodType,
})

test("reporting calendar explicitly uses Asia/Bangkok", () => {
  assert.equal(REPORTING_TIME_ZONE, "Asia/Bangkok")
  assert.deepEqual(
    getBangkokCalendarDate(new Date("2026-08-10T00:00:00.000Z")),
    { year: 2026, month: 8, day: 10 }
  )
})

test("one instant resolves to the Bangkok date regardless of UTC or New York calendar date", () => {
  const utcRepresentation = new Date("2026-07-31T18:30:00.000Z")
  const newYorkRepresentation = new Date("2026-07-31T14:30:00.000-04:00")
  assert.equal(utcRepresentation.getTime(), newYorkRepresentation.getTime())
  assert.equal(formatBangkokDate(utcRepresentation), "2026-08-01")
  assert.equal(formatBangkokDate(newYorkRepresentation), "2026-08-01")
  assert.deepEqual(resolvePeriodDateRange(monthFilter(8, 2026), utcRepresentation), {
    startDate: "2026-08-01",
    endDate: "2026-08-01",
  })
  assert.deepEqual(
    resolvePeriodDateRange(monthFilter(8, 2026), newYorkRepresentation),
    resolvePeriodDateRange(monthFilter(8, 2026), utcRepresentation)
  )
})

test("Bangkok midnight month boundary never falls back into the prior browser-local month", () => {
  const justAfterBangkokMidnight = new Date("2026-07-31T17:00:01.000Z")
  assert.deepEqual(getBangkokCalendarDate(justAfterBangkokMidnight), {
    year: 2026,
    month: 8,
    day: 1,
  })
})

test("August 2026 uses date-only full-month boundaries when it is not current", () => {
  assert.deepEqual(
    resolvePeriodDateRange(monthFilter(8, 2026), new Date("2026-09-15T00:00:00.000Z")),
    { startDate: "2026-08-01", endDate: "2026-08-31" }
  )
})

test("January comparison rolls back to December of the previous year", () => {
  assert.deepEqual(getPreviousCalendarMonth(2026, 1), { year: 2025, month: 12 })
  assert.deepEqual(getPreviousCalendarMonth(2026, 8), { year: 2026, month: 7 })
})

test("leap-year and ordinary February month lengths remain correct", () => {
  const afterBothPeriods = new Date("2029-03-01T00:00:00.000Z")
  assert.equal(resolvePeriodDateRange(monthFilter(2, 2028), afterBothPeriods).endDate, "2028-02-29")
  assert.equal(resolvePeriodDateRange(monthFilter(2, 2026), afterBothPeriods).endDate, "2026-02-28")
})

test("YTD and all-month ranges retain the date-only API contract", () => {
  const instant = new Date("2026-07-31T18:30:00.000Z")
  assert.deepEqual(resolvePeriodDateRange(monthFilter(8, 2026, "YTD"), instant), {
    startDate: "2026-01-01",
    endDate: "2026-08-01",
  })
  assert.deepEqual(resolvePeriodDateRange(monthFilter(null, 2026), instant), {
    startDate: "2026-01-01",
    endDate: "2026-08-01",
  })
})
