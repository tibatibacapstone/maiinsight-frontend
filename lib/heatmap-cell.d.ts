export interface HeatmapCellInput {
  session_count?: number
  emptySessions?: number
  emptySlots?: number
  totalPossibleSessions?: number
  totalPossibleSlots?: number
  occupiedCustomerSessions?: number
  occupiedSlots?: number
  occupancyRate?: number | null
  internalSessions?: number
  blockedSlots?: number
  internalRate?: number
  tutupSessions?: number
  tutupRate?: number
}

export function getHeatmapCellVisual(input: HeatmapCellInput): {
  orangeAlpha: number
  internalWidth: string
  internalOpacity: number
  tutupWidth: string
  tutupOpacity: number
}

export function getHeatmapTooltipLines(input: HeatmapCellInput): string[]
