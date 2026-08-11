import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const source = await readFile(new URL("./instasight-hub.tsx", import.meta.url), "utf8")

const pageFiltersStart = source.indexOf("Page Filters")
const contentPerformanceStart = source.indexOf("Instagram Content Performance")
const pageFilters = source.slice(pageFiltersStart, contentPerformanceStart)
const toolbar = source.slice(contentPerformanceStart, source.indexOf("<CardContent>", contentPerformanceStart))

test("page filters contain Month and Year but no Content Type", () => {
  assert.match(pageFilters, />\s*Month\s*</)
  assert.match(pageFilters, />\s*Year\s*</)
  assert.doesNotMatch(pageFilters, />\s*Content Type\s*</)
})

test("Content Performance toolbar orders Search, Content Type, then Sort By", () => {
  const searchIndex = toolbar.indexOf("Search")
  const contentTypeIndex = toolbar.indexOf("Content Type")
  const sortIndex = toolbar.indexOf("Sort By")

  assert.ok(searchIndex >= 0)
  assert.ok(searchIndex < contentTypeIndex)
  assert.ok(contentTypeIndex < sortIndex)
  assert.match(toolbar, /<SelectItem value="all">All Type<\/SelectItem>/)
  assert.match(toolbar, /<SelectItem value="content_promotion">Promotion<\/SelectItem>/)
  assert.match(toolbar, /<SelectItem value="content_advertisement">Advertisement<\/SelectItem>/)
})

test("Content Type and Sort By reuse the Month custom dropdown system", () => {
  assert.doesNotMatch(toolbar, /<select\b|<option\b/)
  assert.equal(toolbar.match(/<Select value=/g)?.length, 2)
  assert.equal(toolbar.match(/<SelectTrigger className="h-10 w-full rounded-xl border bg-secondary\/60 px-4 shadow-sm">/g)?.length, 2)
  assert.equal(toolbar.match(/<SelectContent className="w-\[(?:220|210)px\] rounded-xl border bg-background shadow-lg">/g)?.length, 2)
})

test("Sort By retains every option in the custom dropdown", () => {
  assert.match(toolbar, /<SelectItem value="latest">Latest Content<\/SelectItem>/)
  assert.match(toolbar, /<SelectItem value="top_views">Top Views<\/SelectItem>/)
  assert.match(toolbar, /<SelectItem value="top_reach">Top Reach<\/SelectItem>/)
  assert.match(toolbar, /<SelectItem value="top_interactions">Top Interactions<\/SelectItem>/)
  assert.match(toolbar, /<SelectItem value="top_engagement">Top Engagement<\/SelectItem>/)
})

test("shared Select items provide selected checkmarks and portalled overlay behavior", async () => {
  const selectSource = await readFile(new URL("./ui/select.tsx", import.meta.url), "utf8")
  assert.match(selectSource, /<SelectPrimitive\.Portal>/)
  assert.match(selectSource, /relative z-50/)
  assert.match(selectSource, /<SelectPrimitive\.ItemIndicator>/)
  assert.match(selectSource, /<CheckIcon className="size-4" \/>/)
  assert.match(selectSource, /min-w-\[var\(--radix-select-trigger-width\)\]/)
})

test("Content Type is local and never changes the dashboard request", () => {
  assert.doesNotMatch(source, /query\.set\("contentLabel"/)
  assert.match(source, /\}, \[selectedMonth, selectedYear\]\)/)
  assert.match(
    source,
    /contentLabelFilter !== "all"[\s\S]*?item\.contentLabel !== contentLabelFilter/
  )
})

test("local classification filtering composes before caption search and sorting", () => {
  const filterIndex = source.indexOf('contentLabelFilter !== "all"')
  const searchIndex = source.indexOf("caption.includes(keyword)", filterIndex)
  const sortIndex = source.indexOf('contentSortBy === "top_views"', searchIndex)

  assert.ok(filterIndex >= 0)
  assert.ok(filterIndex < searchIndex)
  assert.ok(searchIndex < sortIndex)
  assert.match(source, /useState\("all"\)/)
  assert.match(source, /selectedMonth,[\s\S]*?selectedYear,[\s\S]*?contentLabelFilter,[\s\S]*?contentSortBy,[\s\S]*?contentSearchKeyword/)
})
