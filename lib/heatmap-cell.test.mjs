import test from "node:test"
import assert from "node:assert/strict"

import { getHeatmapCellVisual, getHeatmapTooltipLines } from "./heatmap-cell.js"

test("no unavailable sessions produces no gray overlay", () => {
  const visual = getHeatmapCellVisual({ occupancyRate: 50, internalRate: 0 })
  assert.equal(visual.internalWidth, "0%")
  assert.equal(visual.internalOpacity, 0)
})

test("more unavailable sessions produce larger and stronger gray coverage", () => {
  const low = getHeatmapCellVisual({ occupancyRate: 50, internalRate: 0.25 })
  const high = getHeatmapCellVisual({ occupancyRate: 50, internalRate: 0.75 })

  assert.equal(low.internalWidth, "25%")
  assert.equal(high.internalWidth, "75%")
  assert.ok(high.internalOpacity > low.internalOpacity)
})

test("higher occupancy produces a darker heatmap cell", () => {
  const empty = getHeatmapCellVisual({ occupancyRate: 0, internalRate: 0 })
  const full = getHeatmapCellVisual({ occupancyRate: 100, internalRate: 0 })
  assert.ok(full.orangeAlpha > empty.orangeAlpha)
})

test("tooltip reports occupancy and denominator-aware empty slots", () => {
  assert.deepEqual(
    getHeatmapTooltipLines({
      totalPossibleSlots: 12,
      occupiedSlots: 5,
      emptySlots: 7,
      occupancyRate: 41.6666667,
      internalSessions: 0,
      blockedSlots: 0,
    }),
    ["Occupancy Rate: 41.7%", "Occupied Slots: 5", "Empty Slots: 7 of 12"]
  )

  assert.deepEqual(
    getHeatmapTooltipLines({
      totalPossibleSlots: 10,
      occupiedSlots: 6,
      emptySlots: 4,
      occupancyRate: 60,
      internalSessions: 2,
      blockedSlots: 1,
    }),
    [
      "Occupancy Rate: 60.0%",
      "Occupied Slots: 6",
      "Empty Slots: 4 of 10",
      "Internal Slots: 2",
      "Blocked / Maintenance Slots: 1",
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
