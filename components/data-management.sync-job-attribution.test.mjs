import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(new URL("./data-management.tsx", import.meta.url), "utf8")

test("Sync Jobs maps the persisted actor using name, email, and legacy fallback priority", () => {
  assert.match(
    source,
    /performedByName:\s*job\.performedBy\?\.name\?\.trim\(\)\s*\|\|\s*job\.performedBy\?\.email\s*\|\|\s*"Unknown user"/
  )
  assert.doesNotMatch(source, /performedByName:\s*getStored|performedByName:\s*localStorage/)
})

test("every rendered job displays concise actor metadata", () => {
  assert.match(source, /Action by:\s*\{job\.performedByName\s*\|\|\s*"Unknown user"\}/)
  assert.match(source, /Started:\s*\{job\.startedAt\}/)
  assert.match(source, /Completed:\s*\{job\.completedAt\}/)
})

test("a failed upload reloads the persisted job instead of retaining an unattributed optimistic card", () => {
  const uploadHandler = source.match(
    /const handleUploadImport[\s\S]*?const handleRunMachineLearning/
  )?.[0] || ""

  assert.match(uploadHandler, /catch \(error\)[\s\S]*?await fetchSyncJobs\(\)/)
})

test("file actions retain the numeric source record identity", () => {
  assert.match(source, /\/imports\/batches\/\$\{job\.sourceRecordId\}\/rows/)
  assert.match(source, /\/imports\/jobs\/\$\{job\.sourceRecordId\}/)
})

test("manual database sync uses the persisted attributed backend action", () => {
  assert.match(source, /getApiUrl\("\/imports\/manual-sync"\)/)
  assert.match(source, /method:\s*"POST"/)
})
