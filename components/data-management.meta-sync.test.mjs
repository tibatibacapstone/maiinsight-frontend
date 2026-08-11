import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const source = await readFile(new URL("./data-management.tsx", import.meta.url), "utf8")

test("Meta retry uses the sync endpoint and refreshes data after success", () => {
  const metaSyncBlock = source.slice(
    source.indexOf('if (sourceId === "2")'),
    source.indexOf('if (sourceId === "3")'),
  )
  assert.match(metaSyncBlock, /getApiUrl\("\/meta\/sync"\)/)
  assert.match(metaSyncBlock, /method: "POST"/)

  const successBlock = source.slice(
    source.indexOf("await fetchDataCenter()", source.indexOf("const syncSource")),
    source.indexOf("} catch (error)", source.indexOf("const syncSource")),
  )
  assert.match(successBlock, /await fetchDataCenter\(\)/)
  assert.match(successBlock, /await fetchSyncJobs\(\)/)
})

test("failed sync always clears the active loading state so retry is available", () => {
  const syncSourceBlock = source.slice(
    source.indexOf("const syncSource"),
    source.indexOf("const fetchMlSummary"),
  )
  assert.match(syncSourceBlock, /catch \(error\)[\s\S]*status: "failed"/)
  assert.match(syncSourceBlock, /finally \{\s*setSyncingSourceId\(null\)\s*\}/)
})

test("Data Center delegates button blocking to the retry-aware state helper", () => {
  assert.match(source, /disabled=\{isSourceSyncDisabled\(\{/)
  assert.doesNotMatch(source, /disabled=\{source\.status === "error" \|\| syncingSourceId === source\.id\}/)
})
