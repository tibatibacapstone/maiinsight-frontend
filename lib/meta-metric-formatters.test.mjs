import assert from "node:assert/strict"
import test from "node:test"

import {
  buildMetaComparisonInsight,
  calculatePercentChange,
  formatMetaNumber,
  formatMetaPercent,
} from "./meta-metric-formatters.ts"

test("nullable and non-finite Meta percentages are unavailable without throwing", () => {
  for (const value of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(formatMetaPercent(value), "Not available")
  }
  assert.equal(formatMetaPercent(0), "0%")
  assert.equal(formatMetaPercent(12.34), "12.3%")
});

test("nullable Meta numbers remain unavailable while explicit zero remains zero", () => {
  assert.equal(formatMetaNumber(null), "Not available")
  assert.equal(formatMetaNumber(0), "0")
});

test("percentage comparison requires finite current and previous values and a nonzero denominator", () => {
  assert.equal(calculatePercentChange(null, 10), null)
  assert.equal(calculatePercentChange(10, null), null)
  assert.equal(calculatePercentChange(null, null), null)
  assert.equal(calculatePercentChange(10, 0), null)
  assert.equal(calculatePercentChange(0, 10), -100)
});

test("partial historical Meta metrics produce an unavailable comparison insight", () => {
  const common = {
    reportAvailable: true,
    configured: true,
    hasData: true,
    revenue: 100000,
  }
  assert.match(buildMetaComparisonInsight({ ...common, reach: null, engagementRate: 1 }), /not available/i)
  assert.match(buildMetaComparisonInsight({ ...common, reach: 100, engagementRate: null }), /not available/i)
  assert.match(buildMetaComparisonInsight({ ...common, reach: null, engagementRate: null }), /not available/i)
});

test("zero Reach never produces Infinity or NaN in comparison insight", () => {
  const insight = buildMetaComparisonInsight({
    reportAvailable: true,
    configured: true,
    hasData: true,
    revenue: 100000,
    reach: 0,
    engagementRate: 0,
  })
  assert.match(insight, /denominator is zero/i)
  assert.doesNotMatch(insight, /Infinity|NaN/)
});

test("finite Meta comparison remains formatted", () => {
  const insight = buildMetaComparisonInsight({
    reportAvailable: true,
    configured: true,
    hasData: true,
    revenue: 100000,
    reach: 1000,
    engagementRate: 2.5,
  })
  assert.match(insight, /2.5%/)
});
