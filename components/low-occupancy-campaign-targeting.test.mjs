import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const source = await readFile(new URL("./low-occupancy-targeting.tsx", import.meta.url), "utf8")
const api = await readFile(new URL("../lib/targeting.ts", import.meta.url), "utf8")

test("Campaign Targeting uses weekday and calendar-month analysis filters", () => {
  const start = source.indexOf("Campaign Targeting")
  const end = source.indexOf("Historical Campaign Performance", start)
  const filters = source.slice(start, end)
  for (const label of ["Campaign Day", "Analysis Period", "Court Type", "Play Session", "Target Customer", "RFM Segment"]) {
    assert.match(filters, new RegExp(label))
  }
  assert.ok(filters.indexOf("Campaign Day") < filters.indexOf("Analysis Period"))
  assert.ok(filters.indexOf("Analysis Period") < filters.indexOf("Court Type"))
  assert.doesNotMatch(filters, /Campaign Date|Minimum Session Booking Count/)
})

test("recommendation request uses campaign day and analysis period without obsolete parameters", () => {
  assert.match(api, /campaignDay: string/)
  assert.match(api, /analysisPeriodMonths: number/)
  assert.doesNotMatch(api, /minSessionBookingCount|campaignDate/)
})

test("monthly cards expose facility occupancy, filled slots, revenue, and partial-period date", () => {
  assert.match(source, /monthlyPerformance\.map/)
  assert.match(source, /Occupancy Rate/)
  assert.match(source, />Filled Slots</)
  assert.match(source, />Revenue</)
  assert.match(source, /Rp \{month\.revenue\.toLocaleString/)
  assert.match(source, /Data through/)
})

test("campaign history is labeled and typed with latest play-date semantics", () => {
  assert.match(source, /anchored to the latest available play date/)
  assert.match(source, /no valid play-date history exists/)
  assert.match(api, /latestPlayDate: string \| null/)
  assert.doesNotMatch(api, /latestTransactionDate: string \| null/)
})

test("recommended customer table preserves readable columns and priority emphasis", () => {
  const tableStart = source.indexOf('<table className="min-w-[1900px]')
  const tableEnd = source.indexOf("</table>", tableStart)
  const table = source.slice(tableStart, tableEnd)

  assert.match(source, /max-w-full overflow-x-auto/)
  assert.match(table, /text-center align-middle font-semibold/)
  assert.match(table, /min-w-\[120px\] whitespace-nowrap[^\n]*lastBookingDate/)
  assert.match(table, /min-w-\[125px\] whitespace-nowrap[^\n]*avgSpend/)
  assert.match(table, /bg-orange-50 text-orange-700/)
  assert.match(table, /bg-muted text-muted-foreground/)
  assert.match(table, /Score: \{customer\.targetPriorityScore\}/)
  assert.match(table, /Copy Phone/)
  assert.match(table, /Generate Message/)
  assert.match(table, /Open AI Workspace/)
})

test("historical summary precedes the responsive monthly breakdown", () => {
  const sectionStart = source.indexOf('title="Historical Campaign Performance"')
  const sectionEnd = source.indexOf('title="Recommended Customers"', sectionStart)
  const section = source.slice(sectionStart, sectionEnd)

  assert.ok(section.indexOf("historicalSummary &&") < section.indexOf("monthlyPerformance.map"))
  assert.match(section, /sm:grid-cols-2 xl:grid-cols-4/)
  assert.match(section, /border-primary\/20 bg-primary\/15/)
  assert.match(section, /Monthly Breakdown/)
  assert.match(section, /grid gap-4 sm:grid-cols-2 xl:grid-cols-4/)
  assert.match(section, /flex h-full flex-col/)
  assert.match(section, /mt-4 grid grid-cols-2 gap-3/)
  assert.match(section, /whitespace-nowrap font-semibold[^\n]*month\.revenue/)
  assert.doesNotMatch(section, /min-h-64/)
})

test("Average Filled Slots keeps its value and shows a non-percent monthly unit", () => {
  const labelStart = source.indexOf("Average Filled Slots")
  const nextCard = source.indexOf("Average Monthly Revenue", labelStart)
  const card = source.slice(labelStart, nextCard)

  assert.match(card, /historicalSummary\.averageFilledSlots/)
  assert.match(card, /slots\/month/)
  assert.doesNotMatch(card, /averageFilledSlots[^\n]*%/)
  assert.match(source, /min-h-20/)
})

test("recommended customer header and body share subtle vertical dividers", () => {
  assert.match(source, /rounded-2xl border border-border/)
  assert.match(source, /\[&_th:not\(:last-child\)\]:border-r/)
  assert.match(source, /\[&_td:not\(:last-child\)\]:border-r/)
  assert.match(source, /border-border\/70/)
})

test("page Booking Type filter reserves space and lists booking type options", () => {
  const filterStart = source.indexOf('<Select value={selectedBookingType}')
  const filterEnd = source.indexOf('</Select>', filterStart)
  const filter = source.slice(source.lastIndexOf('<div className=', filterStart), filterEnd)

  assert.match(filter, /w-\[210px\] min-w-\[210px\]/)
  assert.match(filter, /h-11 w-full rounded-xl/)
  assert.match(filter, /flex min-w-0 flex-1 items-center gap-3/)
  assert.match(filter, /SelectValue placeholder="Booking Type" className="whitespace-nowrap"/)
  assert.match(filter, /w-\[var\(--radix-select-trigger-width\)\]/)
  assert.match(filter, /BOOKING_TYPE_OPTIONS/)
})
