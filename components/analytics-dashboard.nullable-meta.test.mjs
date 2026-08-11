import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

const source = await readFile(new URL("./analytics-dashboard.tsx", import.meta.url), "utf8")

test("AnalyticsDashboard types historical Meta summary and trend values as nullable", () => {
  assert.match(source, /totalViews: NullableMetric/)
  assert.match(source, /totalReach: NullableMetric/)
  assert.match(source, /totalInteractions: NullableMetric/)
  assert.match(source, /engagementRate: NullableMetric/)
});

test("revenue comparison chart preserves null points instead of coercing them to zero", () => {
  assert.match(source, /const reach = finiteMetric\(metaPoint\?\.reach\)/)
  assert.match(source, /views: finiteMetric\(metaPoint\?\.views\)/)
  assert.match(source, /: null,/)
  assert.doesNotMatch(source, /Number\(metaPoint\?\.reach \|\| 0\)/)
});

test("Meta KPI renderers do not replace unavailable Reach or engagement with zero", () => {
  assert.match(source, /formatCompactNumber\(metaDashboard\?\.summary\.totalReach\)/)
  assert.match(source, /formatPercent\(metaDashboard\?\.summary\.engagementRate\)/)
  assert.doesNotMatch(source, /formatPercent\(metaDashboard\?\.summary\.engagementRate \|\| 0\)/)
});
