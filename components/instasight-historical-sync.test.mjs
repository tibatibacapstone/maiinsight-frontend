import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./instasight-hub.tsx", import.meta.url), "utf8");

test("Month and Year scope the dashboard request while Content Type remains table-local", () => {
  assert.match(source, /getMonthDateRange\(selectedYear, selectedMonth\)/);
  assert.match(source, /query\.set\("since", monthRange\.startDate\)/);
  assert.match(source, /query\.set\("until", monthRange\.endDate\)/);
  assert.doesNotMatch(source, /query\.set\("contentLabel", contentLabelFilter\)/);
  assert.match(source, /item\.contentLabel !== contentLabelFilter/);
  assert.match(source, /getApiUrl\(`\/meta\/dashboard\?\$\{query\.toString\(\)\}`\)/);
  const dashboardLoader = source.slice(
    source.indexOf("const loadMetaDashboard"),
    source.indexOf("useEffect(() =>", source.indexOf("const loadMetaDashboard"))
  )
  assert.doesNotMatch(dashboardLoader, /\/meta\/status/)
  assert.doesNotMatch(dashboardLoader, /\/meta\/sync/)
});

test("InstaSight no longer triggers Meta synchronization from this page", () => {
  assert.doesNotMatch(source, /getApiUrl\("\/meta\/sync"\)/)
  assert.doesNotMatch(source, /Sync Meta Data/)
})

test("unavailable metrics and accurate KPI labels are rendered", () => {
  assert.match(source, /value == null \? "Not available"/);
  assert.match(source, /title="Followers Snapshot"/);
  assert.match(source, /title="Profile Visit Rate"/);
  assert.match(source, /Views not available/);
});

test("stored data state preserves unavailable values and reports last successful sync", () => {
  assert.match(source, /Last successfully synced:/)
  assert.match(source, /hasRealData && \(status\?\.connectionState === "error" \|\| status\?\.configured === false\)/)
  assert.match(source, /Meta API is not connected yet/)
})
