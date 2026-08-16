import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

const source = await readFile(new URL("./instasight-hub.tsx", import.meta.url), "utf8")

test("historical KPI cards preserve unavailable values", () => {
  assert.match(source, /formatAvailableNumber\(dashboard\?\.summary\.totalViews\)/)
  assert.match(source, /formatAvailableNumber\(dashboard\?\.summary\.totalReach\)/)
  assert.match(source, /formatAvailableNumber\(dashboard\?\.summary\.totalInteractions\)/)
  assert.match(source, /formatAvailableNumber\(dashboard\?\.summary\.totalProfileViews\)/)
})

test("Reach and derived rates render their own partial-history coverage", () => {
  assert.match(source, /metricCoverage\?\.reach/)
  assert.match(source, /metricCoverage\?\.engagement_rate/)
  assert.match(source, /metricCoverage\?\.profile_visit_rate/)
  assert.match(source, /Partial history: \{coverage\.availableMonths\} of \{coverage\.totalMonths\} months available/)
})

test("Meta Metrics Trend explains historical account semantics and preserves null tooltip values", () => {
  assert.match(source, /Historical Instagram account activity during the selected calendar period/)
  assert.match(source, /Number\.isFinite\(value\)/)
})

test("filter changes load stored dashboard data and do not invoke sync", () => {
  const loader = source.match(/const loadMetaDashboard[\s\S]*?const topContent/)?.[0] || ""
  assert.match(loader, /\/meta\/dashboard/)
  assert.doesNotMatch(loader, /\/meta\/sync/)
})
