"use client"

import { useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  Copy,
  Info,
  Loader2,
  Sparkles,
  Target,
} from "lucide-react"
import { HeatmapGrid } from "@/components/segment-visualization"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardTitleTooltip,
} from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  generateOutreachMessage,
  getRecommendedCustomers,
  type RecommendedCustomersResponse,
  type RecommendedTargetCustomer,
} from "@/lib/targeting"
import { saveLowOccupancyOutreachContext } from "@/lib/low-occupancy-outreach"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"
import { getApiUrl } from "@/lib/api"
import { getAuthHeaders } from "@/lib/roles"
import type { PageId } from "./dashboard-sidebar"

interface LowOccupancyTargetingProps {
  onNavigate: (page: PageId) => void
}
interface PlaytimeSessionPoint {
  play_time_group?: string
  playTimeGroup?: string
  session_count?: number
  sessionCount?: number
}

interface HeatmapSummary {
  slots: Array<{
    day_short: string
    startHour: string
    session_count: number
    session_label?: string
    totalCapacity?: number
    totalPossibleSessions?: number
    occupiedCustomerSessions?: number
    occupiedSlots?: number
    internalSessions?: number
    blockedSlots?: number
    tutupSessions?: number
    emptySessions?: number
    emptySlots?: number
    totalPossibleSlots?: number
    occupancyRate?: number | null
    emptyRate?: number
    internalRate?: number
    tutupRate?: number
  }>
  mostEmptySlot: {
    dayLabel: string
    hourLabel: string
    sessionLabel: string
    sessionCount: number
  } | null
}

interface PlaytimeMixData {
  totalCustomers: number
  totalSessions: number
  sessionByTime?: unknown
}

interface CustomerPagination {
  totalCustomers: number
  returned: number
  offset: number
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const PLAYTIME_CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"]
const PLAYTIME_ORDER: Record<string, number> = {
  Morning: 0, Afternoon: 1, Evening: 2, Night: 3,
  Pagi: 0, Siang: 1, Malam: 3,
}

const SESSION_HOUR_LABELS: Record<string, string> = {
  Morning: "06:00 - 10:59",
  Afternoon: "11:00 - 14:59",
  Evening: "15:00 - 18:59",
  Night: "19:00 - 23:59",
}

const PlaytimeAxisTick = ({ x, y, payload }: { x?: number; y?: number; payload?: { value?: string } }) => {
  const sessionName = payload?.value || ""
  const hourLabel = SESSION_HOUR_LABELS[sessionName] || ""

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fill="var(--foreground)" fontSize={12} fontWeight={500}>
        {sessionName}
      </text>
      <text x={0} y={0} dy={28} textAnchor="middle" fill="var(--muted-foreground)" fontSize={10}>
        {hourLabel}
      </text>
    </g>
  )
}
const PLAYTIME_LABEL_MAP: Record<string, string> = {
  Pagi: "Morning", Siang: "Afternoon", Malam: "Night",
}
const formatPlaytimePercent = (value: number) => `${Number(value.toFixed(1))}%`

const parsePlaytimeJsonArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[]
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as T[]) : []
    } catch {
      return []
    }
  }
  return []
}

const buildPlaytimeChart = (data: PlaytimeMixData | null) => {
  const directRows = parsePlaytimeJsonArray<PlaytimeSessionPoint>(data?.sessionByTime)

  return directRows
    .map((row, index) => {
      const rawName = row.play_time_group || row.playTimeGroup || ""
      if (!rawName) return null
      return {
        name: PLAYTIME_LABEL_MAP[rawName] || rawName,
        rawName,
        value: Number(row.session_count ?? row.sessionCount ?? 0),
        color: PLAYTIME_CHART_COLORS[index % PLAYTIME_CHART_COLORS.length],
      }
    })
    .filter((item): item is { name: string; rawName: string; value: number; color: string } => Boolean(item))
    .sort((left, right) => (PLAYTIME_ORDER[left.rawName] ?? 99) - (PLAYTIME_ORDER[right.rawName] ?? 99))
}

const SESSION_OPTIONS = ["Morning", "Afternoon", "Evening", "Night"] as const
const COURT_OPTIONS = [
  { value: "all", label: "All" },
  { value: "mini_soccer", label: "Mini Soccer" },
  { value: "basketball", label: "Basketball" },
]
const CUSTOMER_TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "membership", label: "Membership" },
  { value: "non_membership", label: "Non Membership" },
]
const SEGMENT_OPTIONS = [
  { value: "all", label: "All" },
  { value: "Prime Players", label: "Prime Players" },
  { value: "Routine Players", label: "Routine Players" },
  { value: "Growth Players", label: "Growth Players" },
  { value: "Re-Engagement Players", label: "Re-Engagement Players" },
]

const getTodayIso = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
const INITIAL_DATE = getTodayIso()
const INITIAL_COURT_TYPE = "all"
const INITIAL_SESSION_NAME: (typeof SESSION_OPTIONS)[number] = "Morning"
const INITIAL_CUSTOMER_TYPE = "all"
const INITIAL_SEGMENT_NAME = "all"
const CAMPAIGN_DAY_OPTIONS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const ANALYSIS_PERIOD_OPTIONS = [1, 2, 3, 4, 6, 12]

const VENUE_OPTIONS = [
  { value: "All Venue", label: "All Venue" },
  { value: "Mini Soccer", label: "Mini Soccer" },
  { value: "Basketball", label: "Basketball" },
]

