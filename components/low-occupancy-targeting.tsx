"use client"

import { useEffect, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertCircle,
  Copy,
  Info,
  Loader2,
  MessageSquare,
  Sparkles,
  Target,
} from "lucide-react"
import { HeatmapGrid } from "@/components/segment-visualization"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination"
import {
  getLowOccupancySessions,
  getRecommendedCustomers,
  type LowOccupancySessionCard,
  type RecommendedCustomersResponse,
  type RecommendedTargetCustomer,
} from "@/lib/targeting"
import {
  saveLowOccupancyOutreachContext,
  type LowOccupancyOutreachIntent,
} from "@/lib/low-occupancy-outreach"
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
  }>
  mostEmptySlot: {
    dayLabel: string
    hourLabel: string
    sessionLabel: string
    sessionCount: number
  } | null
}

interface PlaytimeData {
  totalCustomers: number
  totalSessions: number
  clusterCount?: number
  createdAt?: string
  sessionByTime?: unknown
  heatmapSummary?: HeatmapSummary | null   // ⬅️ tambah baris ini
}

interface PlaytimeSessionCustomer {
  customerName: string
  sessionCount: number
  totalSesi: number
  playtimeSegment: string
  activityLevel: string | null
}

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
const CHART_NAME_TO_SESSION_KEY: Record<string, string> = {
  Morning: "Pagi", Afternoon: "Siang", Evening: "Evening", Night: "Malam",
}

const formatPlaytimePercent = (value: number) => `${Number(value.toFixed(1))}%`

const getPlaytimeRelativeTime = (value?: string | null) => {
  if (!value) return "Not updated yet"
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return "Not updated yet"
  const diffMinutes = Math.floor((Date.now() - timestamp.getTime()) / 60000)
  if (diffMinutes < 1) return "just now"
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  const diffDays = Math.floor(diffHours / 24)
  return diffDays === 1 ? "yesterday" : `${diffDays} days ago`
}

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

const buildPlaytimeChart = (playtimeData: PlaytimeData | null) => {
  const directRows = parsePlaytimeJsonArray<PlaytimeSessionPoint>(playtimeData?.sessionByTime)

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
  { value: "internal", label: "Internal" },
]
const SEGMENT_OPTIONS = [
  { value: "all", label: "All" },
  { value: "Prime Players", label: "Prime Players" },
  { value: "Routine Players", label: "Routine Players" },
  { value: "Growth Players", label: "Growth Players" },
  { value: "Re-Engagement Players", label: "Re-Engagement Players" },
]


const VENUE_OPTIONS = [
  { value: "All Venue", label: "All Venue" },
  { value: "Mini Soccer", label: "Mini Soccer" },
  { value: "Basketball", label: "Basketball" },
]

const PAGE_CUSTOMER_TYPE_OPTIONS = [
  { value: "All Type", label: "All Type" },
  { value: "Membership", label: "Membership" },
  { value: "Non Membership", label: "Non Membership" },
  { value: "Internal", label: "Internal" },

]

const getTodayIso = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
const INITIAL_DATE = getTodayIso()
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
const INITIAL_COURT_TYPE = "all"
const INITIAL_SESSION_NAME: (typeof SESSION_OPTIONS)[number] = "Morning"
const INITIAL_CUSTOMER_TYPE = "all"
const INITIAL_SEGMENT_NAME = "all"
const INITIAL_MIN_SESSION_BOOKING_COUNT = 1
const INITIAL_CUSTOMER_PAGE_SIZE = 10

