import test from "node:test"
import assert from "node:assert/strict"

import {
  getSourceSyncLabel,
  isSourceSyncDisabled,
  META_SOURCE_ID,
} from "./data-source-sync-state.mjs"

const metaState = (overrides = {}) => ({
  sourceId: META_SOURCE_ID,
  sourceStatus: "connected",
  syncingSourceId: null,
  metaConfigured: true,
  canSync: true,
  ...overrides,
})

test("configured connected Meta source can sync", () => {
  assert.equal(isSourceSyncDisabled(metaState()), false)
  assert.equal(getSourceSyncLabel(metaState()), "Sync Now")
})

test("configured Meta source in error remains available as a retry", () => {
  const state = metaState({ sourceStatus: "error" })
  assert.equal(isSourceSyncDisabled(state), false)
  assert.equal(getSourceSyncLabel(state), "Retry Sync")
})

test("active Meta sync prevents duplicate requests", () => {
  const state = metaState({ syncingSourceId: META_SOURCE_ID })
  assert.equal(isSourceSyncDisabled(state), true)
  assert.equal(getSourceSyncLabel(state), "Syncing...")
})

test("backend-reported Meta sync prevents duplicate requests after reload", () => {
  const state = metaState({ sourceStatus: "syncing" })
  assert.equal(isSourceSyncDisabled(state), true)
  assert.equal(getSourceSyncLabel(state), "Syncing...")
})

test("missing Meta configuration disables manual sync", () => {
  assert.equal(isSourceSyncDisabled(metaState({ metaConfigured: false })), true)
})

test("unauthorized user cannot manually sync Meta", () => {
  assert.equal(isSourceSyncDisabled(metaState({ canSync: false })), true)
})

test("unrelated source cards retain their existing error behavior", () => {
  assert.equal(
    isSourceSyncDisabled({
      ...metaState(),
      sourceId: "3",
      sourceStatus: "error",
    }),
    true,
  )
})