const BOOKING_TYPE_OPTIONS = [
  { value: "All Type", label: "All Type" },
  { value: "GeloraApp Booking", label: "Gelora Booking" },
  { value: "Manual/Walk-in", label: "Manual/Walk-in" },
  { value: "Internal", label: "Internal" },
]

const INITIAL_CUSTOMER_PAGE_SIZE = 10

const getLast30DaysRange = () => {
  const end = new Date()
  const start = new Date()

  start.setDate(end.getDate() - 30)

  const formatDate = (value: Date) => {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, "0")
    const day = String(value.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  }
}

const INITIAL_DATE_RANGE = getLast30DaysRange()

const buildMonthRange = (monthKey: string) => {
  const parts = monthKey.split("-")
  if (parts.length !== 2) return null
  const year = Number(parts[0])
  const month = Number(parts[1])
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null
  const lastDay = new Date(year, month, 0).getDate()
  const monthValue = String(month).padStart(2, "0")
  return {
    startDate: `${year}-${monthValue}-01`,
    endDate: `${year}-${monthValue}-${String(lastDay).padStart(2, "0")}`,
  }
}

const buildMonthRangeLabel = (min?: string | null, max?: string | null) => {
  const format = (key?: string | null) => {
    if (!key) return null
    const parts = key.split("-")
    if (parts.length !== 2) return null
    const month = Number(parts[1])
    if (!Number.isFinite(month) || month < 1 || month > 12) return null
    return `${MONTHS[month - 1]} ${parts[0]}`
  }
  const minLabel = format(min)
  const maxLabel = format(max)
  if (minLabel && maxLabel && minLabel !== maxLabel) return `${minLabel} – ${maxLabel}`
  return minLabel || maxLabel || null
}

const mapVenueToCourtType = (venue: string) => {
  if (venue === "Mini Soccer") return "mini_soccer"
  if (venue === "Basketball") return "basketball"
  return "all"
}

const mapCustomerTypeToApiValue = (displayType: string) => {
  if (displayType === "Membership") return "membership"
  if (displayType === "Non Membership") return "non_membership"
  return "all"
}

const FILTER_HELP_TEXT = {
  campaignDay: "Only shows customers who have actually booked this weekday and session combination before.",
  analysisPeriod: "Calendar months ending on the latest available play date, used for the Historical Campaign Performance figures below.",
  courtType:
    "Only shows customers whose preferred (most-booked) court matches this type, or keep all courts included.",
  playSession:
    "Only shows customers who have booked this session bucket on the selected Campaign Day before: Morning, Afternoon, Evening, or Night.",
  customerType:
    "Narrow the target audience to membership, non-membership, or both depending on the promo goal.",
  rfmSegment:
    "Filter the audience by the latest available RFM segment to support retention, growth, or re-engagement campaigns.",
} as const