const FILTER_HELP_TEXT = {
  campaignDate:
    "Pick the target play date you want to inspect. The session cards use uploaded historical transactions for that selected day, not live slot availability.",
  courtType:
    "Focus the promo opportunity on a specific court type or keep all courts included.",
  playSession:
    "Choose the session bucket you want to promote: Morning, Afternoon, Evening, or Night.",
  customerType:
    "Narrow the audience to membership, non-membership, or both depending on the promo goal.",
  rfmSegment:
    "Filter the audience by the latest available RFM segment to support retention, growth, or re-engagement campaigns.",
  minBookingCount:
    "Set the minimum number of past bookings in the selected session before a customer is considered a strong target.",
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

export function LowOccupancyTargeting({ onNavigate }: LowOccupancyTargetingProps) {

  const [playtimeData, setPlaytimeData] = useState<PlaytimeData | null>(null)
  const [isLoadingPlaytime, setIsLoadingPlaytime] = useState(true)
  const [selectedPlaytimeSession, setSelectedPlaytimeSession] = useState<string | null>(null)
  const [playtimeSessionCustomers, setPlaytimeSessionCustomers] = useState<PlaytimeSessionCustomer[]>([])
  const [isLoadingPlaytimeCustomers, setIsLoadingPlaytimeCustomers] = useState(false)
 const [selectedStartDate, setSelectedStartDate] = useState(INITIAL_DATE_RANGE.startDate)
const [selectedEndDate, setSelectedEndDate] = useState(INITIAL_DATE_RANGE.endDate)
const [selectedVenue, setSelectedVenue] = useState("All Venue")
const [selectedCustomerType, setSelectedCustomerType] = useState("All Type")
  const [date, setDate] = useState(INITIAL_DATE)
  const [courtType, setCourtType] = useState(INITIAL_COURT_TYPE)
  const [sessionName, setSessionName] = useState<(typeof SESSION_OPTIONS)[number]>(INITIAL_SESSION_NAME)
  const [customerType, setCustomerType] = useState(INITIAL_CUSTOMER_TYPE)
  const [segmentName, setSegmentName] = useState(INITIAL_SEGMENT_NAME)
  const [minSessionBookingCount, setMinSessionBookingCount] = useState(INITIAL_MIN_SESSION_BOOKING_COUNT)

  const [sessions, setSessions] = useState<LowOccupancySessionCard[]>([])
  const [customers, setCustomers] = useState<RecommendedTargetCustomer[]>([])
  const [customerPagination, setCustomerPagination] = useState<RecommendedCustomersResponse["pagination"] | null>(null)
  const [currentCustomerPage, setCurrentCustomerPage] = useState(1)
  const [customerPageSize, setCustomerPageSize] = useState(INITIAL_CUSTOMER_PAGE_SIZE)
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [customerError, setCustomerError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [selectedCardKey, setSelectedCardKey] = useState<string | null>(null)

  const loadSessions = async (nextDate = date, nextCourtType = courtType) => {
    setIsLoadingSessions(true)
    setSessionError(null)

    try {
      const response = await getLowOccupancySessions({
        date: nextDate,
        courtType: nextCourtType,
      })
      setSessions(response.sessions)
    } catch (error) {
      setSessionError(
        error instanceof Error
          ? error.message
          : "Failed to load historical low-demand session summary."
      )
      setSessions([])
    } finally {
      setIsLoadingSessions(false)
    }
  }

  const loadCustomers = async (filters?: {
    nextDate?: string
    nextCourtType?: string
    nextSessionName?: string
    nextCustomerType?: string
    nextSegmentName?: string
    nextMinSessionBookingCount?: number
    nextPage?: number
    nextPageSize?: number
  }) => {
    const nextDate = filters?.nextDate ?? date
    const nextCourtType = filters?.nextCourtType ?? courtType
    const nextSessionName = filters?.nextSessionName ?? sessionName
    const nextCustomerType = filters?.nextCustomerType ?? customerType
    const nextSegmentName = filters?.nextSegmentName ?? segmentName
    const nextMinSessionBookingCount =
      filters?.nextMinSessionBookingCount ?? minSessionBookingCount
    const nextCustomerPage = filters?.nextPage ?? currentCustomerPage
    const nextLimit = filters?.nextPageSize ?? customerPageSize

    setIsLoadingCustomers(true)
    setCustomerError(null)

    try {
      const response = await getRecommendedCustomers({
        date: nextDate,
        courtType: nextCourtType,
        sessionName: nextSessionName,
        customerType: nextCustomerType,
        segmentName: nextSegmentName === "all" ? undefined : nextSegmentName,
        minSessionBookingCount: nextMinSessionBookingCount,
        limit: nextLimit,
        offset: (nextCustomerPage - 1) * nextLimit,
      })
      setCustomers(response.customers)
      setCustomerPagination(response.pagination)
    } catch (error) {
      setCustomerError(
        error instanceof Error
          ? error.message
          : "Failed to load recommended customers."
      )
      setCustomers([])
    } finally {
      setIsLoadingCustomers(false)
    }
  }



const mapVenueToCourtType = (venue: string) => {
  if (venue === "Mini Soccer") return "mini_soccer"
  if (venue === "Basketball") return "basketball"
  return "all"
}

const mapCustomerTypeToApiValue = (customerType: string) => {
  if (customerType === "Membership") return "membership"
  if (customerType === "Non Membership") return "non_membership"
  if (customerType === "Internal") return "internal"
  return "all"
}

const loadPlaytime = async (filters?: {
  nextStartDate?: string
  nextEndDate?: string
  nextVenue?: string
  nextCustomerType?: string
}) => {
  const nextStartDate = filters?.nextStartDate ?? selectedStartDate
  const nextEndDate = filters?.nextEndDate ?? selectedEndDate
  const nextVenue = filters?.nextVenue ?? selectedVenue
  const nextCustomerType = filters?.nextCustomerType ?? selectedCustomerType

  setSelectedPlaytimeSession(null)
  setPlaytimeSessionCustomers([])
  setIsLoadingPlaytime(true)

  try {
    const query = new URLSearchParams({
      startDate: nextStartDate,
      endDate: nextEndDate,
      venue: nextVenue,
      customerType: nextCustomerType,
      bookingType: "all",
    })

    const response = await fetch(getApiUrl(`/dashboard/playtime-mix?${query.toString()}`), {
      headers: getAuthHeaders(),
      cache: "no-store",
    })

    const result = await response.json().catch(() => null)
    setPlaytimeData(result?.success ? result.data : null)
  } catch {
    setPlaytimeData(null)
  } finally {
    setIsLoadingPlaytime(false)
  }
}


  const handlePlaytimeBarClick = async (data: { name?: string }) => {
  const chartName = data?.name
  if (!chartName) return
  const sessionKey = CHART_NAME_TO_SESSION_KEY[chartName]
  if (!sessionKey) return

  if (selectedPlaytimeSession === chartName) {
    setSelectedPlaytimeSession(null)
    setPlaytimeSessionCustomers([])
    return
  }

  setSelectedPlaytimeSession(chartName)
  setIsLoadingPlaytimeCustomers(true)

  try {
    const response = await fetch(getApiUrl(`/ml/playtime/customers?session=${sessionKey}`), { headers: getAuthHeaders(), cache: "no-store" })
    const result = await response.json().catch(() => null)
    setPlaytimeSessionCustomers(result?.success && Array.isArray(result?.data?.customers) ? result.data.customers : [])
  } catch {
    setPlaytimeSessionCustomers([])
  } finally {
    setIsLoadingPlaytimeCustomers(false)
  }
}

  useEffect(() => {
    const initialize = async () => {
      setIsLoadingSessions(true)
      setIsLoadingCustomers(true)
      setSessionError(null)
      setCustomerError(null)
      setCurrentCustomerPage(1)

      try {
        const [sessionResponse, customerResponse] = await Promise.all([
          getLowOccupancySessions({
            date: INITIAL_DATE,
            courtType: INITIAL_COURT_TYPE,
          }),
          getRecommendedCustomers({
            date: INITIAL_DATE,
            courtType: INITIAL_COURT_TYPE,
            sessionName: INITIAL_SESSION_NAME,
            customerType: INITIAL_CUSTOMER_TYPE,
            minSessionBookingCount: INITIAL_MIN_SESSION_BOOKING_COUNT,
            limit: INITIAL_CUSTOMER_PAGE_SIZE,
            offset: 0,
          }),
        ])

        setSessions(sessionResponse.sessions)
        setCustomers(customerResponse.customers)
        setCustomerPagination(customerResponse.pagination)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to initialize Promote Underbooked Sessions."
        setSessionError(message)
        setCustomerError(message)
        setSessions([])
        setCustomers([])
      } finally {
        setIsLoadingSessions(false)
        setIsLoadingCustomers(false)
      }
    }

    void initialize()
  }, [])

  const handleApply = async () => {
    setStatusMessage(null)
    setCurrentCustomerPage(1)
    await Promise.all([loadSessions(date, courtType), loadCustomers({ nextDate: date, nextCourtType: courtType, nextSessionName: sessionName, nextCustomerType: customerType, nextSegmentName: segmentName, nextMinSessionBookingCount: minSessionBookingCount, nextPage: 1 })])
  }

  const handleCardSelect = async (card: LowOccupancySessionCard) => {
    setCourtType(card.courtType)
    setSessionName(card.sessionName as (typeof SESSION_OPTIONS)[number])
    setSelectedCardKey(`${card.courtType}:${card.sessionName}`)
    setStatusMessage(null)
    setCurrentCustomerPage(1)

    await loadCustomers({
      nextCourtType: card.courtType,
      nextSessionName: card.sessionName,
      nextPage: 1,
    })
  }

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

  const openGenAi = (
    customer: RecommendedTargetCustomer,
    intent: LowOccupancyOutreachIntent
  ) => {
    const selectedSessionCard = sessions.find(
      (session) => session.courtType === courtType && session.sessionName === sessionName
    )
    const slotTimeLabel = selectedSessionCard
      ? `${selectedSessionCard.sessionStartHour} - ${selectedSessionCard.sessionEndHour}`
      : null

    saveLowOccupancyOutreachContext({
      source: "low_occupancy_targeting",
      intent,
      customerKey: customer.customerKey,
      customerName: customer.customerName,
      phone: customer.phone,
      email: customer.email,
      customerTypeLabel: customer.customerTypeLabel,
      bookingTypeDominant: customer.bookingTypeDominant,
      courtType,
      sessionName,
      sessionStartHour: selectedSessionCard?.sessionStartHour || null,
      sessionEndHour: selectedSessionCard?.sessionEndHour || null,
      slotTimeLabel,
      date,
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

    setStatusMessage(
      intent === "campaign"
        ? "Campaign context sent to GenAI Workspace."
        : "Outreach context sent to GenAI Workspace."
    )
    onNavigate("genai")
  }

  const lowSessions = sessions.filter((session) => session.status === "Low")
  const playtimeChart = buildPlaytimeChart(playtimeData)
const playtimeChartTotal = playtimeChart.reduce((sum, item) => sum + item.value, 0)
const playtimeLegend = playtimeChart.map((item) => ({
  ...item,
  percentage: playtimeChartTotal > 0 ? (item.value / playtimeChartTotal) * 100 : 0,
}))
const dominantPlaytime = playtimeLegend.reduce<typeof playtimeLegend[number] | null>(
  (selected, item) => (!selected || item.value > selected.value ? item : selected),
  null
)
const playtimeBehaviorInsight = !dominantPlaytime || !playtimeData
  ? "No historical play-time preference insight is available yet."
  : `Most bookings are in the ${dominantPlaytime.name} slot with ${formatPlaytimePercent(dominantPlaytime.percentage)} of all bookings.`

  const isPageUpdating = isLoadingPlaytime || isLoadingSessions || isLoadingCustomers
const isInitialPlaytimeLoading = isLoadingPlaytime && !playtimeData

useEffect(() => {
  const runFilteredPage = async () => {
    setStatusMessage(null)
    setCurrentCustomerPage(1)

    const nextCourtType = mapVenueToCourtType(selectedVenue)
    const nextCustomerType = mapCustomerTypeToApiValue(selectedCustomerType)

    setCourtType(nextCourtType)
    setCustomerType(nextCustomerType)

    await Promise.all([
      loadPlaytime({
        nextStartDate: selectedStartDate,
        nextEndDate: selectedEndDate,
        nextVenue: selectedVenue,
        nextCustomerType: selectedCustomerType,
      }),
      loadSessions(date, nextCourtType),
      loadCustomers({
        nextDate: date,
        nextCourtType,
        nextCustomerType,
        nextSessionName: sessionName,
        nextSegmentName: segmentName,
        nextMinSessionBookingCount: minSessionBookingCount,
        nextPage: 1,
      }),
    ])
  }

  void runFilteredPage()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedStartDate, selectedEndDate, selectedVenue, selectedCustomerType])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Promote Underbooked Sessions</h1>
        <p className="text-base text-muted-foreground">
          Use uploaded historical transactions to spot weaker play sessions and build a targeted promo audience.
        </p>
      </div>
     <Card className="rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm backdrop-blur">
  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
    <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
      Page filters
    </p>

    <div className="flex flex-wrap items-center justify-end gap-2">
      {/* Start Date */}
      <div className="group relative w-[200px]">
        <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors group-focus-within:text-foreground">
          Start
        </span>

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
          className="h-11 w-full rounded-xl border border-border/70 bg-background/90 pl-[4.4rem] pr-3 text-sm font-medium text-foreground shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>

      {/* End Date */}
      <div className="group relative w-[200px]">
        <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors group-focus-within:text-foreground">
          End
        </span>

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
          className="h-11 w-full rounded-xl border border-border/70 bg-background/90 pl-[3.6rem] pr-3 text-sm font-medium text-foreground shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>

      {/* Venue */}
      <div className="w-[184px]">
        <Select value={selectedVenue} onValueChange={setSelectedVenue}>
          <SelectTrigger className="h-11 w-full rounded-xl border border-border/70 bg-background/90 px-3 shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:ring-2 focus:ring-primary/15">
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Venue
              </span>
              <SelectValue placeholder="Venue" />
            </div>
          </SelectTrigger>

          <SelectContent
            position="popper"
            className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg"
          >
            {VENUE_OPTIONS.map((venue) => (
              <SelectItem key={venue.value} value={venue.value}>
                {venue.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Customer */}
      <div className="w-[220px]">
        <Select
          value={selectedCustomerType}
          onValueChange={setSelectedCustomerType}
        >
          <SelectTrigger className="h-11 w-full rounded-xl border border-border/70 bg-background/90 px-3 shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:ring-2 focus:ring-primary/15">
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Customer
              </span>
              <SelectValue placeholder="Customer" />
            </div>
          </SelectTrigger>

          <SelectContent
            position="popper"
            className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg"
          >
            {PAGE_CUSTOMER_TYPE_OPTIONS.map((customerType) => (
              <SelectItem key={customerType.value} value={customerType.value}>
                {customerType.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPageUpdating ? (
        <div className="inline-flex h-11 items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 text-sm text-primary shadow-sm transition-all duration-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating
        </div>
      ) : null}
    </div>
  </div>
</Card>
      {statusMessage && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4 text-sm text-primary">
            {statusMessage}
          </CardContent>
        </Card>
      )}
      
   <div
  className={`transition-all duration-500 ease-out ${
    isLoadingPlaytime ? "opacity-60 blur-[0.5px]" : "opacity-100 blur-0"
  }`}
>
  <HeatmapGrid heatmapSummary={playtimeData?.heatmapSummary ?? null} />
</div>

<Card className="border-border bg-card shadow-sm">
  <CardHeader>
    <CardTitleTooltip title="Play-Time Preference Mix" tooltip={playtimeBehaviorInsight || "Shows which time of day is most popular for bookings to identify promo opportunities"} />
  </CardHeader>
  <CardContent>
    
    {isInitialPlaytimeLoading ? (
  <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    Loading play-time data...
  </div>
) : (
  <div className="relative">
    {isLoadingPlaytime ? (
      <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-end rounded-2xl bg-background/20 p-3 backdrop-blur-[1px] transition-all duration-300">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/95 px-3 py-1.5 text-xs font-medium text-primary shadow-sm">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Updating chart
        </div>
      </div>
    ) : null}

    <div
      className={`grid gap-6 transition-all duration-500 ease-out xl:grid-cols-[1.2fr_0.8fr] ${
        isLoadingPlaytime ? "opacity-60 blur-[0.5px]" : "opacity-100 blur-0"
      }`}
    >
      <div className="h-[320px]">
        {playtimeChart.every((item) => item.value === 0) || playtimeChart.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            No play-time transaction data is available for the selected filters.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={playtimeChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="var(--muted-foreground)"
                tickLine={false}
                axisLine={false}
                tick={<PlaytimeAxisTick />}
                height={50}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <RechartsTooltip
                formatter={(value: number, _name: string, props: { payload?: { value?: number; name?: string } }) => {
                  const sessionCount = Number(value || props.payload?.value || 0)
                  const percentage = playtimeChartTotal > 0 ? (sessionCount / playtimeChartTotal) * 100 : 0
                  return [
                    `${sessionCount.toLocaleString("en-US")} sessions (${formatPlaytimePercent(percentage)})`,
                    props.payload?.name || "Historical demand",
                  ]
                }}
              />
              <Bar
                dataKey="value"
                radius={[6, 6, 0, 0]}
                onClick={handlePlaytimeBarClick}
                cursor="pointer"
                isAnimationActive
                animationDuration={700}
                animationEasing="ease-out"
              >
                {playtimeChart.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="space-y-3 transition-all duration-500 ease-out">
        <div className="rounded-2xl border border-border bg-primary/5 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Dominant Historical Preference
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {dominantPlaytime?.name || "-"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {dominantPlaytime
              ? `${formatPlaytimePercent(dominantPlaytime.percentage)} of booked sessions came from this play-time window.`
              : "No dominant play-time window is available for the selected filters."}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
          Click a bar in the chart to see the list of customers for that session.
        </div>

        {playtimeLegend.map((item) => (
          <div
            key={item.name}
            className="rounded-xl border border-border bg-secondary/20 p-4 transition-all duration-300 ease-out"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="mt-1 inline-flex h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <div>
                  <p className="font-medium text-slate-900">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatPlaytimePercent(item.percentage)} of historical booked sessions
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {item.value.toLocaleString("en-US")}
              </p>
            </div>
          </div>
        ))}

        {playtimeData ? (
          <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
            {playtimeData.totalSessions.toLocaleString("en-US")} sessions across{" "}
            {playtimeData.totalCustomers.toLocaleString("en-US")} customers based on the selected filters.
          </div>
        ) : null}
      </div>
    </div>
  </div>
)}

    {selectedPlaytimeSession ? (
      <div className="mt-6 rounded-xl border border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">
            Customers in {selectedPlaytimeSession} session ({playtimeSessionCustomers.length})
          </p>
          <Button variant="ghost" size="sm" onClick={() => { setSelectedPlaytimeSession(null); setPlaytimeSessionCustomers([]) }}>
            Close
          </Button>
        </div>
        {isLoadingPlaytimeCustomers ? (
          <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading customers...
          </div>
        ) : playtimeSessionCustomers.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No customers found for this session.</div>
        ) : (
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Customer</th>
                  <th className="px-4 py-2 text-right">Sessions in {selectedPlaytimeSession}</th>
                  <th className="px-4 py-2 text-right">Total Sessions</th>
                  <th className="px-4 py-2 text-left">Segment</th>
                  <th className="px-4 py-2 text-left">Activity Level</th>
                </tr>
              </thead>
              <tbody>
                {playtimeSessionCustomers.map((customer) => (
                  <tr key={customer.customerName} className="border-t border-border">
                    <td className="px-4 py-2">{customer.customerName}</td>
                    <td className="px-4 py-2 text-right">{customer.sessionCount}</td>
                    <td className="px-4 py-2 text-right">{customer.totalSesi}</td>
                    <td className="px-4 py-2">{customer.playtimeSegment}</td>
                    <td className="px-4 py-2">{customer.activityLevel || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    ) : null}
  </CardContent>
</Card>

<Card>
  <CardHeader>
    <CardTitleTooltip title="Campaign Targeting" tooltip="Configure campaign parameters to find the best customers for low-occupancy sessions. Choose the historical demand lens, then narrow the audience most worth targeting." className="text-xl" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
  {/* Campaign Date */}
  <label className="space-y-2">
    <FilterLabel
      label="Campaign Date"
      tooltip={FILTER_HELP_TEXT.campaignDate}
    />

    <input
      type="date"
      value={date}
      onChange={(event) => setDate(event.target.value)}
      className="h-12 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm font-medium text-foreground shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:border-primary focus:ring-2 focus:ring-primary/15"
    />
  </label>

  {/* Court Type */}
  <label className="space-y-2">
    <FilterLabel
      label="Court Type"
      tooltip={FILTER_HELP_TEXT.courtType}
    />

    <Select value={courtType} onValueChange={setCourtType}>
      <SelectTrigger className="h-12 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm font-medium text-foreground shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:ring-2 focus:ring-primary/15">
        <SelectValue placeholder="Select court type" />
      </SelectTrigger>

      <SelectContent
        position="popper"
        className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg"
      >
        {COURT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </label>

  {/* Play Session */}
  <label className="space-y-2">
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
      <SelectTrigger className="h-12 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm font-medium text-foreground shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:ring-2 focus:ring-primary/15">
        <SelectValue placeholder="Select session" />
      </SelectTrigger>

      <SelectContent
        position="popper"
        className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg"
      >
        {SESSION_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </label>

  {/* Target Customer */}
  <label className="space-y-2">
    <FilterLabel
      label="Target Customer"
      tooltip={FILTER_HELP_TEXT.customerType}
    />

    <Select value={customerType} onValueChange={setCustomerType}>
      <SelectTrigger className="h-12 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm font-medium text-foreground shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:ring-2 focus:ring-primary/15">
        <SelectValue placeholder="Select customer type" />
      </SelectTrigger>

      <SelectContent
        position="popper"
        className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg"
      >
        {CUSTOMER_TYPE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </label>

  {/* RFM Segment */}
  <label className="space-y-2">
    <FilterLabel
      label="RFM Segment"
      tooltip={FILTER_HELP_TEXT.rfmSegment}
    />

    <Select value={segmentName} onValueChange={setSegmentName}>
      <SelectTrigger className="h-12 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm font-medium text-foreground shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:ring-2 focus:ring-primary/15">
        <SelectValue placeholder="Select RFM segment" />
      </SelectTrigger>

      <SelectContent
        position="popper"
        className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg"
      >
        {SEGMENT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </label>

  {/* Minimum Session Booking Count */}
  <label className="space-y-2">
    <FilterLabel
      label="Minimum Session Booking Count"
      tooltip={FILTER_HELP_TEXT.minBookingCount}
    />

    <input
      type="number"
      min={1}
      value={minSessionBookingCount}
      onChange={(event) =>
        setMinSessionBookingCount(
          Math.max(1, Number(event.target.value) || 1)
        )
      }
      className="h-12 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm font-medium text-foreground shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:border-primary focus:ring-2 focus:ring-primary/15"
    />
  </label>
</div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Button onClick={handleApply} className="h-11 gap-2 rounded-xl px-5">
              {isLoadingSessions || isLoadingCustomers ? (
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
            <p className="max-w-2xl text-sm text-muted-foreground">
              Recommendations are ranked from historical booking behavior and the latest available RFM segmentation.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitleTooltip title="Historically Low-Demand Sessions" tooltip="Session buckets with the lowest historical demand, useful as promo opportunities. Use these session buckets as promo opportunities for the selected campaign date, then click a card to target the matching audience." className="text-xl" />
        </CardHeader>
        <CardContent>
          {sessionError ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {sessionError}
            </div>
          ) : isLoadingSessions ? (
            <div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading historical session demand...
            </div>
          ) : (
            <div className="space-y-4">
              {lowSessions.length === 0 && (
                <div className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                  No low-demand session was detected for this selection. Try another date or court type to inspect a different historical pattern.
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {sessions.map((card) => {
                  const cardKey = `${card.courtType}:${card.sessionName}`
                  const isActive =
                    selectedCardKey === cardKey ||
                    (courtType === card.courtType && sessionName === card.sessionName)

                  return (
                    <button
                      key={cardKey}
                      type="button"
                      onClick={() => void handleCardSelect(card)}
                      className={`rounded-2xl border p-4 text-left transition hover:border-primary/50 hover:shadow-sm ${
                        isActive
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">{card.courtTypeLabel}</p>
                          <h3 className="text-lg font-semibold">{card.sessionName}</h3>
                          <p className="text-xs text-muted-foreground">
                            {card.sessionStartHour} - {card.sessionEndHour}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            card.status === "Low"
                              ? "border-amber-300 text-amber-700"
                              : "border-emerald-300 text-emerald-700"
                          }
                        >
                          {card.status === "Low" ? "Promo opportunity" : "Healthy demand"}
                        </Badge>
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-slate-700">
                        <p>Historical Occupancy Rate: {card.occupancyRate}%</p>
                        <p>
                          Occupied / Available Court-Hours: {card.occupiedCourtHours} / {card.availableCourtHours}
                        </p>
                        <p>Potential Audience Size: {card.potentialTargetCount}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitleTooltip title="Recommended Customers" tooltip="Customers whose historical behavior best matches the selected session and campaign filters." className="text-xl" />
        </CardHeader>
        <CardContent>
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
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border bg-gradient-to-r from-background to-secondary/20 px-4 py-3 sm:flex sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {(customerPagination?.offset || 0) + 1} - {(customerPagination?.offset || 0) + (customerPagination?.returned ?? customers.length)} of {customerPagination?.totalCustomers ?? customers.length}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border bg-muted/30 px-3 py-1">
                    Showing 10 customers per page; scroll to view additional rows.
                  </span>
                </div>
              </div>
              <div className="max-h-[840px] overflow-y-auto">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="px-3 py-3 font-medium">Customer Name</th>
                        <th className="px-3 py-3 font-medium">Customer Type</th>
                        <th className="px-3 py-3 font-medium">Phone</th>
                        <th className="px-3 py-3 font-medium">Email</th>
                        <th className="px-3 py-3 font-medium">Preferred Session</th>
                        <th className="px-3 py-3 font-medium">Session Count</th>
                        <th className="px-3 py-3 font-medium">Court Count</th>
                        <th className="px-3 py-3 font-medium">Last Booking</th>
                        <th className="px-3 py-3 font-medium">Avg Spend</th>
                        <th className="px-3 py-3 font-medium">RFM Segment</th>
                        <th className="px-3 py-3 font-medium">Priority</th>
                        <th className="px-3 py-3 font-medium">Suggested Action</th>
                        <th className="px-3 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {customers.map((customer) => (
                        <tr key={customer.customerKey} className="align-top">
                          <td className="px-3 py-3 font-medium text-slate-900">
                            {customer.customerName || customer.customerKey}
                          </td>
                          <td className="px-3 py-3">{customer.customerTypeLabel}</td>
                          <td className="px-3 py-3">{customer.phone || "-"}</td>
                          <td className="px-3 py-3">{customer.email || "-"}</td>
                          <td className="px-3 py-3">{customer.preferredSession || "-"}</td>
                          <td className="px-3 py-3">{customer.selectedSessionBookingCount}</td>
                          <td className="px-3 py-3">{customer.selectedCourtBookingCount}</td>
                          <td className="px-3 py-3">{customer.lastBookingDate || "-"}</td>
                          <td className="px-3 py-3">Rp {customer.avgSpend.toLocaleString()}</td>
                          <td className="px-3 py-3">{customer.rfmSegmentName || "Not segmented"}</td>
                          <td className="px-3 py-3">
                            <div className="space-y-1">
                              <Badge variant="secondary">{customer.targetPriorityLabel}</Badge>
                              <p className="text-xs text-muted-foreground">
                                Score: {customer.targetPriorityScore}
                              </p>
                            </div>
                          </td>
                          <td className="px-3 py-3">{customer.suggestedAction}</td>
                          <td className="px-3 py-3">
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
                                variant="outline"
                                size="sm"
                                className="justify-start gap-2"
                                onClick={() =>
                                  void copyText(
                                    customer.whatsappMessage,
                                    "WhatsApp message copied to clipboard."
                                  )
                                }
                              >
                                <MessageSquare className="h-4 w-4" />
                                Copy Message
                              </Button>
                              <Button
                                size="sm"
                                className="justify-start gap-2"
                                onClick={() => openGenAi(customer, "message")}
                              >
                                <Sparkles className="h-4 w-4" />
                                Generate Message
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="justify-start gap-2"
                                onClick={() => openGenAi(customer, "campaign")}
                              >
                                <Sparkles className="h-4 w-4" />
                                Generate Campaign
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="justify-start gap-2"
                                onClick={() => openGenAi(customer, "workspace")}
                              >
                                <Sparkles className="h-4 w-4" />
                                Open in GenAI Workspace
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {customerPagination && Math.ceil((customerPagination.totalCustomers || 0) / customerPageSize) > 1 ? (
                <div className="border-t border-border bg-background/80 px-4 py-3">
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
                            const nextPage = currentCustomerPage - 1
                            setCurrentCustomerPage(nextPage)
                            void loadCustomers({
                              nextDate: date,
                              nextCourtType: courtType,
                              nextSessionName: sessionName,
                              nextCustomerType: customerType,
                              nextSegmentName: segmentName,
                              nextMinSessionBookingCount: minSessionBookingCount,
                              nextPage,
                            })
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
                              if (page === currentCustomerPage) return
                              setCurrentCustomerPage(page)
                              void loadCustomers({
                                nextDate: date,
                                nextCourtType: courtType,
                                nextSessionName: sessionName,
                                nextCustomerType: customerType,
                                nextSegmentName: segmentName,
                                nextMinSessionBookingCount: minSessionBookingCount,
                                nextPage: page,
                              })
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
                            void loadCustomers({
                              nextDate: date,
                              nextCourtType: courtType,
                              nextSessionName: sessionName,
                              nextCustomerType: customerType,
                              nextSegmentName: segmentName,
                              nextMinSessionBookingCount: minSessionBookingCount,
                              nextPage,
                            })
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


