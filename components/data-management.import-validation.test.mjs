import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(new URL("./data-management.tsx", import.meta.url), "utf8")

test("upload error mapping preserves every backend validation error", () => {
  assert.match(
    source,
    /validationErrors:\s*Array\.isArray\(response\?\.validationErrors\)[\s\S]*?response\.validationErrors\s*:\s*\[\]/
  )
  assert.doesNotMatch(source, /response\.validationErrors\s*\.slice\s*\(/)
  assert.doesNotMatch(source, /response\.validationErrors\s*\[\s*0\s*\]/)
})

test("invalid rows table renders all returned entries in its scrollable area", () => {
  assert.match(source, /uploadError\.validationErrors\.map\(\(item, index\)\s*=>/)
  assert.match(source, /max-h-64 overflow-auto/)
  assert.match(source, />Row<\/th>/)
  assert.match(source, />Column<\/th>/)
  assert.match(source, />Value<\/th>/)
  assert.match(source, />Reason<\/th>/)
})
