import test from "node:test"
import assert from "node:assert/strict"

import { getHeatmapCellVisual, getHeatmapTooltipLines } from "./heatmap-cell.js"

test("no internal sessions produces no gray overlay", () => {
  const visual = getHeatmapCellVisual({ emptyRate: 0.5, internalRate: 0 })
  assert.equal(visual.internalWidth, "0%")
  assert.equal(visual.internalOpacity, 0)
})

test("more internal sessions produce larger and stronger gray coverage", () => {
  const low = getHeatmapCellVisual({ emptyRate: 0.5, internalRate: 0.25 })
  const high = getHeatmapCellVisual({ emptyRate: 0.5, internalRate: 0.75 })

  assert.equal(low.internalWidth, "25%")
  assert.equal(high.internalWidth, "75%")
  assert.ok(high.internalOpacity > low.internalOpacity)
})

test("tooltip includes internal details only when present", () => {
  assert.deepEqual(
    getHeatmapTooltipLines({
      session_count: 4,
      emptySessions: 4,
      emptyRate: 0.4,
      internalSessions: 0,
      internalRate: 0,
    }),
    ["Empty sessions: 4"]
  )

  assert.deepEqual(
    getHeatmapTooltipLines({
      emptySessions: 4,
      emptyRate: 0.4,
      internalSessions: 2,
      internalRate: 0.2,
    }),
    [
      "Empty sessions: 4",
      "Internal sessions: 2",
    ]
  )

  assert.deepEqual(
    getHeatmapTooltipLines({
      emptySessions: 3,
      emptyRate: 0.3,
      internalSessions: 0,
      internalRate: 0,
      tutupSessions: 1,
      tutupRate: 0.1,
    }),
    [
      "Empty sessions: 3",
      "Closed sessions: 1",
    ]
  )
})

test("tutup overlay appears when tutupRate > 0", () => {
  const visual = getHeatmapCellVisual({ emptyRate: 0.5, internalRate: 0, tutupRate: 0.3 })
  assert.equal(visual.tutupWidth, "30%")
  assert.ok(visual.tutupOpacity > 0)
})

test("no tutup sessions produces no black overlay", () => {
  const visual = getHeatmapCellVisual({ emptyRate: 0.5, internalRate: 0.2, tutupRate: 0 })
  assert.equal(visual.tutupWidth, "0%")
  assert.equal(visual.tutupOpacity, 0)
})