function FilterLabel({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label={`More information about ${label}`}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8} className="max-w-xs text-left leading-relaxed">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

function InfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
          aria-label="More information"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="max-w-xs text-left leading-relaxed"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

export function LowOccupancyTargeting({ onNavigate }: LowOccupancyTargetingProps) {

  const [playtimeMixData, setPlaytimeMixData] = useState<PlaytimeMixData | null>(null)
const [isLoadingPlaytime, setIsLoadingPlaytime] = useState(true)
const [heatmapData, setHeatmapData] = useState<HeatmapSummary | null>(null)
const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(true)
const [dataMonthLabel, setDataMonthLabel] = useState<string | null>(null)
const [dataMonthRange, setDataMonthRange] = useState<{ min?: string | null; max?: string | null } | null>(null)
const playtimeRequestRef = useRef(0)

  const [campaignDay, setCampaignDay] = useState("Monday")
  const [analysisPeriodMonths, setAnalysisPeriodMonths] = useState(3)
  const [courtType, setCourtType] = useState(INITIAL_COURT_TYPE)
  const [sessionName, setSessionName] = useState<(typeof SESSION_OPTIONS)[number]>(INITIAL_SESSION_NAME)
  const [customerType, setCustomerType] = useState(INITIAL_CUSTOMER_TYPE)
  const [segmentName, setSegmentName] = useState(INITIAL_SEGMENT_NAME)
  const [monthlyPerformance, setMonthlyPerformance] = useState<RecommendedCustomersResponse["monthlyPerformance"]>([])
  const [historicalSummary, setHistoricalSummary] = useState<RecommendedCustomersResponse["historicalSummary"]>(null)
  const [latestCampaignPlayDate, setLatestCampaignPlayDate] = useState<string | null>(null)

  const [customers, setCustomers] = useState<RecommendedTargetCustomer[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  const [customerError, setCustomerError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [messageDraftCustomer, setMessageDraftCustomer] = useState<RecommendedTargetCustomer | null>(null)
  const [generatedDraftMessage, setGeneratedDraftMessage] = useState<string | null>(null)
  const [isGeneratingDraftMessage, setIsGeneratingDraftMessage] = useState(false)
  const [generateDraftMessageError, setGenerateDraftMessageError] = useState<string | null>(null)

  const [selectedStartDate, setSelectedStartDate] = useState(INITIAL_DATE_RANGE.startDate)
  const [selectedEndDate, setSelectedEndDate] = useState(INITIAL_DATE_RANGE.endDate)
  const [selectedVenue, setSelectedVenue] = useState("All Venue")
  const [selectedBookingType, setSelectedBookingType] = useState("All Type")
  const [currentCustomerPage, setCurrentCustomerPage] = useState(1)
  const [customerPageSize] = useState(INITIAL_CUSTOMER_PAGE_SIZE)
  const [customerPagination, setCustomerPagination] = useState<CustomerPagination | null>(null)
  // Historical Campaign Performance reflects whatever filters were last
  // applied, so keep it hidden until the user has actually asked for
  // recommendations rather than showing it pre-filled from the page's
  // default filters on first load.
  const [hasRequestedRecommendations, setHasRequestedRecommendations] = useState(false)

  const loadCustomers = async (filters?: {
    nextCampaignDay?: string
    nextAnalysisPeriodMonths?: number
    nextCourtType?: string
    nextSessionName?: string
    nextCustomerType?: string
    nextSegmentName?: string
    nextCustomerPage?: number
    nextPageSize?: number
  }) => {
    const nextCampaignDay = filters?.nextCampaignDay ?? campaignDay
    const nextAnalysisPeriodMonths = filters?.nextAnalysisPeriodMonths ?? analysisPeriodMonths
    const nextCourtType = filters?.nextCourtType ?? courtType
    const nextSessionName = filters?.nextSessionName ?? sessionName
    const nextCustomerType = filters?.nextCustomerType ?? customerType
    const nextSegmentName = filters?.nextSegmentName ?? segmentName
    const nextCustomerPage = filters?.nextCustomerPage ?? currentCustomerPage
    const nextPageSize = filters?.nextPageSize ?? customerPageSize

    setIsLoadingCustomers(true)
    setCustomerError(null)

    try {
      const response = await getRecommendedCustomers({
        campaignDay: nextCampaignDay,
        analysisPeriodMonths: nextAnalysisPeriodMonths,
        courtType: nextCourtType,
        sessionName: nextSessionName,
        customerType: nextCustomerType,
        segmentName: nextSegmentName === "all" ? undefined : nextSegmentName,
        limit: nextPageSize,
        offset: (nextCustomerPage - 1) * nextPageSize,
      })
      setCustomers(response.customers)
      setMonthlyPerformance(response.monthlyPerformance || [])
      setHistoricalSummary(response.historicalSummary)
      setLatestCampaignPlayDate(response.latestPlayDate)
      setCustomerPagination(response.pagination ?? null)
    } catch (error) {
      setCustomerError(
        error instanceof Error
          ? error.message
          : "Failed to load recommended customers."
      )
      setCustomers([])
      setCustomerPagination(null)
    } finally {
      setIsLoadingCustomers(false)
    }
  }

  const loadPlaytime = async (filters?: {
    nextStartDate?: string
    nextEndDate?: string
    nextVenue?: string
    nextCustomerType?: string
  }) => {
    const requestId = ++playtimeRequestRef.current
    setIsLoadingPlaytime(true)
    setIsLoadingHeatmap(true)
    try {
      const hasExplicitDateRange = filters?.nextStartDate && filters?.nextEndDate

      let monthLabel = dataMonthLabel ?? "All Month"
      let year = String(new Date().getFullYear())

      if (!hasExplicitDateRange) {
        const statusRes = await fetch(getApiUrl("/operations/status"), {
          headers: getAuthHeaders(),
          cache: "no-store",
        })
        const statusResult = await statusRes.json().catch(() => null)
        const availableMonths = statusResult?.success
          ? (statusResult.data?.transactionAvailableMonths as string[])
          : null

        if (availableMonths && availableMonths.length > 0) {
          const latest = availableMonths[availableMonths.length - 1]
          const parts = latest.split("-")
          if (parts.length === 2) {
            year = parts[0]
            const monthIndex = parseInt(parts[1], 10) - 1
            if (monthIndex >= 0 && monthIndex < 12) {
              monthLabel = MONTHS[monthIndex]
            }
          }
        }
      } else {
        // The query itself always covers the full selected start–end range
        // (sent as explicit startDate/endDate below), so the caption must
        // reflect that whole range too — not just the start date's month —
        // otherwise a multi-month selection shows a misleadingly narrow
        // "Data period" label next to data that actually spans further.
        const start = new Date(filters!.nextStartDate!)
        const end = new Date(filters!.nextEndDate!)
        const startKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`
        const endKey = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}`
        monthLabel = buildMonthRangeLabel(startKey, endKey) ?? MONTHS[start.getMonth()]
        year = String(start.getFullYear())
      }

      if (requestId !== playtimeRequestRef.current) return
      setDataMonthLabel(monthLabel)

      const params = new URLSearchParams({
        venue: filters?.nextVenue ?? "All Venue",
        customerType: filters?.nextCustomerType ?? "All Type",
      })

      if (hasExplicitDateRange) {
        params.set("startDate", filters!.nextStartDate!)
        params.set("endDate", filters!.nextEndDate!)
      } else {
        params.set("month", monthLabel)
        params.set("year", year)
        params.set("periodType", "MTD")
      }

      const [playtimeRes, heatmapRes] = await Promise.all([
        fetch(getApiUrl(`/dashboard/playtime-mix?${params.toString()}`), {
          headers: getAuthHeaders(),
          cache: "no-store",
        }),
        fetch(getApiUrl(`/dashboard/empty-slot-heatmap?${params.toString()}`), {
          headers: getAuthHeaders(),
          cache: "no-store",
        }),
      ])

      const playtimeResult = await playtimeRes.json().catch(() => null)
      const heatmapResult = await heatmapRes.json().catch(() => null)

      if (requestId !== playtimeRequestRef.current) return
      setPlaytimeMixData(playtimeResult?.success ? playtimeResult.data : null)
      setHeatmapData(heatmapResult?.success ? heatmapResult.data : null)
    } catch {
      if (requestId !== playtimeRequestRef.current) return
      setPlaytimeMixData(null)
      setHeatmapData(null)
    } finally {
      if (requestId === playtimeRequestRef.current) {
        setIsLoadingPlaytime(false)
        setIsLoadingHeatmap(false)
      }
    }
  }

  useEffect(() => {
    const initializePeriod = async () => {
      try {
        const statusRes = await fetch(getApiUrl("/operations/status"), {
          headers: getAuthHeaders(),
          cache: "no-store",
        })
        const statusResult = await statusRes.json().catch(() => null)
        const statusData = statusResult?.success ? statusResult.data : null
        const availableMonths = Array.isArray(statusData?.transactionAvailableMonths)
          ? (statusData.transactionAvailableMonths as string[])
          : []

        if (statusData?.transactionMonthRange?.min || statusData?.transactionMonthRange?.max) {
          setDataMonthRange({
            min: statusData.transactionMonthRange.min ?? null,
            max: statusData.transactionMonthRange.max ?? null,
          })
        }

        if (availableMonths.length > 0) {
          const latest = availableMonths[availableMonths.length - 1]
          const monthRange = buildMonthRange(latest)
          const parts = latest.split("-")
          if (monthRange && parts.length === 2) {
            setSelectedStartDate(monthRange.startDate)
            setSelectedEndDate(monthRange.endDate)
            const monthIndex = parseInt(parts[1], 10) - 1
            if (monthIndex >= 0 && monthIndex < 12) {
              setDataMonthLabel(MONTHS[monthIndex])
            }
          }
        }
      } catch {
        // Keep the default last-30-days range when status cannot be loaded.
      }
    }

    void initializePeriod()
  }, [])

  useEffect(() => {
    const initialize = async () => {
      setIsLoadingCustomers(true)
      setCustomerError(null)

      try {
        const customerResponse = await getRecommendedCustomers({
          campaignDay: "Monday",
          analysisPeriodMonths: 3,
          courtType: INITIAL_COURT_TYPE,
          sessionName: INITIAL_SESSION_NAME,
          customerType: INITIAL_CUSTOMER_TYPE,
          limit: 50,
          offset: 0,
        })

        setCustomers(customerResponse.customers)
        setMonthlyPerformance(customerResponse.monthlyPerformance || [])
        setHistoricalSummary(customerResponse.historicalSummary)
        setLatestCampaignPlayDate(customerResponse.latestPlayDate)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to initialize Fill Sessions."
        setCustomerError(message)
        setCustomers([])
      } finally {
        setIsLoadingCustomers(false)
      }
    }

    void initialize()
  }, [])

  const handleApply = async () => {
    setStatusMessage(null)
    setCurrentCustomerPage(1)
    setHasRequestedRecommendations(true)
    await loadCustomers()
  }

  useEffect(() => {
    const runFilteredPage = async () => {
      setStatusMessage(null)

      const nextCourtType = mapVenueToCourtType(selectedVenue)
      const nextCustomerTypeVal = mapCustomerTypeToApiValue(selectedBookingType)

      setCourtType(nextCourtType)
      setCustomerType(nextCustomerTypeVal)
      setCurrentCustomerPage(1)

      await Promise.all([
        loadPlaytime({
          nextStartDate: selectedStartDate,
          nextEndDate: selectedEndDate,
          nextVenue: selectedVenue,
          nextCustomerType: selectedBookingType,
        }),
        loadCustomers({
          nextCourtType,
          nextCustomerType: nextCustomerTypeVal,
        }),
      ])
    }

    void runFilteredPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStartDate, selectedEndDate, selectedVenue, selectedBookingType])

  const loadMessageDraft = async (customer: RecommendedTargetCustomer) => {
    setIsGeneratingDraftMessage(true)
    setGenerateDraftMessageError(null)

    try {
      const result = await generateOutreachMessage({
        customerName: customer.customerName || customer.customerKey,
        rfmSegmentName: customer.rfmSegmentName,
        customerTypeLabel: customer.customerTypeLabel,
        preferredSession: customer.preferredSession,
        courtType,
        suggestedAction: customer.suggestedAction,
        recencyDays: customer.recencyDays,
        totalBookingCount: customer.totalBookingCount,
      })
      setGeneratedDraftMessage(result.message)
    } catch (error) {
      setGenerateDraftMessageError(
        error instanceof Error ? error.message : "Failed to generate the message draft."
      )
    } finally {
      setIsGeneratingDraftMessage(false)
    }
  }

  useEffect(() => {
    if (!messageDraftCustomer) {
      setGeneratedDraftMessage(null)
      setGenerateDraftMessageError(null)
      return
    }

    void loadMessageDraft(messageDraftCustomer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageDraftCustomer])

  const copyText = async (text: string | null, successMessage: string) => {
    if (!text) {
      setStatusMessage("No value available to copy.")
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      setStatusMessage(successMessage)
    } catch {
      setStatusMessage("Failed to copy to clipboard.")
    }
  }

  const openGenAi = (customer: RecommendedTargetCustomer) => {
    const [sessionStartHour, sessionEndHour] = (SESSION_HOUR_LABELS[sessionName] || "").split(" - ")
    const slotTimeLabel = SESSION_HOUR_LABELS[sessionName] || null

    saveLowOccupancyOutreachContext({
      source: "low_occupancy_targeting",
      intent: "campaign",
      customerKey: customer.customerKey,
      customerName: customer.customerName,
      phone: customer.phone,
      email: customer.email,
      customerTypeLabel: customer.customerTypeLabel,
      bookingTypeDominant: customer.bookingTypeDominant,
      courtType,
      sessionName,
      sessionStartHour: sessionStartHour || null,
      sessionEndHour: sessionEndHour || null,
      slotTimeLabel,
      date: INITIAL_DATE,
      preferredSession: customer.preferredSession,
      selectedSessionBookingCount: customer.selectedSessionBookingCount,
      selectedCourtBookingCount: customer.selectedCourtBookingCount,
      totalBookingCount: customer.totalBookingCount,
      lastBookingDate: customer.lastBookingDate,
      recencyDays: customer.recencyDays,
      avgSpend: customer.avgSpend,
      totalRevenue: customer.totalRevenue,
      rfmSegmentName: customer.rfmSegmentName,
      targetPriorityScore: customer.targetPriorityScore,
      targetPriorityLabel: customer.targetPriorityLabel,
      suggestedAction: customer.suggestedAction,
      whatsappMessage: customer.whatsappMessage,
    })

    setStatusMessage("Campaign context sent to GenAI Workspace.")
    onNavigate("genai")
  }

  const playtimeChart = buildPlaytimeChart(playtimeMixData)
const playtimeChartTotal = playtimeChart.reduce((sum, item) => sum + item.value, 0)
const playtimeLegend = playtimeChart.map((item) => ({
  ...item,
  percentage: playtimeChartTotal > 0 ? (item.value / playtimeChartTotal) * 100 : 0,
}))
const dominantPlaytime = playtimeLegend.reduce<typeof playtimeLegend[number] | null>(
  (selected, item) => (!selected || item.value > selected.value ? item : selected),
  null
)
const playtimeBehaviorInsight = !dominantPlaytime || !playtimeMixData
  ? "No historical play-time preference insight is available yet."
  : `Most bookings are in the ${dominantPlaytime.name} slot with ${formatPlaytimePercent(dominantPlaytime.percentage)} of all bookings.`
const dataMonthRangeLabel = buildMonthRangeLabel(dataMonthRange?.min ?? null, dataMonthRange?.max ?? null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fill Sessions</h1>
        <p className="text-base text-muted-foreground">
          Use uploaded historical transactions to spot weaker play sessions and build a targeted promo audience.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border-l-4 border-amber-400 bg-amber-50/50 px-3 py-2 text-xs text-amber-800 animate-pulse-subtle">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>Insights on this page are based on uploaded historical transaction data and do not reflect real-time slot availability.</span>
      </div>

      {statusMessage && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4 text-sm text-primary">
            {statusMessage}
          </CardContent>
        </Card>
      )}
      
<div className="rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm backdrop-blur">
  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
    <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
      Page filters
    </p>
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="group flex h-11 w-[200px] items-center gap-3 rounded-xl border border-border/70 bg-background/90 px-3 shadow-sm transition hover:border-primary/35 hover:bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Start</span>
        <input
          type="date"
          value={selectedStartDate}
          onChange={(event) => {
            const nextStartDate = event.target.value
            setSelectedStartDate(nextStartDate)
            if (selectedEndDate && nextStartDate > selectedEndDate) {
              setSelectedEndDate(nextStartDate)
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none"
        />
      </div>
      <div className="group flex h-11 w-[200px] items-center gap-3 rounded-xl border border-border/70 bg-background/90 px-3 shadow-sm transition hover:border-primary/35 hover:bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">End</span>
        <input
          type="date"
          value={selectedEndDate}
          onChange={(event) => {
            const nextEndDate = event.target.value
            setSelectedEndDate(nextEndDate)
            if (selectedStartDate && nextEndDate < selectedStartDate) {
              setSelectedStartDate(nextEndDate)
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none"
        />
      </div>
      <div className="w-[160px]">
        <Select value={selectedVenue} onValueChange={setSelectedVenue}>
          <SelectTrigger className="h-11 w-full rounded-xl border border-border/70 bg-background/90 px-3 shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:ring-2 focus:ring-primary/15">
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Venue</span>
              <SelectValue placeholder="Venue" />
            </div>
          </SelectTrigger>
          <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg">
            {VENUE_OPTIONS.map((venue) => (
              <SelectItem key={venue.value} value={venue.value}>{venue.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-[210px] min-w-[210px]">
        <Select value={selectedBookingType} onValueChange={setSelectedBookingType}>
          <SelectTrigger className="h-11 w-full rounded-xl border border-border/70 bg-background/90 px-3 shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:ring-2 focus:ring-primary/15">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Booking</span>
              <SelectValue placeholder="Booking Type" className="whitespace-nowrap" />
            </div>
          </SelectTrigger>
          <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg">
            {BOOKING_TYPE_OPTIONS.map((bt) => (
              <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
</div>

     {isLoadingHeatmap ? (
  <Card className="border-border bg-card shadow-sm">
    <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading slot data...
    </CardContent>
  </Card>
) : (
  <>
    <HeatmapGrid heatmapSummary={heatmapData} emptyHint={dataMonthRangeLabel} />
    {dataMonthLabel && (
      <p className="mt-1 text-xs text-muted-foreground">
        Data period: {dataMonthLabel}
      </p>
    )}
  </>
)}

<Card className="border-border bg-card shadow-sm">
  <CardHeader>
    <CardTitleTooltip title="Play-Time Preference Mix" tooltip="Shows how bookings are distributed across morning, afternoon, evening, and night." />
    <CardDescription>{playtimeBehaviorInsight}</CardDescription>
  </CardHeader>
  <CardContent>
    {isLoadingPlaytime ? (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading play-time data...
      </div>
    ) : (
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="h-[320px]">
          {playtimeChart.every((item) => item.value === 0) || playtimeChart.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              No play-time data available yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={playtimeChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} tick={<PlaytimeAxisTick />} height={50} />
                <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip
                  formatter={(value: number, _name: string, props: { payload?: { value?: number; name?: string } }) => {
                    const sessionCount = Number(value || props.payload?.value || 0)
                    const percentage = playtimeChartTotal > 0 ? (sessionCount / playtimeChartTotal) * 100 : 0
                    return [`${sessionCount.toLocaleString("en-US")} sessions (${formatPlaytimePercent(percentage)})`, props.payload?.name || "Historical demand"]
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} cursor="pointer">
                  {playtimeChart.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-primary/5 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Dominant Historical Preference</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{dominantPlaytime?.name || "-"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {dominantPlaytime
                ? `${formatPlaytimePercent(dominantPlaytime.percentage)} of booked sessions${dataMonthLabel ? ` in ${dataMonthLabel}` : " in the current period"} came from this play-time window.`
                : "No historical data to determine dominant play-time window."}
            </p>
          </div>

          {playtimeLegend.map((item) => (
            <div key={item.name} className="rounded-xl border border-border bg-secondary/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="mt-1 inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatPlaytimePercent(item.percentage)} of historical booked sessions</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-slate-900">{item.value.toLocaleString("en-US")}</p>
              </div>
            </div>
          ))}
          {playtimeMixData ? (
            <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
              {playtimeMixData.totalSessions.toLocaleString("en-US")} sessions from {playtimeMixData.totalCustomers.toLocaleString("en-US")} customers in {dataMonthLabel || "the current period"}.
            </div>
          ) : null}
        </div>
      </div>
    )}
  </CardContent>
</Card>

<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-xl">
      <Target className="h-5 w-5 text-primary" />
      Campaign Targeting
      <InfoTooltip content="Set the campaign day, session, and audience filters — customers are ranked from their entire booking history." />
    </CardTitle>
          <CardDescription>
            Set the campaign day, session, and audience filters — customers are ranked from their entire booking history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <FilterLabel
                label="Campaign Day"
                tooltip={FILTER_HELP_TEXT.campaignDay}
              />
              <Select value={campaignDay} onValueChange={setCampaignDay}>
                <SelectTrigger className="h-11 w-full rounded-xl border border-border/70 bg-background/90 px-3 shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:ring-2 focus:ring-primary/15">
                  <SelectValue placeholder="Campaign Day" />
                </SelectTrigger>
                <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg">
                  {CAMPAIGN_DAY_OPTIONS.map((day) => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <FilterLabel label="Analysis Period" tooltip={FILTER_HELP_TEXT.analysisPeriod} />
              <Select
                value={String(analysisPeriodMonths)}
                onValueChange={(value) => setAnalysisPeriodMonths(Number(value))}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border border-border/70 bg-background/90 px-3 shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:ring-2 focus:ring-primary/15">
                  <SelectValue placeholder="Analysis Period" />
                </SelectTrigger>
                <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg">
                  {ANALYSIS_PERIOD_OPTIONS.map((months) => (
                    <SelectItem key={months} value={String(months)}>
                      {months} Month{months > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <FilterLabel
                label="Court Type"
                tooltip={FILTER_HELP_TEXT.courtType}
              />
              <Select value={courtType} onValueChange={setCourtType}>
                <SelectTrigger className="h-11 w-full rounded-xl border border-border/70 bg-background/90 px-3 shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:ring-2 focus:ring-primary/15">
                  <SelectValue placeholder="Court Type" />
                </SelectTrigger>
                <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg">
                  {COURT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <FilterLabel
                label="Play Session"
                tooltip={FILTER_HELP_TEXT.playSession}
              />
              <Select
                value={sessionName}
                onValueChange={(value) =>
                  setSessionName(value as (typeof SESSION_OPTIONS)[number])
                }
              >
                <SelectTrigger className="h-11 w-full rounded-xl border border-border/70 bg-background/90 px-3 shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:ring-2 focus:ring-primary/15">
                  <SelectValue placeholder="Play Session" />
                </SelectTrigger>
                <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg">
                  {SESSION_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <FilterLabel
                label="Target Customer"
                tooltip={FILTER_HELP_TEXT.customerType}
              />
              <Select value={customerType} onValueChange={setCustomerType}>
                <SelectTrigger className="h-11 w-full rounded-xl border border-border/70 bg-background/90 px-3 shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:ring-2 focus:ring-primary/15">
                  <SelectValue placeholder="Target Customer" />
                </SelectTrigger>
                <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg">
                  {CUSTOMER_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <FilterLabel
                label="RFM Segment"
                tooltip={FILTER_HELP_TEXT.rfmSegment}
              />
              <Select value={segmentName} onValueChange={setSegmentName}>
                <SelectTrigger className="h-11 w-full rounded-xl border border-border/70 bg-background/90 px-3 shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:ring-2 focus:ring-primary/15">
                  <SelectValue placeholder="RFM Segment" />
                </SelectTrigger>
                <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg">
                  {SEGMENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            <Button onClick={handleApply} className="h-11 gap-2 rounded-xl px-5">
              {isLoadingCustomers ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Target className="h-4 w-4" />
                  Find Recommended Customers
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground md:whitespace-nowrap">
              Recommendations are ranked from each customer&apos;s entire booking history and the latest available RFM segmentation.
            </p>
          </div>
        </CardContent>
      </Card>

      {hasRequestedRecommendations && (
      <Card>
        <CardHeader>
          <CardTitleTooltip title="Historical Campaign Performance" tooltip="Facility occupancy and revenue for the selected weekday, court, and play session." />
          <CardDescription>Calendar-month performance anchored to the latest available play date.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {historicalSummary && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="flex min-h-20 flex-col justify-center rounded-2xl border border-primary/20 bg-primary/15 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Average Occupancy</p>
                <p className="mt-1.5 text-xl font-bold text-foreground">{historicalSummary.averageOccupancy ?? "Unavailable"}%</p>
              </div>
              <div className="flex min-h-20 flex-col justify-center rounded-2xl border border-primary/20 bg-primary/15 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Average Filled Slots</p>
                <p className="mt-1.5 text-xl font-bold text-foreground">
                  {historicalSummary.averageFilledSlots}{" "}
                  <span className="text-sm font-medium text-muted-foreground">slots/month</span>
                </p>
              </div>
              <div className="flex min-h-20 flex-col justify-center rounded-2xl border border-primary/20 bg-primary/15 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Revenue</p>
                <p className="mt-1.5 whitespace-nowrap text-xl font-bold text-foreground">Rp {historicalSummary.totalRevenue.toLocaleString("id-ID")}</p>
              </div>
              <div className="flex min-h-20 flex-col justify-center rounded-2xl border border-primary/20 bg-primary/15 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Average Monthly Revenue</p>
                <p className="mt-1.5 whitespace-nowrap text-xl font-bold text-foreground">Rp {historicalSummary.averageMonthlyRevenue.toLocaleString("id-ID")}</p>
              </div>
            </div>
          )}
          {monthlyPerformance.length > 0 && (
            <p className="text-sm font-semibold text-foreground">Monthly Breakdown</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {monthlyPerformance.map((month) => (
              <div key={month.month} className="flex h-full flex-col rounded-2xl border border-border/80 bg-card p-4 transition-colors hover:border-primary/25 hover:bg-primary/[0.025]">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{month.monthLabel}</p>
                <p className="mt-3 text-3xl font-bold leading-none text-foreground">{month.occupancyRate === null ? "Unavailable" : `${month.occupancyRate}%`}</p>
                <p className="text-sm text-muted-foreground">Occupancy Rate</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Filled Slots</p>
                    <p className="mt-0.5 font-semibold text-foreground">{month.occupiedSlots} of {month.totalPossibleSlots}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="mt-0.5 whitespace-nowrap font-semibold text-foreground">Rp {month.revenue.toLocaleString("id-ID")}</p>
                  </div>
                </div>
                <p className="mt-4 whitespace-nowrap border-t border-primary/10 pt-3 text-xs text-muted-foreground">Data through {month.dataThrough}</p>
              </div>
            ))}
          </div>
          {!isLoadingCustomers && !latestCampaignPlayDate && monthlyPerformance.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
              Historical campaign performance is unavailable because no valid play-date history exists.
            </div>
          )}
        </CardContent>
      </Card>
      )}


      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitleTooltip title="Recommended Customers" tooltip="Only customers who have actually booked the selected Campaign Day + Play Session before, and whose preferred court, target customer type, and RFM segment match the other filters, are shown — ranked by their entire booking history." />
          <CardDescription>
            Customers with a proven history of booking the selected Campaign Day and Play Session, filtered further by court, target customer, and segment.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-6 pb-6">
          {customerError ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {customerError}
            </div>
          ) : isLoadingCustomers ? (
            <div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading recommended customers...
            </div>
          ) : customers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
              No matching customers found for this session. Try adjusting the filters.
            </div>
          ) : (
            <div className="max-w-full overflow-x-auto rounded-2xl border border-border">
              <table className="min-w-[1900px] divide-y divide-border text-sm [&_td:not(:last-child)]:border-r [&_td:not(:last-child)]:border-border/70 [&_th:not(:last-child)]:border-r [&_th:not(:last-child)]:border-border/70">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="min-w-[150px] px-3 py-3 text-center align-middle font-semibold">Customer Name</th>
                    <th className="min-w-[135px] px-3 py-3 text-center align-middle font-semibold">Customer Type</th>
                    <th className="min-w-[125px] px-3 py-3 text-center align-middle font-semibold">Phone</th>
                    <th className="min-w-[190px] px-3 py-3 text-center align-middle font-semibold">Email</th>
                    <th className="min-w-[130px] px-3 py-3 text-center align-middle font-semibold">Preferred Session</th>
                    <th className="min-w-[120px] px-3 py-3 text-center align-middle font-semibold">Campaign Match</th>
                    <th className="min-w-[95px] px-3 py-3 text-center align-middle font-semibold">Court Count</th>
                    <th className="min-w-[120px] px-3 py-3 text-center align-middle font-semibold">Last Booking</th>
                    <th className="min-w-[125px] px-3 py-3 text-center align-middle font-semibold">Avg Spend</th>
                    <th className="min-w-[145px] px-3 py-3 text-center align-middle font-semibold">RFM Segment</th>
                    <th className="min-w-[135px] px-3 py-3 text-center align-middle font-semibold">Priority</th>
                    <th className="min-w-[220px] px-3 py-3 text-center align-middle font-semibold">Suggested Action</th>
                    <th className="min-w-[220px] px-3 py-3 text-center align-middle font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((customer) => (
                    <tr key={customer.customerKey} className="align-top">
                      <td className="px-3 py-3 font-medium text-slate-900">
                        {customer.customerName || customer.customerKey}
                      </td>
                      <td className="px-3 py-3">{customer.customerTypeLabel}</td>
                      <td className="whitespace-nowrap px-3 py-3">{customer.phone || "-"}</td>
                      <td className="px-3 py-3">{customer.email || "-"}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-center">{customer.preferredSession || "-"}</td>
                      <td className="px-3 py-3 text-center">{customer.selectedSessionBookingCount}</td>
                      <td className="px-3 py-3 text-center">{customer.selectedCourtBookingCount}</td>
                      <td className="min-w-[120px] whitespace-nowrap px-3 py-3 text-center">{customer.lastBookingDate || "-"}</td>
                      <td className="min-w-[125px] whitespace-nowrap px-3 py-3 text-right">Rp {customer.avgSpend.toLocaleString()}</td>
                      <td className="px-3 py-3 text-center">{customer.rfmSegmentName || "Not segmented"}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="space-y-1">
                          <Badge
                            variant="secondary"
                            className={customer.targetPriorityLabel === "High Priority"
                              ? "border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                              : "border border-border bg-muted text-muted-foreground hover:bg-muted"}
                          >
                            {customer.targetPriorityLabel}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            Score: {customer.targetPriorityScore}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-3">{customer.suggestedAction}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex min-w-[220px] flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="justify-start gap-2"
                            onClick={() =>
                              void copyText(customer.phone, "Phone copied to clipboard.")
                            }
                          >
                            <Copy className="h-4 w-4" />
                            Copy Phone
                          </Button>
                          <Button
                            size="sm"
                            className="justify-start gap-2"
                            onClick={() => setMessageDraftCustomer(customer)}
                          >
                            <Sparkles className="h-4 w-4" />
                            Generate Message
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="justify-start gap-2"
                            onClick={() => openGenAi(customer)}
                          >
                            <Sparkles className="h-4 w-4" />
                            Open AI Workspace
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
          {customerPagination && Math.ceil((customerPagination.totalCustomers || 0) / customerPageSize) > 1 ? (
            <div className="border-t border-border bg-background/80 px-6 py-3">
              <Pagination className="justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  Page {currentCustomerPage} of {Math.max(1, Math.ceil((customerPagination.totalCustomers || 0) / customerPageSize))}
                </div>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      aria-disabled={currentCustomerPage === 1}
                      onClick={(event) => {
                        event.preventDefault()
                        if (currentCustomerPage === 1) return
                        const prevPage = currentCustomerPage - 1
                        setCurrentCustomerPage(prevPage)
                      }}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.max(1, Math.ceil((customerPagination.totalCustomers || 0) / customerPageSize)) }, (_, index) => index + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        isActive={page === currentCustomerPage}
                        onClick={(event) => {
                          event.preventDefault()
                          setCurrentCustomerPage(page)
                        }}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      aria-disabled={currentCustomerPage === Math.max(1, Math.ceil((customerPagination.totalCustomers || 0) / customerPageSize))}
                      onClick={(event) => {
                        event.preventDefault()
                        const totalPages = Math.max(1, Math.ceil((customerPagination.totalCustomers || 0) / customerPageSize))
                        if (currentCustomerPage === totalPages) return
                        const nextPage = currentCustomerPage + 1
                        setCurrentCustomerPage(nextPage)
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(messageDraftCustomer)}
        onOpenChange={(open) => {
          if (!open) setMessageDraftCustomer(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Message Draft for {messageDraftCustomer?.customerName || messageDraftCustomer?.customerKey}
            </DialogTitle>
            <DialogDescription>
              AI-generated WhatsApp message based on this customer&apos;s segment, preferred session, and booking history.
            </DialogDescription>
          </DialogHeader>

          {isGeneratingDraftMessage ? (
            <div className="flex min-h-24 items-center justify-center gap-2 rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating message with AI...
            </div>
          ) : generateDraftMessageError ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {generateDraftMessageError}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-secondary/20 p-4">
              <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                {generatedDraftMessage}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="gap-2"
              disabled={isGeneratingDraftMessage || !messageDraftCustomer}
              onClick={() => messageDraftCustomer && void loadMessageDraft(messageDraftCustomer)}
            >
              <Sparkles className="h-4 w-4" />
              Regenerate
            </Button>
            <Button
              className="gap-2"
              disabled={isGeneratingDraftMessage || !generatedDraftMessage}
              onClick={() =>
                void copyText(generatedDraftMessage, "WhatsApp message copied to clipboard.")
              }
            >
              <Copy className="h-4 w-4" />
              Copy Message
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


