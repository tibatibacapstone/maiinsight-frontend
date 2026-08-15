import { getApiUrl } from "@/lib/api"
import { getAuthHeaders } from "@/lib/roles"

export interface LowOccupancySessionCard {
  date: string
  courtType: string
  courtTypeLabel: string
  sessionName: string
  sessionStartHour: string
  sessionEndHour: string
  occupiedCourtHours: number
  availableCourtHours: number
  occupancyRate: number
  status: "Low" | "Normal"
  potentialTargetCount: number
}

export interface RecommendedTargetCustomer {
  customerKey: string
  customerName: string | null
  phone: string | null
  email: string | null
  customerTypeLabel: string
  bookingTypeDominant: string | null
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

export interface RecommendedCustomersResponse {
  campaignDay: string
  analysisPeriodMonths: number
  latestPlayDate: string | null
  unavailableReason: "LATEST_PLAY_DATE_NOT_AVAILABLE" | null
  courtType: string
  sessionName: string
  segmentName: string | null
  customerType: string
  customers: RecommendedTargetCustomer[]
  totalCustomers: number
  monthlyPerformance: Array<{
    month: string
    monthLabel: string
    dataThrough: string
    totalPossibleSlots: number
    occupiedSlots: number
    emptySlots: number
    occupancyRate: number | null
    revenue: number
  }>
  historicalSummary: {
    analysisPeriodMonths: number
    averageOccupancy: number | null
    averageFilledSlots: number
    totalRevenue: number
    averageMonthlyRevenue: number
  } | null
  pagination: {
    limit: number
    offset: number
    returned: number
    totalCustomers: number
    hasMore: boolean
  }
}

interface ApiEnvelope<T> {
  success: boolean
  message?: string
  error?: string
  data?: T
}

const buildQuery = (
  params: Record<string, string | number | boolean | null | undefined>
) => {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    searchParams.set(key, String(value))
  })

  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

const readApiResponse = async <T>(response: Response): Promise<T> => {
  const result: ApiEnvelope<T> | null = await response.json().catch(() => null)

  if (!response.ok || !result?.success || !result.data) {
    throw new Error(result?.message || result?.error || "Request failed.")
  }

  return result.data
}

export const getLowOccupancySessions = async (params: {
  date?: string
  courtType?: string
  threshold?: number
} = {}) => {
  const query = buildQuery(params)
  const response = await fetch(getApiUrl(`/targeting/low-occupancy-sessions${query}`), {
    method: "GET",
    cache: "no-store",
    headers: getAuthHeaders(),
  })

  return readApiResponse<{ sessions: LowOccupancySessionCard[] }>(response)
}

export const getRecommendedCustomers = async (params: {
  campaignDay: string
  analysisPeriodMonths: number
  courtType?: string
  sessionName: string
  customerType?: string
  segmentName?: string
  limit?: number
  offset?: number
}) => {
  const query = buildQuery(params)
  const response = await fetch(getApiUrl(`/targeting/recommended-customers${query}`), {
    method: "GET",
    cache: "no-store",
    headers: getAuthHeaders(),
  })

  return readApiResponse<RecommendedCustomersResponse>(response)
}

export const generateOutreachMessage = async (params: {
  customerName: string
  rfmSegmentName: string | null
  customerTypeLabel: string
  preferredSession: string | null
  courtType: string
  suggestedAction: string
  recencyDays: number
  totalBookingCount: number
}) => {
  const response = await fetch(getApiUrl("/targeting/generate-message"), {
    method: "POST",
    cache: "no-store",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  })

  return readApiResponse<{ provider: string; model: string; message: string }>(response)
}
