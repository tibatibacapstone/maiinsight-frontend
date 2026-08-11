import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const source = await readFile(new URL("./data-management.tsx", import.meta.url), "utf8")

test("segmentation card displays the current eligible canonical customer count", () => {
  assert.match(source, /records:\s*result\.data\.eligibleCustomerCount\s*\|\|\s*0/)
  // The latest-run count remains available internally for existing consumers.
  assert.match(source, /totalCustomers:\s*latestSegmentationRun\?\.totalCustomers\s*\|\|\s*0/)
  assert.match(source, /mlSummary\.records\.toLocaleString\(\).*customers/s)
  assert.doesNotMatch(source, /mlSummary\.totalCustomers\.toLocaleString\(\).*customers processed/s)
})
