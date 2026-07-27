const clampRate = (value) => Math.max(0, Math.min(1, Number(value) || 0))

export const getHeatmapCellVisual = ({ emptyRate, internalRate }) => {
  const normalizedEmptyRate = clampRate(emptyRate)
  const normalizedInternalRate = clampRate(internalRate)

  return {
    orangeAlpha: 0.08 + normalizedEmptyRate * 0.87,
    internalWidth: `${normalizedInternalRate * 100}%`,
    internalOpacity:
      normalizedInternalRate === 0 ? 0 : 0.25 + normalizedInternalRate * 0.55,
  }
}

export const getHeatmapTooltipLines = (slot) => {
  const lines = [
    `Empty sessions: ${Number(slot?.emptySessions ?? slot?.session_count ?? 0)}`,
  ]

  if (Number(slot?.internalSessions || 0) > 0) {
    lines.push(`Internal sessions: ${Number(slot.internalSessions)}`)
  }

  return lines
}
