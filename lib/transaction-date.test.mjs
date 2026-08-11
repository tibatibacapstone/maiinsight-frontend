import test from "node:test"
import assert from "node:assert/strict"

import {
  formatDatabaseLastSyncDateTime,
  formatLatestTransactionDate,
  TRANSACTION_DATE_TIME_ZONE,
} from "./transaction-date.ts"

test("latest transaction formatting uses the explicit Bangkok reporting calendar", () => {
  assert.equal(TRANSACTION_DATE_TIME_ZONE, "Asia/Bangkok")
  assert.equal(formatLatestTransactionDate("2026-07-30T00:00:00.000Z"), "Jul 30, 2026")
})

test("Bangkok midnight and date-only values do not shift to the previous day", () => {
  assert.equal(formatLatestTransactionDate("2026-07-29T17:00:00.000Z"), "Jul 30, 2026")
  assert.equal(formatLatestTransactionDate("2026-07-30"), "Jul 30, 2026")
})

test("missing or malformed values display No data", () => {
  assert.equal(formatLatestTransactionDate(null), "No data")
  assert.equal(formatLatestTransactionDate(undefined), "No data")
  assert.equal(formatLatestTransactionDate("not-a-date"), "No data")
})

test("database Last sync includes time and preserves the Bangkok calendar convention", () => {
  assert.equal(
    formatDatabaseLastSyncDateTime("2026-08-10T19:03:00.000Z"),
    "Aug 11, 2026, 2:03 AM"
  )
  assert.equal(formatDatabaseLastSyncDateTime(null), "Not synced yet")
})
