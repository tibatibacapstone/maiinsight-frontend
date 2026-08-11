import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(new URL("./data-management.tsx", import.meta.url), "utf8")

test("data source cards render count, Last sync, and optional metadata on separate lines", () => {
  assert.match(source, /source\.records\.toLocaleString\(\)[\s\S]*?<\/p>\s*<p>Last sync:/)
  assert.match(source, /<p>Latest transaction:\s*\{source\.latestTransaction\s*\|\|\s*"No data"\}<\/p>/)
  assert.doesNotMatch(source, /suggestions"\s*:\s*"records"\}\s*-\s*Last sync/)
})

test("segmentation card renders canonical customers and Last run on separate lines", () => {
  assert.match(
    source,
    /mlSummary\.records\.toLocaleString\(\)\} customers<\/p>\s*<p>Last run: \{mlSummary\.lastRun\}<\/p>/
  )
  assert.doesNotMatch(source, /customers\s*-\s*Last run/)
  assert.doesNotMatch(source, /customers processed<\/p>/)
})

test("all four cards use full-height flex content with metadata filling space before actions", () => {
  assert.match(source, /dataSources\.map[\s\S]*?className="h-full border-border bg-card shadow-sm"/)
  assert.ok((source.match(/className="flex h-full flex-col pt-6"/g) || []).length >= 2)
  assert.ok((source.match(/className="mb-3 flex-1 space-y-1 text-sm text-muted-foreground"/g) || []).length >= 2)
})
