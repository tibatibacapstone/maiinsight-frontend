export type LowOccupancyOutreachIntent = "message" | "campaign" | "workspace"

export const LOW_OCCUPANCY_OUTREACH_EVENT = "maiin-low-occupancy-outreach"
export const LOW_OCCUPANCY_OUTREACH_STORAGE_KEY = "maiin-low-occupancy-outreach-context"

export interface LowOccupancyOutreachContext {
  source: "low_occupancy_targeting"
  intent: LowOccupancyOutreachIntent
  customerKey: string
  customerName: string | null
  phone: string | null
  email: string | null
  customerTypeLabel: string
  bookingTypeDominant: string | null
  courtType: string
  sessionName: string
  sessionStartHour?: string | null
  sessionEndHour?: string | null
  slotTimeLabel?: string | null
  date: string
  preferredSession: string | null
  selectedSessionBookingCount: number
  selectedCourtBookingCount: number
  totalBookingCount: number
  lastBookingDate: string | null
  recencyDays: number
  avgSpend: number
  totalRevenue: number
  rfmSegmentName: string | null
  targetPriorityScore: number
  targetPriorityLabel: string
  suggestedAction: string
  whatsappMessage: string
}

export const saveLowOccupancyOutreachContext = (
  context: LowOccupancyOutreachContext
) => {
  if (typeof window === "undefined") return

  window.localStorage.setItem(
    LOW_OCCUPANCY_OUTREACH_STORAGE_KEY,
    JSON.stringify(context)
  )

  window.dispatchEvent(
    new CustomEvent(LOW_OCCUPANCY_OUTREACH_EVENT, {
      detail: context,
    })
  )
}

export const readLowOccupancyOutreachContext = (): LowOccupancyOutreachContext | null => {
  if (typeof window === "undefined") return null

  const rawValue = window.localStorage.getItem(LOW_OCCUPANCY_OUTREACH_STORAGE_KEY)
  if (!rawValue) return null

  try {
    return JSON.parse(rawValue) as LowOccupancyOutreachContext
  } catch {
    return null
  }
}

export const clearLowOccupancyOutreachContext = () => {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(LOW_OCCUPANCY_OUTREACH_STORAGE_KEY)
}
