const clampRate = (value) => Math.max(0, Math.min(1, Number(value) || 0))

export const getHeatmapCellVisual = ({ occupancyRate, internalRate, tutupRate }) => {
  const normalizedOccupancyRate = clampRate(Number(occupancyRate) / 100)
  const normalizedInternalRate = clampRate(internalRate)
  const normalizedTutupRate = clampRate(tutupRate)

  return {
    orangeAlpha: 0.08 + normalizedOccupancyRate * 0.87,
    internalWidth: `${normalizedInternalRate * 100}%`,
    internalOpacity:
      normalizedInternalRate === 0 ? 0 : 0.25 + normalizedInternalRate * 0.55,
    tutupWidth: `${normalizedTutupRate * 100}%`,
    tutupOpacity:
      normalizedTutupRate === 0 ? 0 : 0.55 + normalizedTutupRate * 0.45,
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
  const tutupCount = Number(slot?.tutupSessions ?? slot?.blockedSlots ?? 0)
  if (tutupCount > 0) {
    lines.push(`Tutup/Maintenance Slots: ${tutupCount}`)
  }

  return lines
}
