import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

const source = await readFile(new URL("./analytics-dashboard.tsx", import.meta.url), "utf8")

// Locks in the day-28 fix: the analytics dashboard used to keep only the
// milestone days [1, 5, 10, 15, 20, 25, lastDay] on the X-axis. That meant
// day 28 was never labelled — it jumped from day 25 to day 30/31 in any
// 30- or 31-day month. The fix routes both Revenue Trend and Occupancy Trend
// through the shared `getDailyXTicks` helper so odd calendar days (28 is
// even, 27 and 29 are odd) are visible.

test("analytics dashboard imports the shared getDailyXTicks helper", () => {
  assert.match(source, /import \{ getDailyXTicks \} from "@\/lib\/chart-ticks"/)
})

test("analytics dashboard no longer defines the old shouldShowMtdTick milestone filter", () => {
  assert.doesNotMatch(source, /shouldShowMtdTick/)
  assert.doesNotMatch(source, /getLastDayOfMonth/)
  assert.doesNotMatch(source, /parts\.day === 25 \|\|\s*parts\.day === lastDay/)
})

test("both Revenue Trend and Occupancy Trend use getDailyXTicks for their X-axis ticks", () => {
  // The old milestone filter (`shouldShowMtdTick(point.key)`) was applied
  // inside two `useMemo` blocks. Both blocks should now call
  // `getDailyXTicks(...)` instead.
  const callCount = source.match(/getDailyXTicks\(/g)?.length ?? 0
  assert.ok(callCount >= 2, `expected at least 2 getDailyXTicks call sites, found ${callCount}`)
})

test("daily vs monthly mode is decided by periodType, not by an inline 28-day rule", () => {
  // The shared helper returns undefined for monthly series, so the XAxis
  // reverts to its default rendering. The component still gates the call
  // on periodType === "MTD" so YTD/monthly buckets keep month-name labels.
  assert.match(source, /\(periodType \|\| "MTD"\) !== "MTD"/)
})