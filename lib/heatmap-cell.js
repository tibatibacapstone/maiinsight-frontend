const clampRate = (value) => Math.max(0, Math.min(1, Number(value) || 0))

export const getHeatmapCellVisual = ({ emptyRate, internalRate, tutupRate = 0 }) => {
  const normalizedEmptyRate = clampRate(emptyRate)
  const normalizedInternalRate = clampRate(internalRate)
  const normalizedTutupRate = clampRate(tutupRate)

  return {
    orangeAlpha: 0.08 + normalizedEmptyRate * 0.87,
    internalWidth: `${normalizedInternalRate * 100}%`,
    internalOpacity:
      normalizedInternalRate === 0 ? 0 : 0.25 + normalizedInternalRate * 0.55,
    tutupWidth: `${normalizedTutupRate * 100}%`,
    tutupOpacity: normalizedTutupRate === 0 ? 0 : 0.85,
  }
}

export const getHeatmapTooltipLines = (slot) => {
  const lines = [
    `Empty sessions: ${Number(slot?.emptySessions ?? slot?.session_count ?? 0)}`,
  ]

  if (Number(slot?.internalSessions || 0) > 0) {
    lines.push(`Internal sessions: ${Number(slot.internalSessions)}`)
  }

  if (Number(slot?.tutupSessions || 0) > 0) {
    lines.push(`Closed sessions: ${Number(slot.tutupSessions)}`)
  }

  return lines
}
