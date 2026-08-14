import test from "node:test"
import assert from "node:assert/strict"

import { getHeatmapCellVisual, getHeatmapTooltipLines } from "./heatmap-cell.js"

test("no unavailable sessions produces no gray or black overlay", () => {
  const visual = getHeatmapCellVisual({ occupancyRate: 50, internalRate: 0, tutupRate: 0 })
  assert.equal(visual.internalWidth, "0%")
  assert.equal(visual.internalOpacity, 0)
  assert.equal(visual.tutupWidth, "0%")
  assert.equal(visual.tutupOpacity, 0)
})

test("more unavailable sessions produce larger and stronger gray coverage", () => {
  const low = getHeatmapCellVisual({ occupancyRate: 50, internalRate: 0.25 })
  const high = getHeatmapCellVisual({ occupancyRate: 50, internalRate: 0.75 })

  assert.equal(low.internalWidth, "25%")
  assert.equal(high.internalWidth, "75%")
  assert.ok(high.internalOpacity > low.internalOpacity)
})

test("Tutup/Maintenance coverage produces black overlay width and opacity", () => {
  const half = getHeatmapCellVisual({ occupancyRate: 50, tutupRate: 0.5 })
  const full = getHeatmapCellVisual({ occupancyRate: 50, tutupRate: 1 })

  assert.equal(half.tutupWidth, "50%")
  assert.equal(full.tutupWidth, "100%")
  assert.ok(full.tutupOpacity > half.tutupOpacity)
  assert.ok(half.tutupOpacity > 0)
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
      "Tutup / Maintenance Slots: 1",
    ]
  )
})
