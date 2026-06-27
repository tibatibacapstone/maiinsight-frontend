import { getApiUrl } from "@/lib/api"
import { getAuthHeaders } from "@/lib/roles"

export const SEGMENTATION_UPDATED_EVENT = "maiin-segmentation-updated"

export interface KEvaluationItem {
  k: number
  inertia: number
  silhouetteScore: number | null
}

export interface SegmentationRun {
  id: number
  runDate: string
  method: string
  kValue: number
  selectedK: number
  optimalK: number | null
  bestSilhouetteK: number | null
  elbowK: number | null
  totalCustomers: number
  filterMonth: string | null
  filterYear: number | null
  filterPeriodType: string | null
  filterCourtType: string | null
  filterBookingType: string | null
  status: string
  errorMessage: string | null
  silhouetteScore: number | null
  kEvaluation: {
    testedK?: KEvaluationItem[]
    elbowK?: number | null
    optimalK?: number | null
    bestSilhouetteK?: number | null
    selectedK?: number
    selectionReason?: string | null
  } | null
  selectionReason: string | null
}

export interface ClusterProfile {
  clusterId: number
  segmentName: string
  segmentDescription: string | null
  labelReason: string | null
  recommendedAction: string | null
  customerCount: number
  avgRecency: number
  avgFrequency: number
  avgMonetary: number
  avgRScore: number
  avgFScore: number
  avgMScore: number
}

export interface CustomerRfmScore {
  customerKey: string
  customerName: string | null
  bookingTypeDominant: string | null
  recency: number
  frequency: number
  monetary: number
  rScore: number
  fScore: number
  mScore: number
  clusterId: number
  segmentName: string
}

export interface SegmentationSummaryData {
  run: SegmentationRun | null
  selectedK: number | null
  optimalK: number | null
  bestSilhouetteK: number | null
  elbowK: number | null
  silhouetteScore: number | null
  kEvaluation: SegmentationRun["kEvaluation"]
  selectionReason: string | null
  clusters: ClusterProfile[]
  summary: ClusterProfile[]
}

export interface SegmentationLatestData extends SegmentationSummaryData {
  customers: CustomerRfmScore[]
  totalCustomers: number
  pagination: {
    limit: number
    offset: number
    returned: number
    totalCustomers: number
    hasMore: boolean
  } | null
}

export interface SegmentationCustomersData {
  run: SegmentationRun | null
  selectedK: number | null
  optimalK: number | null
  bestSilhouetteK: number | null
  elbowK: number | null
  silhouetteScore: number | null
  kEvaluation: SegmentationRun["kEvaluation"]
  selectionReason: string | null
  customers: CustomerRfmScore[]
  totalCustomers: number
  pagination: {
    limit: number
    offset: number
    returned: number
    totalCustomers: number
    hasMore: boolean
  } | null
}

interface SegmentationApiResponse<T> {
  success: boolean
  message?: string
  error?: string
  data?: T
}

const buildQuery = (params: Record<string, string | number | boolean | null | undefined>) => {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    searchParams.set(key, String(value))
  })

  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

const readApiResponse = async <T>(response: Response): Promise<T> => {
  const result: SegmentationApiResponse<T> | null = await response.json().catch(() => null)

  if (!response.ok || !result?.success || !result.data) {
    throw new Error(result?.message || result?.error || "Failed to fetch segmentation data.")
  }

  return result.data
}

export const notifySegmentationUpdated = () => {
  if (typeof window === "undefined") return

  window.dispatchEvent(
    new CustomEvent(SEGMENTATION_UPDATED_EVENT, {
      detail: { timestamp: new Date().toISOString() },
    })
  )
}

export const runCustomerSegmentation = async (): Promise<SegmentationSummaryData> => {
  const response = await fetch(getApiUrl("/segmentation/run"), {
    method: "POST",
    cache: "no-store",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  })

  return readApiResponse<SegmentationSummaryData>(response)
}

export const fetchSegmentationLatest = async (params: {
  includeCustomers?: boolean
  limit?: number
  offset?: number
  segmentName?: string
} = {}): Promise<SegmentationLatestData> => {
  const query = buildQuery(params)
  const response = await fetch(getApiUrl(`/segmentation/latest${query}`), {
    method: "GET",
    cache: "no-store",
    headers: getAuthHeaders(),
  })

  return readApiResponse<SegmentationLatestData>(response)
}

export const fetchSegmentationSummary = async (): Promise<SegmentationSummaryData> => {
  const response = await fetch(getApiUrl("/segmentation/summary"), {
    method: "GET",
    cache: "no-store",
    headers: getAuthHeaders(),
  })

  return readApiResponse<SegmentationSummaryData>(response)
}

export const fetchSegmentationCustomers = async (params: {
  segmentName?: string
  limit?: number
  offset?: number
} = {}): Promise<SegmentationCustomersData> => {
  const query = buildQuery(params)
  const response = await fetch(getApiUrl(`/segmentation/customers${query}`), {
    method: "GET",
    cache: "no-store",
    headers: getAuthHeaders(),
  })

  return readApiResponse<SegmentationCustomersData>(response)
}

export const CUSTOMER_SEGMENT_ORDER = [
  "Prime Players",
  "Routine Players",
  "Growth Players",
  "Re-Engagement Players",
] as const

export const CUSTOMER_SEGMENT_COLORS: Record<string, string> = {
  "Prime Players": "var(--chart-1)",
  "Routine Players": "var(--chart-2)",
  "Growth Players": "var(--chart-3)",
  "Re-Engagement Players": "var(--chart-4)",
}

export const sortClusterProfiles = (clusters: ClusterProfile[]) => {
  return [...clusters].sort((left, right) => {
    const leftIndex = CUSTOMER_SEGMENT_ORDER.indexOf(
      left.segmentName as (typeof CUSTOMER_SEGMENT_ORDER)[number]
    )
    const rightIndex = CUSTOMER_SEGMENT_ORDER.indexOf(
      right.segmentName as (typeof CUSTOMER_SEGMENT_ORDER)[number]
    )

    if (leftIndex === -1 && rightIndex === -1) {
      return left.segmentName.localeCompare(right.segmentName)
    }

    if (leftIndex === -1) return 1
    if (rightIndex === -1) return -1

    return leftIndex - rightIndex
  })
}
