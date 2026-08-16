import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const source = await readFile(
  new URL("./genai-workspace.tsx", import.meta.url),
  "utf8"
)

test("General Strategy exposes canonical analysis periods with a three-month default", () => {
  for (const key of [
    "one_month",
    "three_months",
    "six_months",
    "twelve_months",
  ]) {
    assert.match(source, new RegExp(`key: "${key}"`))
  }
  assert.match(source, /useState<AnalysisPeriodKey>\("three_months"\)/)
  assert.match(source, /analysisPeriodKey,/)
  assert.match(source, /Analysis Period/)
  assert.doesNotMatch(
    source,
    /workspaceMode === "general"[\s\S]{0,300}<span>Analysis Period<\/span>/
  )
  const outreachPayload = source.slice(
    source.indexOf('workspaceModeKey: "low_occupancy_outreach"'),
    source.indexOf("customer_segment_summary:")
  )
  assert.match(outreachPayload, /analysisPeriodKey/)
})

test("result preparation uses a light hierarchy with collapsed secondary data", () => {
  assert.match(source, /Selected Segment:/)
  assert.match(source, /Average Recency/)
  assert.match(source, /Average Frequency/)
  assert.match(source, /Average Monetary/)
  assert.match(source, /value="segment-details"/)
  assert.match(source, /View Segment Details/)
  assert.match(source, /Primary Opportunity/)
  assert.match(source, /Alternative Sessions/)
  assert.match(source, /Business Opportunity Summary/)
  assert.match(source, /Key Supporting Data/)
  assert.match(source, /value="complete-data"/)
  assert.match(source, /View Full Data/)
  assert.match(source, /formatDisplayDate/)
  assert.match(source, /grid gap-3 sm:grid-cols-2 xl:grid-cols-4/)
})

test("outreach context and advanced settings remain compact and usable", () => {
  assert.match(source, /Low Occupancy Outreach Context/)
  assert.match(source, /Target Session/)
  assert.match(source, /Historical Activity/)
  assert.doesNotMatch(source, /Slot time not selected/)
  assert.match(source, /value="advanced-settings"/)
  assert.match(source, /Advanced Strategy Settings/)
  assert.match(source, /Generate Strategy/)
  assert.match(source, /sticky bottom-3/)
})

test("workspace mode remains interactive and enforces only the outreach objective", () => {
  assert.match(source, /Select value=\{workspaceMode\}/)
  assert.match(source, /value="general_strategy"/)
  assert.match(source, /value="low_occupancy_outreach"/)
  assert.match(source, /handleWorkspaceModeChange/)
  assert.match(source, /setLastGeneralStrategyObjective\(selectedObjective\)/)
  assert.match(source, /setSelectedObjective\(LOW_OCCUPANCY_OBJECTIVE\)/)
  assert.match(source, /setSelectedObjective\(lastGeneralStrategyObjective \|\| DEFAULT_GENERAL_OBJECTIVE\)/)
  assert.match(source, /setStrategy\(null\)/)
  assert.match(source, /workspaceMode === "low_occupancy_outreach"/)
  assert.match(source, /Objective is set automatically in Low Occupancy Outreach mode/)
  assert.match(source, /handleGeneralObjectiveChange/)
})

test("mode and objective payloads use canonical resolved keys", () => {
  for (const key of [
    "maximize_off_peak_occupancy",
    "drive_revenue_growth",
    "boost_social_media_conversion",
    "increase_customer_retention",
    "customer_reactivation",
  ]) {
    assert.match(source, new RegExp(`key: "${key}"`))
  }
  assert.match(source, /campaignObjectiveKey: LOW_OCCUPANCY_OBJECTIVE/)
  assert.match(source, /campaignObjectiveKey: selectedObjective/)
  assert.match(source, /body: JSON\.stringify\(requestPayload\)/)
  assert.match(source, /offerFrameworkKey: resolvedOfferFramework/)
})

test("offer framework is an optional AI-first manual override", () => {
  const offerOptions = source.slice(
    source.indexOf("const incentiveFrameworks"),
    source.indexOf("const copywritingTones")
  )
  for (const label of [
    "AI Recommended",
    "Discount Campaign",
    "Value Added Experience",
    "Bundle Promotion",
    "Loyalty Reward",
  ]) {
    assert.match(offerOptions, new RegExp(label))
  }
  assert.doesNotMatch(offerOptions, /Membership Conversion/)
  assert.match(source, /useState\(false\)/)
  assert.match(source, /advancedSettingsOpen \? selectedIncentive : "ai_recommended"/)
  assert.match(source, /offerFrameworkKey: resolvedOfferFramework/)
  assert.match(source, /incentiveFramework: resolvedOfferFramework/)
  assert.match(source, /value=\{advancedSettingsOpen \? "advanced-settings" : ""\}/)
})

test("missing supporting values use explanations instead of synthetic zeroes", () => {
  assert.match(source, /Recency data not available/)
  assert.match(source, /Court inventory not available/)
  assert.match(source, /No promotions recorded in this period/)
  assert.match(source, /Revenue target is not configured for this scope/)
  assert.doesNotMatch(source, /\?\? 0/)
})
