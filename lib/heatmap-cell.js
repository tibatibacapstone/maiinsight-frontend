const clampRate = (value) => Math.max(0, Math.min(1, Number(value) || 0))

export const getHeatmapCellVisual = ({ occupancyRate, internalRate }) => {
  const normalizedOccupancyRate = clampRate(Number(occupancyRate) / 100)
  const normalizedInternalRate = clampRate(internalRate)

  return {
    orangeAlpha: 0.08 + normalizedOccupancyRate * 0.87,
    internalWidth: `${normalizedInternalRate * 100}%`,
    internalOpacity:
      normalizedInternalRate === 0 ? 0 : 0.25 + normalizedInternalRate * 0.55,
  }
}

export const getHeatmapTooltipLines = (slot) => {
  const possible = Number(slot?.totalPossibleSlots ?? slot?.totalPossibleSessions ?? 0)
  const occupied = Number(slot?.occupiedSlots ?? slot?.occupiedCustomerSessions ?? 0)
  const empty = Number(slot?.emptySlots ?? slot?.emptySessions ?? slot?.session_count ?? 0)
  const occupancy = slot?.occupancyRate
  const lines = [
    `Occupancy Rate: ${occupancy === null || occupancy === undefined ? "Unavailable" : `${Number(occupancy).toFixed(1)}%`}`,
    `Occupied Slots: ${occupied}`,
    `Empty Slots: ${empty} of ${possible}`,
  ]

  if (Number(slot?.internalSessions || 0) > 0) {
    lines.push(`Internal Slots: ${Number(slot.internalSessions)}`)
  }
  if (Number(slot?.blockedSlots || 0) > 0) {
    lines.push(`Blocked / Maintenance Slots: ${Number(slot.blockedSlots)}`)
  }

  return lines
}
