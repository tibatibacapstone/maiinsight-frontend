import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const source = await readFile(new URL("./instasight-hub.tsx", import.meta.url), "utf8")

test("follower card renders a compact follower value and snapshot date", () => {
  assert.match(source, /title="Followers Snapshot"/)
  assert.match(source, /formatAvailableNumber\(dashboard\?\.summary\.followersCount\)/)
  assert.match(source, /Latest snapshot:/)
  assert.match(source, /formatSnapshotDate\(dashboard\.summary\.followerSnapshotDate\)/)
})

test("no follower snapshot and missing comparisons remain unavailable", () => {
  assert.match(source, /No snapshot available/)
  assert.match(source, /newFollowsChangePct != null/)
  assert.match(source, /unfollowsChangePct != null/)
})

test("old fallback callout and blue information box are not rendered", () => {
  assert.doesNotMatch(source, /No follower snapshot is available for/)
  assert.doesNotMatch(source, /Showing the latest available snapshot from/)
  assert.doesNotMatch(source, /bg-blue-50|text-blue-800/)
})

test("follow and unfollow remain separate selected-period values", () => {
  assert.match(source, /summary\.newFollowsCount/)
  assert.match(source, /summary\.unfollowsCount/)
  assert.match(source, /getApiUrl\(`\/meta\/dashboard\?\$\{query\.toString\(\)\}`\)/)
})
