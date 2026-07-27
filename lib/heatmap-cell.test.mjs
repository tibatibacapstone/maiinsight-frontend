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
})
