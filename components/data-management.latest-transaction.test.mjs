import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(new URL("./data-management.tsx", import.meta.url), "utf8")

test("MaiinSight Database maps the backend maximum transaction date", () => {
  assert.match(
    source,
    /latestTransaction:\s*formatLatestTransactionDate\(summaryResult\.data\.latestTransactionDate\)/
  )
})

test("MaiinSight Database formats Last sync with date and time", () => {
  assert.match(
    source,
    /name:\s*"MaiinSight Database"[\s\S]*?lastSync:\s*formatDatabaseLastSyncDateTime\(latestBatchTime\)/
  )
})

test("the database card preserves Last sync and adds Latest transaction", () => {
  assert.match(source, /<p>Last sync:\s*\{source\.lastSync\}<\/p>/)
  assert.match(
    source,
    /Latest transaction:\s*\{source\.latestTransaction\s*\|\|\s*"No data"\}/
  )
})
