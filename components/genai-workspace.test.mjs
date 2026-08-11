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
  assert.match(source, /Periode Analisis/)
  assert.doesNotMatch(
    source,
    /workspaceMode === "general"[\s\S]{0,300}<span>Periode Analisis<\/span>/
  )
  const outreachPayload = source.slice(
    source.indexOf('workspaceModeKey: "low_occupancy_outreach"'),
    source.indexOf("customer_segment_summary:")
  )
  assert.match(outreachPayload, /analysisPeriodKey/)
})

test("result preparation uses a light hierarchy with collapsed secondary data", () => {
  assert.match(source, /Segmen Terpilih:/)
  assert.match(source, /Rata-Rata Recency/)
  assert.match(source, /Rata-Rata Frekuensi/)
  assert.match(source, /Rata-Rata Monetary/)
  assert.match(source, /value="segment-details"/)
  assert.match(source, /Lihat Detail Segmen/)
  assert.match(source, /Peluang Utama/)
  assert.match(source, /Alternatif Sesi/)
  assert.match(source, /Ringkasan Peluang Bisnis/)
  assert.match(source, /Data Pendukung Utama/)
  assert.match(source, /value="complete-data"/)
  assert.match(source, /Lihat Data Lengkap/)
  assert.match(source, /formatIndonesianDate/)
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
  assert.match(source, /Objective otomatis untuk mode Low Occupancy Outreach/)
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
  assert.match(source, /Data recency tidak tersedia/)
  assert.match(source, /Inventory lapangan belum tersedia/)
  assert.match(source, /Promosi belum tercatat pada periode ini/)
  assert.match(source, /Target revenue belum dikonfigurasi untuk scope ini/)
  assert.doesNotMatch(source, /\?\? 0/)
})
