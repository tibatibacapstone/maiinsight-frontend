"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  Clock,
  Info,
  Loader2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"

import { BusinessErrorAlert } from "@/components/business-error-alert"
import { HeatmapGrid } from "@/components/segment-visualization"
import { PageSkeleton } from "@/components/page-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardTitleTooltip } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getApiUrl } from "@/lib/api"
import {
  buildMetaComparisonInsight,
  finiteMetric,
  formatMetaNumber,
  formatMetaPercent,
  type NullableMetric,
} from "@/lib/meta-metric-formatters"
import {
  buildPeriodSearchParams,
  getBangkokCalendarDate,
  resolvePeriodDateRange,
} from "@/lib/period-filter"
import { getAuthHeaders, getStoredRole } from "@/lib/roles"
import {
  CUSTOMER_SEGMENT_COLORS,
  fetchSegmentationSummary,
  SEGMENTATION_UPDATED_EVENT,
  sortClusterProfiles,
  type ClusterProfile,
} from "@/lib/segmentation"

interface OverviewKpiData {
  occupancyRate: number
  occupancyChange: number
  totalRevenue: number
  revenueChange: number
  lowSessionLabel: string
  lowSessionCount: number
  lowSessionBasis?: "selected_period" | "previous_month" | "no_data"
  lowSessionDetail?: string
  peakSessionLabel: string
  peakSessionRevenue: number
  totalBookedSessions: number
  availableSessions: number
}

interface OccupancyTrendPoint {
  key?: string
  label: string
  bookedSessions: number
  availableSessions: number
  rate: number
}

interface DashboardStatus {
  hasTransactionData: boolean
  transactionCount: number
  transactionMonthRange: {
    min: string | null
    max: string | null
  }
  transactionAvailableMonths: string[]
  lastUpdatedAt: string | null
  lastTransactionSyncAt: string | null
  latestImport: {
    fileName: string
    updatedAt: string
    status: string
    rowCount: number
  } | null
  latestMetaSync: {
    startedAt: string
    status: string
  } | null
  latestSegmentationRun: {
    runDate: string
    status: string
  } | null
}

interface RevenueTrendPoint {
  key: string
  label: string
  revenue: number
  bookings: number
}

interface RevenueReportData {
  hasData: boolean
  bookingTypeBreakdown?: Record<string, number>
  summary: {
    totalRevenue: number
    totalBookings: number
    occupancyRate: number
    avgRevenuePerBooking: number
  }
  revenueTrend: RevenueTrendPoint[]
  insights: {
    executiveSummary: string
    occupancyInsight: string
    revenueInsight: string
    segmentationInsight: string
    recommendations: string[]
  }
}

interface PlaytimeSessionPoint {
  play_time_group?: string
  playTimeGroup?: string
  session_count?: number
  sessionCount?: number
}

interface PlaytimeCustomerSegment {
  sesiPagi?: number
  sesiSiang?: number
  sesiMalam?: number
}

interface PlaytimeData {
  totalCustomers: number
  totalSessions: number
  clusterCount?: number
  algorithm?: string
  createdAt?: string
  sessionByTime?: unknown
  customerSegments?: PlaytimeCustomerSegment[]
}

interface MetaTrendPoint {
  date: string
  reach: NullableMetric
  views: NullableMetric
  interactions: NullableMetric
  engagementRate?: NullableMetric
}

interface MetaDashboardData {
  configured: boolean
  hasData: boolean
  lastSyncedAt: string | null
  summary: {
    totalViews: NullableMetric
    totalReach: NullableMetric
    totalInteractions: NullableMetric
    totalShares: number
    engagementRate: NullableMetric
    shareRate: number
  }
  trend: MetaTrendPoint[]
}

interface StrategyPayload {
  campaignObjective: string
  targetCustomerGroup: string
  customerReasoning: string
  suggestedOffer: string
  whatsappMessage: string
  followUpPlan: string
  expectedBusinessImpact: string
  dataLimitation: string
}

interface BusinessInsightState {
  source: "ai" | "fallback"
  generatedAt: string | null
  providerLabel: string | null
  strategy: StrategyPayload
}
const formatOccupancyXAxisLabel = (
  value: string,
  activePeriod: "MTD" | "YTD" | null
) => {
  if (!value) return ""

  // YTD monthly key, for example "2024-02"
  if (activePeriod === "YTD" && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number)

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
    }).format(new Date(year, month - 1, 1))
  }

  // MTD daily key, for example "2024-02-01"
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number)

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(year, month - 1, day))
  }

  return value
}

const getDatePartsFromKey = (value?: string) => {
  if (!value) return null

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (!match) return null

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

const getLastDayOfMonth = (year: number, month: number) =>
  new Date(year, month, 0).getDate()

const shouldShowMtdTick = (value?: string) => {
  const parts = getDatePartsFromKey(value)

  if (!parts) return false

  const lastDay = getLastDayOfMonth(parts.year, parts.month)

  return (
    parts.day === 1 ||
    parts.day === 5 ||
    parts.day === 10 ||
    parts.day === 15 ||
    parts.day === 20 ||
    parts.day === 25 ||
    parts.day === lastDay
  )
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DEFAULT_MONTH_OPTION = "All Month"
const venues = [
  { value: "All Venue", label: "All Venue" },
  { value: "Mini Soccer", label: "Mini Soccer" },
  { value: "Basketball", label: "Basketball" },
]
const customerTypes = [
  { value: "all", label: "All" },
  { value: "membership", label: "Membership" },
  { value: "non_membership", label: "Non-Membership" },
  { value: "internal", label: "Internal" },
] as const
const chartColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"]
const playtimeOrder: Record<string, number> = {
  Morning: 0,
  Afternoon: 1,
  Evening: 2,
  Night: 3,
  Pagi: 0,
  Siang: 1,
  Malam: 3,
}
const playtimeLabelMap: Record<string, string> = {
  Pagi: "Morning",
  Siang: "Afternoon",
  Malam: "Night",
}
const bookingTypeLabelMap: Record<string, string> = {
  membership: "Membership",
  non_membersership: "Non-Membership",
  non_membership: "Non-Membership",
  internal: "Internal",
  blocked: "Internal",
  regular_booking: "Membership",
  member_internal_booking: "Non-Membership",
  other: "Other",
}

const bookingTypeColorMap: Record<string, string> = {
  membership: "var(--chart-1)",
  regular_booking: "var(--chart-1)",

  non_membership: "var(--chart-2)",
  non_membersership: "var(--chart-2)",
  member_internal_booking: "var(--chart-2)",

  internal: "var(--chart-3)",
  blocked: "var(--chart-3)",

  other: "var(--chart-4)",
}

const bookingTypeOrder: Record<string, number> = {
  membership: 0,
  regular_booking: 0,

  non_membership: 1,
  non_membersership: 1,
  member_internal_booking: 1,

  internal: 2,
  blocked: 2,

  other: 3,
}

const getStoredToken = () => {
  if (typeof window === "undefined") return null
  return (
    localStorage.getItem("maiinToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("maiinsight_token")
  )
}

const parseJsonArray = <T,>(value: unknown): T[] => {
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

const getRelativeTime = (value?: string | null) => {
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

const formatExactDateTime = (value?: string | null) => {
  if (!value) return "Not updated yet"
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return "Not updated yet"

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp)
}

const formatCurrency = (value: number) => `IDR ${Math.round(value).toLocaleString("id-ID")}`
const formatPercent = formatMetaPercent
const formatCompactNumber = formatMetaNumber
const addNullableMetric = (left: NullableMetric, right: NullableMetric): number | null => {
  const safeLeft = finiteMetric(left)
  const safeRight = finiteMetric(right)
  return safeLeft == null || safeRight == null ? null : safeLeft + safeRight
}

const formatMonthValue = (month: string, year: string) => {
  const monthIndex = months.indexOf(month)
  if (monthIndex < 0 || !year) return null

  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`
}

const buildYearOptions = (min?: string | null, max?: string | null, fallbackYear?: string) => {
  const minYear = min ? Number(min.slice(0, 4)) : Number(fallbackYear)
  const maxYear = max ? Number(max.slice(0, 4)) : Number(fallbackYear)
  const safeFallbackYear = Number(fallbackYear) || getBangkokCalendarDate(new Date()).year
  const startYear = Number.isFinite(minYear) && minYear > 0 ? minYear : safeFallbackYear
  const endYear = Number.isFinite(maxYear) && maxYear >= startYear ? maxYear : startYear
  const years = []

  for (let year = startYear; year <= endYear; year += 1) {
    years.push(String(year))
  }

  return years
}

const getAvailableMonthValuesForYear = (year: string, availableMonthValues: string[]) =>
  availableMonthValues.filter((value) => value.startsWith(`${year}-`))

const getDefaultMonthSelection = () => {
  const today = getBangkokCalendarDate(new Date())

  return {
    month: DEFAULT_MONTH_OPTION,
    year: String(today.year),
  }
}

const defaultStrategyPayload = (): StrategyPayload => ({
  campaignObjective: "No main campaign goal could be found in the current data.",
  targetCustomerGroup: "Target customer groups cannot be prioritized from the current data.",
  customerReasoning: "Business reasoning cannot be determined because there is not enough data yet.",
  suggestedOffer: "No promotion suggestion could be made from the current data.",
  whatsappMessage: "No message was generated from this overview.",
  followUpPlan: "No follow-up plan could be made from the current data.",
  expectedBusinessImpact: "Business impact cannot be estimated with confidence yet.",
  dataLimitation: "This insight is based on uploaded historical data only.",
})

const buildFallbackBusinessInsight = ({
  overviewKpi,
  reportData,
  topSegment,
  metaDashboard,
}: {
  overviewKpi: OverviewKpiData | null
  reportData: RevenueReportData | null
  topSegment: { name: string; percentage: number } | null
  metaDashboard: MetaDashboardData | null
}): BusinessInsightState => {
  if (!overviewKpi || !reportData) {
    return {
      source: "fallback",
      generatedAt: null,
      providerLabel: null,
      strategy: {
        campaignObjective: "Plan next-month growth around the weakest available time slot.",
        targetCustomerGroup: "Latest customer groups are not available yet.",
        customerReasoning: "Historical revenue and occupancy context is still loading.",
        suggestedOffer: "Create a small promotion or bundle for the next month.",
        whatsappMessage: "This overview doesn't generate messages. Use GenAI Workspace to draft messages.",
        followUpPlan: "Review bookings and revenue after the next campaign.",
        expectedBusinessImpact: "Promotions work best when targeting the weakest time slots for the next month.",
        dataLimitation: "This insight is based on uploaded historical data only.",
      },
    }
  }

  const focusSession = overviewKpi?.lowSessionLabel || "low-demand time slot"
  const topSegmentLabel = topSegment
    ? `${topSegment.name} (${formatPercent(topSegment.percentage)})`
    : "Latest customer groups not yet available"
  const metaContext = metaDashboard?.hasData &&
    finiteMetric(metaDashboard.summary.totalReach) != null &&
    finiteMetric(metaDashboard.summary.engagementRate) != null
    ? `Meta reached ${formatCompactNumber(metaDashboard.summary.totalReach)} with ${formatPercent(metaDashboard.summary.engagementRate)} engagement rate.`
    : "Meta data is not available yet, so we cannot compare ads reach with revenue."

  return {
    source: "fallback",
    generatedAt: null,
    providerLabel: null,
    strategy: {
      campaignObjective: `Plan June growth around ${focusSession} while keeping revenue healthy.`,
      targetCustomerGroup: `Main focus for June is ${topSegmentLabel}.`,
      customerReasoning: `${reportData.insights.occupancyInsight} ${reportData.insights.segmentationInsight}`,
      suggestedOffer: `Create a small promotion or bundle for June around ${focusSession} that appeals to the priority audience.`,
      whatsappMessage: "This overview doesn't generate messages. Use GenAI Workspace to draft messages.",
      followUpPlan: `${metaContext} Then review if the June promotions improved bookings and revenue.`,
      expectedBusinessImpact: `${reportData.insights.revenueInsight} Promotions work best when targeting the weakest time slots for the next month.`,
      dataLimitation: "This insight comes from uploaded historical data and doesn't show real-time availability.",
    },
  }
}

const buildPlaytimeChart = (playtimeData: PlaytimeData | null) => {
  const directRows = parseJsonArray<PlaytimeSessionPoint>(playtimeData?.sessionByTime)

  if (directRows.length > 0) {
    return directRows
      .map((row, index) => {
        const rawName = row.play_time_group || row.playTimeGroup || ""
        if (!rawName) return null

        return {
          name: playtimeLabelMap[rawName] || rawName,
          rawName,
          value: Number(row.session_count ?? row.sessionCount ?? 0),
          color: chartColors[index % chartColors.length],
        }
      })
      .filter((item): item is { name: string; rawName: string; value: number; color: string } => Boolean(item))
      .sort((left, right) => (playtimeOrder[left.rawName] ?? 99) - (playtimeOrder[right.rawName] ?? 99))
  }

  if (!Array.isArray(playtimeData?.customerSegments) || playtimeData.customerSegments.length === 0) {
    return []
  }

  const derived = playtimeData.customerSegments.reduce(
    (accumulator, row) => {
      accumulator.Morning += Number(row.sesiPagi || 0)
      accumulator.Afternoon += Number(row.sesiSiang || 0)
      accumulator.Night += Number(row.sesiMalam || 0)
      return accumulator
    },
    { Morning: 0, Afternoon: 0, Night: 0 }
  )

  return [
    { name: "Morning", rawName: "Morning", value: derived.Morning, color: chartColors[0] },
    { name: "Afternoon", rawName: "Afternoon", value: derived.Afternoon, color: chartColors[1] },
    { name: "Night", rawName: "Night", value: derived.Night, color: chartColors[2] },
  ].filter((item) => item.value > 0)
}

const pieLabelRenderer = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx?: number
  cy?: number
  midAngle?: number
  innerRadius?: number
  outerRadius?: number
  percent?: number
}) => {
  if (
    percent === undefined ||
    percent < 0.06 ||
    cx === undefined ||
    cy === undefined ||
    midAngle === undefined ||
    innerRadius === undefined ||
    outerRadius === undefined
  ) {
    return null
  }

  const radius = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180)
  const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180)

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${Math.round(percent * 100)}%`}
    </text>
  )
}

function InfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
          aria-label="More information"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} className="max-w-xs text-left leading-relaxed">
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

function TitleWithTooltip({ title, tooltip }: { title: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-2">
      <span>{title}</span>
      <InfoTooltip content={tooltip} />
    </div>
  )
}

export function AnalyticsDashboard() {

  const defaultSelection = getDefaultMonthSelection()
  const [selectedMonth, setSelectedMonth] = useState(defaultSelection.month)
  const [selectedYear, setSelectedYear] = useState(defaultSelection.year)
  const [selectedVenue, setSelectedVenue] = useState("All Venue")
  const [selectedCustomerType, setSelectedCustomerType] = useState("all")
  const [periodType, setPeriodType] = useState<"MTD" | "YTD" | null>("MTD")
  const [status, setStatus] = useState<DashboardStatus | null>(null)
  const [overviewKpi, setOverviewKpi] = useState<OverviewKpiData | null>(null)
  const [occupancyTrend, setOccupancyTrend] = useState<OccupancyTrendPoint[]>([])
  const [reportData, setReportData] = useState<RevenueReportData | null>(null)
  const [segmentation, setSegmentation] = useState<ClusterProfile[]>([])
  const [playtimeData, setPlaytimeData] = useState<PlaytimeData | null>(null)
  const [metaDashboard, setMetaDashboard] = useState<MetaDashboardData | null>(null)
  const [businessInsight, setBusinessInsight] = useState<BusinessInsightState | null>(null)
  const [isLoadingBusinessInsight, setIsLoadingBusinessInsight] = useState(false)
  const [isBusinessInsightVisible, setIsBusinessInsightVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentRole = getStoredRole()
  const canGenerateBusinessInsight = currentRole === "operational" || currentRole === "it_support"
  const availableMonthValues = useMemo(() => status?.transactionAvailableMonths || [], [status?.transactionAvailableMonths])
  const businessInsightCacheRef = useRef<Map<string, BusinessInsightState>>(new Map())
  const dashboardCacheRef = useRef<Map<string, { timestamp: number; payload: { statusData: DashboardStatus; overviewKpi: OverviewKpiData | null; occupancyTrend: OccupancyTrendPoint[]; reportData: RevenueReportData | null; playtimeData: PlaytimeData | null; segmentation: ClusterProfile[]; metaDashboard: MetaDashboardData | null } }>>(new Map())
  const lastRefreshAtRef = useRef(0)

  const yearOptions = useMemo(() => {
    const startYear = 2023
    const endYear = getBangkokCalendarDate(new Date()).year
    return Array.from({ length: Math.max(endYear - startYear + 1, 1) }, (_, index) => {
      const year = String(startYear + index)
      return {
        value: year,
        disabled: false,
      }
    })
  }, [])

  const monthOptions = useMemo(() => {
    const monthsForYear = availableMonthValues.filter((value) => value.startsWith(`${selectedYear}-`))
    return months.map((month) => ({
      value: month,
      disabled: !monthsForYear.includes(formatMonthValue(month, selectedYear) || ""),
    }))
  }, [availableMonthValues, selectedYear])

  const loadDashboard = useCallback(async (options?: { background?: boolean }) => {
    try {
      const isBackgroundLoad = Boolean(options?.background)
      if (!isBackgroundLoad) {
        setIsLoading(true)
      }
      setError(null)
      const token = getStoredToken()
      if (!token) {
        throw new Error("Please sign in again to load the Overview dashboard.")
      }

      const statusResponse = await fetch(getApiUrl("/operations/status"), { headers: getAuthHeaders(), cache: "no-store" })
      const statusInfoResult = await statusResponse.json().catch(() => null)

      if (!statusResponse.ok || !statusInfoResult?.success || !statusInfoResult.data) {
        throw new Error(statusInfoResult?.message || "Overview status could not be loaded.")
      }

      const statusData = statusInfoResult.data as DashboardStatus
      const effectiveSelection = {
        month: selectedMonth,
        year: selectedYear,
      }

      const canonicalPeriod = {
        month:
          effectiveSelection.month === DEFAULT_MONTH_OPTION
            ? null
            : months.indexOf(effectiveSelection.month) + 1,
        year: Number(effectiveSelection.year),
        periodType: periodType || "MTD",
      } as const
      const { startDate: startDateIso, endDate: endDateIso } =
        resolvePeriodDateRange(canonicalPeriod)
      const overviewParams = buildPeriodSearchParams(canonicalPeriod, {
        venue: selectedVenue,
        customerType: selectedCustomerType,
      })
      const occupancyParams = new URLSearchParams(overviewParams.toString())

if ((periodType || "MTD") === "MTD") {
  occupancyParams.set("bucket", "daily")
}
      const reportParams = new URLSearchParams({
        startDate: startDateIso,
        endDate: endDateIso,
        courtType:
          selectedVenue === "Mini Soccer"
            ? "mini_soccer"
            : selectedVenue === "Basketball"
              ? "basketball"
              : "all",
        customerType: selectedCustomerType,
        bookingType: "all",
      })
      const metaParams = new URLSearchParams({
        since: startDateIso,
        until: endDateIso,
      })
      const cacheKey = JSON.stringify({
        month: effectiveSelection.month,
        year: effectiveSelection.year,
        periodType: periodType || "MTD",
        venue: selectedVenue,
        customerType: selectedCustomerType,
        reportParams: reportParams.toString(),
        metaParams: metaParams.toString(),
      })

      const cached = dashboardCacheRef.current.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < 2 * 60 * 1000) {
        const payload = cached.payload
        setStatus(payload.statusData)
        setOverviewKpi(payload.overviewKpi)
        setOccupancyTrend(payload.occupancyTrend)
        setReportData(payload.reportData)
        setPlaytimeData(payload.playtimeData)
        setSegmentation(payload.segmentation)
        setMetaDashboard(payload.metaDashboard)
        if (!isBackgroundLoad) {
          setIsLoading(false)
        }
        return
      }

      const statusTask = fetch(getApiUrl("/operations/status"), { headers: getAuthHeaders(), cache: "no-store" })
      const [kpiResponse, occupancyResponse, reportResponse] = await Promise.all([
        fetch(getApiUrl(`/dashboard/overview-kpis?${overviewParams.toString()}`), { headers: getAuthHeaders(), cache: "no-store" }),
        fetch(
  getApiUrl(
    `/dashboard/occupancy-trend?${occupancyParams.toString()}`
  ),
  {
    headers: getAuthHeaders(),
    cache: "no-store",
  }
),
        fetch(getApiUrl(`/operations/management-report?${reportParams.toString()}`), { headers: getAuthHeaders(), cache: "no-store" }),
      ])

      const [statusKpiResponse, kpiResult, occupancyResult, reportResult] = await Promise.all([
        statusTask,
        kpiResponse.json().catch(() => null),
        occupancyResponse.json().catch(() => null),
        reportResponse.json().catch(() => null),
      ])

      if (!statusKpiResponse.ok) {
        throw new Error("Overview status could not be loaded.")
      }

      const statusResult = await statusKpiResponse.json().catch(() => null)
      if (!statusResult?.success || !statusResult.data) {
        throw new Error(statusResult?.message || "Overview status could not be loaded.")
      }

      const nextStatusData = statusResult.data as DashboardStatus
      const nextOverviewKpi = kpiResult?.success ? kpiResult.data : null
      const nextOccupancyTrend = occupancyResult?.success && Array.isArray(occupancyResult.data) ? occupancyResult.data : []
      const nextReportData = reportResult?.success ? reportResult.data : null

      setStatus(nextStatusData)
      setOverviewKpi(nextOverviewKpi)
      setOccupancyTrend(nextOccupancyTrend)
      setReportData(nextReportData)

      const nonCriticalTasks = await Promise.allSettled([
        fetch(getApiUrl(`/dashboard/playtime-mix?${overviewParams.toString()}`), { headers: getAuthHeaders(), cache: "no-store" }),
        fetchSegmentationSummary(),
        fetch(getApiUrl(`/meta/dashboard?${metaParams.toString()}`), { headers: getAuthHeaders(), cache: "no-store" }),
      ])

      const playtimeResponse = nonCriticalTasks[0].status === "fulfilled" ? nonCriticalTasks[0].value : null
      const segmentationData = nonCriticalTasks[1].status === "fulfilled" ? nonCriticalTasks[1].value : null
      const metaResponse = nonCriticalTasks[2].status === "fulfilled" ? nonCriticalTasks[2].value : null

      const playtimeResult = playtimeResponse ? await playtimeResponse.json().catch(() => null) : null
      const metaResult = metaResponse?.ok
        ? await metaResponse.json().catch(() => null).then((result) => (result?.success ? result.data as MetaDashboardData : null))
        : null

      const nextPlaytimeData = playtimeResult?.success ? playtimeResult.data : null
      const nextSegmentation =
        selectedCustomerType === "internal" || !segmentationData
          ? []
          : sortClusterProfiles(segmentationData.clusters || [])

      setPlaytimeData(nextPlaytimeData)
      setSegmentation(nextSegmentation)
      setMetaDashboard(metaResult)

      dashboardCacheRef.current.set(cacheKey, {
        timestamp: Date.now(),
        payload: {
          statusData: nextStatusData,
          overviewKpi: nextOverviewKpi,
          occupancyTrend: nextOccupancyTrend,
          reportData: nextReportData,
          playtimeData: nextPlaytimeData,
          segmentation: nextSegmentation,
          metaDashboard: metaResult,
        },
      })
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Overview data could not be loaded.")
      setStatus(null)
      setOverviewKpi(null)
      setOccupancyTrend([])
      setReportData(null)
      setPlaytimeData(null)
      setSegmentation([])
      setMetaDashboard(null)
    } finally {
      lastRefreshAtRef.current = Date.now()
      if (!options?.background) {
        setIsLoading(false)
      }
    }
  }, [periodType, selectedCustomerType, selectedMonth, selectedVenue, selectedYear])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    const refresh = () => {
      if (Date.now() - lastRefreshAtRef.current < 15000) return
      void loadDashboard({ background: true })
    }
    window.addEventListener(SEGMENTATION_UPDATED_EVENT, refresh)
    window.addEventListener("maiin-data-sync-updated", refresh)
    window.addEventListener("focus", refresh)
    return () => {
      window.removeEventListener(SEGMENTATION_UPDATED_EVENT, refresh)
      window.removeEventListener("maiin-data-sync-updated", refresh)
      window.removeEventListener("focus", refresh)
    }
  }, [loadDashboard])

  const playtimeChart = useMemo(() => buildPlaytimeChart(playtimeData), [playtimeData])

  const playtimeChartTotal = useMemo(
    () => playtimeChart.reduce((sum, item) => sum + item.value, 0),
    [playtimeChart]
  )

  const playtimeLegend = useMemo(
    () => playtimeChart.map((item) => ({
      ...item,
      percentage: playtimeChartTotal > 0 ? (item.value / playtimeChartTotal) * 100 : 0,
    })),
    [playtimeChart, playtimeChartTotal]
  )

  const dominantPlaytime = useMemo(
    () =>
      playtimeLegend.reduce<typeof playtimeLegend[number] | null>(
        (selected, item) => (!selected || item.value > selected.value ? item : selected),
        null
      ),
    [playtimeLegend]
  )

  const playtimeBehaviorInsight = useMemo(() => {
    if (!dominantPlaytime || !playtimeData) {
      return "No historical play-time preference insight is available yet."
    }

    return `Most bookings are in the ${dominantPlaytime.name} slot with ${formatPercent(dominantPlaytime.percentage)} of all bookings.`
  }, [dominantPlaytime, playtimeData])

  const segmentChart = useMemo(
    () =>
      segmentation.map((item, index) => ({
        name: item.segmentName,
        value: item.customerCount,
        color: CUSTOMER_SEGMENT_COLORS[item.segmentName] || chartColors[index % chartColors.length],
      })),
    [segmentation]
  )

  const segmentChartTotal = useMemo(
    () => segmentChart.reduce((sum, item) => sum + Number(item.value || 0), 0),
    [segmentChart]
  )

  const segmentLegend = useMemo(
    () =>
      segmentChart.map((item) => ({
        ...item,
        percentage: segmentChartTotal > 0 ? (item.value / segmentChartTotal) * 100 : 0,
      })),
    [segmentChart, segmentChartTotal]
  )

  const topSegment = segmentLegend[0] || null

 const bookingTypeMixChart = useMemo(() => {
  const breakdown = reportData?.bookingTypeBreakdown || {}

  return Object.entries(breakdown)
    .map(([key, value]) => ({
      key,
      name: bookingTypeLabelMap[key] || key,
      value: Number(value || 0),
      color: bookingTypeColorMap[key] || "var(--chart-4)",
      order: bookingTypeOrder[key] ?? 99,
    }))
    .filter((item) => item.value > 0)
    .sort((left, right) => left.order - right.order)
}, [reportData?.bookingTypeBreakdown])

  const bookingTypeMixTotal = useMemo(
    () => bookingTypeMixChart.reduce((sum, item) => sum + item.value, 0),
    [bookingTypeMixChart]
  )

  const bookingTypeMixLegend = useMemo(
    () => bookingTypeMixChart.map((item) => ({
      ...item,
      percentage: bookingTypeMixTotal > 0 ? (item.value / bookingTypeMixTotal) * 100 : 0,
    })),
    [bookingTypeMixChart, bookingTypeMixTotal]
  )

  const revenueTrendHasData = Boolean(reportData?.revenueTrend?.length)
  const revenueTrendSubtitle = revenueTrendHasData
    ? reportData?.insights.revenueInsight || "Revenue from bookings in the selected period, grouped by play date."
    : "The current Month to Date period has no available transactions."

  const revenueMetaComparisonData = useMemo(() => {
    if (!reportData?.revenueTrend?.length) return []

    type ComparisonMetaPoint = {
      reach: number | null
      views: number | null
      interactions: number | null
      engagementRate: number | null
    }
    const metaDailyMap = new Map<string, ComparisonMetaPoint>()
    const metaMonthlyMap = new Map<string, ComparisonMetaPoint>()

    metaDashboard?.trend?.forEach((item) => {
      const dailyKey = item.date
      const monthlyKey = item.date.slice(0, 7)
      const daily = metaDailyMap.get(dailyKey)
      const dailyEngagementRate = finiteMetric(item.engagementRate)
      const nextDaily: ComparisonMetaPoint = daily
        ? {
            reach: addNullableMetric(daily.reach, item.reach),
            views: addNullableMetric(daily.views, item.views),
            interactions: addNullableMetric(daily.interactions, item.interactions),
            engagementRate: dailyEngagementRate,
          }
        : {
            reach: finiteMetric(item.reach),
            views: finiteMetric(item.views),
            interactions: finiteMetric(item.interactions),
            engagementRate: dailyEngagementRate,
          }
      metaDailyMap.set(dailyKey, nextDaily)

      const monthly = metaMonthlyMap.get(monthlyKey)
      metaMonthlyMap.set(monthlyKey, monthly
        ? {
            reach: addNullableMetric(monthly.reach, item.reach),
            views: addNullableMetric(monthly.views, item.views),
            interactions: addNullableMetric(monthly.interactions, item.interactions),
            engagementRate: dailyEngagementRate,
          }
        : {
            reach: finiteMetric(item.reach),
            views: finiteMetric(item.views),
            interactions: finiteMetric(item.interactions),
            engagementRate: dailyEngagementRate,
          })
    })

    return reportData.revenueTrend.map((point) => {
      const metaPoint = point.key.length === 7
        ? metaMonthlyMap.get(point.key)
        : metaDailyMap.get(point.key)

      const reach = finiteMetric(metaPoint?.reach)
      const interactions = finiteMetric(metaPoint?.interactions)
      const engagementRate = finiteMetric(metaPoint?.engagementRate)

      return {
        label: point.label,
        revenue: Number(point.revenue || 0),
        reach,
        views: finiteMetric(metaPoint?.views),
        engagementRate: engagementRate != null
          ? engagementRate
          : reach != null && interactions != null && reach > 0
            ? Number(((interactions / reach) * 100).toFixed(2))
            : null,
      }
    })
  }, [metaDashboard?.trend, reportData])

  const metaComparisonInsight = useMemo(
    () => buildMetaComparisonInsight({
      reportAvailable: Boolean(reportData),
      configured: Boolean(metaDashboard?.configured),
      hasData: Boolean(metaDashboard?.hasData),
      revenue: reportData?.summary.totalRevenue,
      reach: metaDashboard?.summary.totalReach,
      engagementRate: metaDashboard?.summary.engagementRate,
    }),
    [metaDashboard, reportData]
  )

  const businessInsightRequest = useMemo(() => {
    if (!overviewKpi || !reportData) return null

    const currentMonthIndex = months.indexOf(selectedMonth)
    const planningMonthDate = new Date(Number(selectedYear), (currentMonthIndex >= 0 ? currentMonthIndex : new Date().getMonth()) + 1, 1)
    const planningMonthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(planningMonthDate)
    const dominantPlaytimeLabel = dominantPlaytime?.name || playtimeLegend[0]?.name || null
    const dominantPlaytimeSharePct = dominantPlaytime ? Number(dominantPlaytime.percentage.toFixed(1)) : null
    const dominantBookingType = bookingTypeMixLegend[0] || null
    const bookingTypeMixSummary = bookingTypeMixLegend.map((item) => ({
      name: item.name,
      sharePct: Number(item.percentage.toFixed(1)),
    }))

    return {
      languagePreference: "English",
      selected_filters: {
        mode: "overview_summary",
        month: selectedMonth,
        year: selectedYear,
        periodType: periodType || "MTD",
        venue: selectedVenue,
        customerType: selectedCustomerType,
      },
      customer_segment_summary: {
        topSegment: topSegment?.name || "Not available",
        topSegmentSharePct: topSegment ? Number(topSegment.percentage.toFixed(1)) : null,
        totalSegmentedCustomers: segmentChartTotal,
      },
      planning_context: {
        targetMonth: planningMonthLabel,
        isForwardLooking: true,
      },
      audience_context: {
        bestAudienceHint: topSegment
          ? `${topSegment.name} customers with ${dominantPlaytimeLabel || "the current strongest play-time slot"} preference`
          : `Customers who already book in ${dominantPlaytimeLabel || "the current strongest play-time slot"}`,
        dominantPlaytime: dominantPlaytimeLabel,
        dominantPlaytimeSharePct,
        dominantBookingType: dominantBookingType?.name || null,
        dominantBookingTypeSharePct: dominantBookingType ? Number(dominantBookingType.percentage.toFixed(1)) : null,
      },
      transaction_signal_context: {
        playtimeBehaviorInsight,
        bookingTypeMixSummary,
        lowDemandSessionLabel: overviewKpi.lowSessionLabel,
        lowDemandSessionDetail: overviewKpi.lowSessionDetail || "No additional detail available.",
        bookingCount: reportData.summary.totalBookings,
        revenuePerBooking: reportData.summary.avgRevenuePerBooking,
      },
      business_context: {
        revenueByPlayDate: reportData.summary.totalRevenue,
        totalBookings: reportData.summary.totalBookings,
        occupancyRate: overviewKpi.occupancyRate,
        occupancyChange: overviewKpi.occupancyChange,
        averageRevenuePerBooking: reportData.summary.avgRevenuePerBooking,
        lowestDemandSession: overviewKpi.lowSessionLabel,
        lowestDemandSessionDetail: overviewKpi.lowSessionDetail || "No additional detail available.",
        revenueInsight: reportData.insights.revenueInsight,
        occupancyInsight: reportData.insights.occupancyInsight,
      },
      promotion_context: {
        metaReach: metaDashboard?.summary.totalReach ?? null,
        metaViews: metaDashboard?.summary.totalViews ?? null,
        metaEngagementRate: metaDashboard?.summary.engagementRate ?? null,
        metaInsight: metaComparisonInsight,
        historicalOnly: true,
        revenueDefinition: "Revenue is based on the facility play date.",
      },
    }
  }, [bookingTypeMixLegend, dominantPlaytime, metaComparisonInsight, metaDashboard?.summary.engagementRate, metaDashboard?.summary.totalReach, metaDashboard?.summary.totalViews, overviewKpi, periodType, playtimeBehaviorInsight, playtimeLegend, reportData, segmentChartTotal, selectedCustomerType, selectedMonth, selectedVenue, selectedYear, topSegment])

  const businessInsightKey = useMemo(
    () => (businessInsightRequest ? JSON.stringify(businessInsightRequest) : null),
    [businessInsightRequest]
  )

  const fallbackInsight = useMemo(
    () =>
      buildFallbackBusinessInsight({
        overviewKpi,
        reportData,
        topSegment,
        metaDashboard,
      }),
    [metaDashboard, overviewKpi, reportData, topSegment]
  )

  const handleGenerateBusinessInsight = useCallback(async () => {
    if (!overviewKpi || !reportData || !businessInsightKey || !businessInsightRequest) {
      return
    }

    const cached = businessInsightCacheRef.current.get(businessInsightKey)
    if (cached?.source === "ai") {
      setBusinessInsight(cached)
      return
    }

    if (!canGenerateBusinessInsight) {
      businessInsightCacheRef.current.set(businessInsightKey, fallbackInsight)
      setBusinessInsight(fallbackInsight)
      return
    }

    setIsLoadingBusinessInsight(true)

    try {
      const response = await fetch(getApiUrl("/ai-strategy/generate"), {
        method: "POST",
        cache: "no-store",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(businessInsightRequest),
      })

      const result = await response.json().catch(() => null)
      const strategy = result?.data?.strategy || result?.strategy

      if (!response.ok || !result?.success || !strategy) {
        throw new Error(result?.message || "AI strategy could not be generated.")
      }

      const aiInsight: BusinessInsightState = {
        source: "ai",
        generatedAt: result?.data?.generatedAt || result?.generatedAt || new Date().toISOString(),
        providerLabel: "Gemini",
        strategy: {
          ...defaultStrategyPayload(),
          ...strategy,
        },
      }

      businessInsightCacheRef.current.set(businessInsightKey, aiInsight)
      setBusinessInsight(aiInsight)
    } catch {
      businessInsightCacheRef.current.set(businessInsightKey, fallbackInsight)
      setBusinessInsight(fallbackInsight)
    } finally {
      setIsLoadingBusinessInsight(false)
    }
  }, [businessInsightKey, businessInsightRequest, canGenerateBusinessInsight, fallbackInsight, overviewKpi, reportData])

  useEffect(() => {
    if (!overviewKpi || !reportData || !businessInsightKey) {
      setBusinessInsight(null)
      return
    }

    const cached = businessInsightCacheRef.current.get(businessInsightKey)
    if (cached) {
      setBusinessInsight(cached)
      return
    }

    businessInsightCacheRef.current.set(businessInsightKey, fallbackInsight)
    setBusinessInsight(fallbackInsight)
  }, [businessInsightKey, fallbackInsight, overviewKpi, reportData])

  const lowSessionBadge = overviewKpi?.lowSessionBasis === "previous_month"
    ? "Predicted from previous month"
    : overviewKpi?.lowSessionBasis === "selected_period"
      ? "Selected period pattern"
      : "No session pattern"

   const formattedOccupancyTrend = useMemo(
  () =>
    occupancyTrend.map((point) => ({
      ...point,
      chartKey: point.key ?? point.label,
      displayLabel: formatOccupancyXAxisLabel(
        point.key ?? point.label,
        periodType
      ),
    })),
  [occupancyTrend, periodType]
)

const formatTrendXAxisTick = (
  value: string,
  activePeriod: "MTD" | "YTD" | null
) => {
  if (!value) return ""

  if (
    activePeriod === "YTD" &&
    /^\d{4}-\d{2}$/.test(value)
  ) {
    const [, monthText] = value.split("-")
    const month = Number(monthText)

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
    }).format(new Date(2024, month - 1, 1))
  }

  const parts = getDatePartsFromKey(value)

  if (parts) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(
      new Date(parts.year, parts.month - 1, parts.day)
    )
  }

  return value
}

const occupancyXAxisTicks = useMemo(() => {
  if ((periodType || "MTD") !== "MTD") {
    return undefined
  }

  return formattedOccupancyTrend
    .filter((point) =>
      shouldShowMtdTick(point.chartKey)
    )
    .map((point) => point.chartKey)
}, [formattedOccupancyTrend, periodType])

const revenueXAxisTicks = useMemo(() => {
  if ((periodType || "MTD") !== "MTD") {
    return undefined
  }

  return (reportData?.revenueTrend || [])
    .filter((point) =>
      shouldShowMtdTick(point.key)
    )
    .map((point) => point.key)
}, [periodType, reportData?.revenueTrend])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold">Overview</h1>
            <p className="text-muted-foreground">Business results, bookings, customer groups, and AI insights from your uploaded data.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 sm:max-w-[48%]">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-sm text-amber-700">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="font-medium">Historical Data</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Last updated: {formatExactDateTime(status?.lastTransactionSyncAt)}
              {status?.lastTransactionSyncAt ? ` (${getRelativeTime(status.lastTransactionSyncAt)})` : ""}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Dashboard filters</p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Select
                value={selectedMonth}
                onValueChange={setSelectedMonth}
                disabled={!status?.hasTransactionData && !isLoading}
              >
                <SelectTrigger className="h-11 w-[160px] rounded-xl border border-border/70 bg-background/90 px-3 shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:ring-2 focus:ring-primary/15">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Month
                    </span>
                    <SelectValue placeholder="Month" />
                  </div>
                </SelectTrigger>
                <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg">
                  <SelectItem value={DEFAULT_MONTH_OPTION}>
                    {DEFAULT_MONTH_OPTION}
                  </SelectItem>
                  {months.map((month) => {
                    const option = monthOptions.find((item) => item.value === month)
                    return (
                      <SelectItem key={month} value={month} disabled={option?.disabled}>
                        {month}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <Select
                value={selectedYear}
                onValueChange={setSelectedYear}
                disabled={!status?.hasTransactionData && !isLoading}
              >
                <SelectTrigger className="h-11 w-[130px] rounded-xl border border-border/70 bg-background/90 px-3 shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:ring-2 focus:ring-primary/15">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Year
                    </span>
                    <SelectValue placeholder="Year" />
                  </div>
                </SelectTrigger>
                <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg">
                  {yearOptions.map((year) => (
                    <SelectItem key={year.value} value={year.value} disabled={year.disabled}>
                      {year.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedVenue}
                onValueChange={setSelectedVenue}
              >
                <SelectTrigger className="h-11 w-[160px] rounded-xl border border-border/70 bg-background/90 px-3 shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:ring-2 focus:ring-primary/15">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Venue
                    </span>
                    <SelectValue placeholder="Venue" />
                  </div>
                </SelectTrigger>
                <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg">
                  {venues.map((venue) => (
                    <SelectItem key={venue.value} value={venue.value}>
                      {venue.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedCustomerType}
                onValueChange={setSelectedCustomerType}
              >
                <SelectTrigger className="h-11 w-[180px] rounded-xl border border-border/70 bg-background/90 px-3 shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:ring-2 focus:ring-primary/15">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Customer
                    </span>
                    <SelectValue placeholder="Customer" />
                  </div>
                </SelectTrigger>
                <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg">
                  {customerTypes.map((customerType) => (
                    <SelectItem key={customerType.value} value={customerType.value}>
                      {customerType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="inline-flex h-11 items-center rounded-xl border border-border/70 bg-background/80 p-1 shadow-sm">
                {(["MTD", "YTD"] as const).map((type) => (
                  <Button
                    key={type}
                    variant={periodType === type ? "secondary" : "ghost"}
                    className={`h-8 rounded-lg border px-3 text-[11px] transition ${periodType === type
                      ? type === "MTD"
                        ? "border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200"
                        : "border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      : "border-transparent text-muted-foreground hover:bg-accent/80 hover:text-foreground"}`}
                    onClick={() => setPeriodType((current) => (current === type ? null : type))}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <PageSkeleton cards={4} lines={2} />
      ) : error ? (
        <BusinessErrorAlert
          title="Overview Unavailable"
          message="The dashboard could not be loaded."
          suggestion="Please try again or contact IT Support if the issue continues."
          technicalDetails={error}
          showTechnicalDetails={currentRole === "it_support"}
        />
      ) : null}{!isLoading && status && !status.hasTransactionData ? (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-600" />
            <div>
              <p className="font-medium">No transaction data available yet.</p>
              <p className="text-sm text-muted-foreground">
                Upload a transaction file from Data Center to populate this dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-background to-amber-50 shadow-sm">
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span>Business Insight</span>
                  </CardTitle>
                  <CardDescription>
                    {businessInsight?.source === "ai"
                      ? "AI summary from revenue, bookings, ads reach, and customer groups."
                      : "Summary from your business metrics."}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isLoadingBusinessInsight ? (
                    <Badge variant="outline" className="gap-2 border-primary/20 text-primary">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Generating summary
                    </Badge>
                  ) : null}
                  <Badge variant="outline" className="border-primary/20 text-primary">
                    {businessInsight?.source === "ai" ? `${businessInsight.providerLabel || "AI"} summary` : "Historical summary"}
                  </Badge>
                  {businessInsight?.source === "ai" ? (
                    <Badge variant="secondary">
                      {businessInsight?.generatedAt ? `Updated ${getRelativeTime(businessInsight.generatedAt)}` : "Generated"}
                    </Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="gap-2"
                      onClick={() => void handleGenerateBusinessInsight()}
                      disabled={isLoadingBusinessInsight || !canGenerateBusinessInsight}
                    >
                      {isLoadingBusinessInsight ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Generate
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => setIsBusinessInsightVisible((current) => !current)}
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${isBusinessInsightVisible ? "rotate-0" : "-rotate-90"}`} />
                    {isBusinessInsightVisible ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className={isBusinessInsightVisible ? "space-y-4" : "hidden"}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Focus Now</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-900">
                    {businessInsight?.strategy.campaignObjective || defaultStrategyPayload().campaignObjective}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Best Audience</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-900">
                    {businessInsight?.strategy.targetCustomerGroup || defaultStrategyPayload().targetCustomerGroup}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Why This Matters</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-900">
                    {businessInsight?.strategy.customerReasoning || defaultStrategyPayload().customerReasoning}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Suggested Move</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-900">
                    {businessInsight?.strategy.suggestedOffer || defaultStrategyPayload().suggestedOffer}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Expected Business Impact</p>
                  <p className="mt-2 text-sm leading-6 text-slate-800">
                    {businessInsight?.strategy.expectedBusinessImpact || defaultStrategyPayload().expectedBusinessImpact}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Data Limitation</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {businessInsight?.strategy.dataLimitation || defaultStrategyPayload().dataLimitation}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitleTooltip
                    title="Occupancy Rate"
                    tooltip="Percentage of court hours booked out of total available hours in the selected period."
                    className="text-sm font-medium text-muted-foreground"
                  />
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold">{overviewKpi ? `${overviewKpi.occupancyRate}%` : "-"}</p>
                    <p className={`mt-2 flex items-center gap-1 text-xs ${overviewKpi && overviewKpi.occupancyChange < 0 ? "text-destructive" : "text-primary"}`}>
                      {overviewKpi && overviewKpi.occupancyChange < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                      {overviewKpi ? `${overviewKpi.occupancyChange >= 0 ? "+" : ""}${overviewKpi.occupancyChange}% vs previous period` : "No comparison available"}
                    </p>
                  </div>
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitleTooltip
                    title="Revenue by Play Date"
                    tooltip="Total booking revenue from transactions in the selected period."
                    className="text-sm font-medium text-muted-foreground"
                  />
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold">{formatCurrency(reportData?.summary.totalRevenue ?? overviewKpi?.totalRevenue ?? 0)}</p>
                    <p className={`mt-2 flex items-center gap-1 text-xs ${overviewKpi && overviewKpi.revenueChange < 0 ? "text-destructive" : "text-primary"}`}>
                      {overviewKpi && overviewKpi.revenueChange < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                      {overviewKpi ? `${overviewKpi.revenueChange >= 0 ? "+" : ""}${overviewKpi.revenueChange}% vs previous period` : "No comparison available"}
                    </p>
                  </div>
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitleTooltip
                      title="Lowest-Demand Session"
                      tooltip="The time slot with the fewest bookings — a candidate for promotional pricing."
                      className="text-sm font-medium text-muted-foreground"
                    />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xl font-bold">{overviewKpi?.lowSessionLabel || "No data"}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {overviewKpi?.lowSessionLabel && overviewKpi?.lowSessionLabel !== "-"
                        ? "Lowest booking volume among all sessions"
                        : "Session data will be available after transactions are imported."}
                    </p>
                  </div>
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitleTooltip
                    title="Peak Session Revenue"
                    tooltip="The time slot generating the highest total revenue — your most valuable session."
                    className="text-sm font-medium text-muted-foreground"
                  />
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xl font-bold">{overviewKpi?.peakSessionLabel || "-"}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {(overviewKpi?.peakSessionRevenue || 0) > 0
                        ? formatCurrency(overviewKpi?.peakSessionRevenue || 0)
                        : "No revenue data available"}
                    </p>
                  </div>
                  <Zap className="h-5 w-5 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle><TitleWithTooltip title="Occupancy Trend" tooltip="Shows how many court hours were booked during the selected period." /></CardTitle>
                <CardDescription>
                  {reportData?.insights.occupancyInsight || "Court hours booked in this period."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={formattedOccupancyTrend}
                      margin={{
                        top: 8,
                        right: 28,
                        bottom: 4,
                        left: 4,
                      }}
                    >
                      <defs>
                        <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="chartKey"
                        ticks={occupancyXAxisTicks}
                        tickFormatter={(value: string) =>
                          formatTrendXAxisTick(value, periodType)
                        }
                        stroke="var(--muted-foreground)"
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        tickMargin={10}
                        fontSize={12}
                        padding={{
                          left: 8,
                          right: 12,
                        }}
                      />
                      <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} unit="%" />
                      <RechartsTooltip formatter={(value: number, name: string, props: { payload?: OccupancyTrendPoint }) => name === "rate" ? [`${value}%`, `${props.payload?.bookedSessions || 0}/${props.payload?.availableSessions || 0} booked sessions`] : [value, name]} />
                      {occupancyTrend.length > 0 ? (
                        <ReferenceLine
                          y={occupancyTrend.length > 0 ? (occupancyTrend.reduce((sum, point) => sum + point.bookedSessions, 0) / occupancyTrend.reduce((sum, point) => sum + point.availableSessions, 0)) * 100 : 0}
                          stroke="var(--muted-foreground)"
                          strokeDasharray="6 6"
                          strokeWidth={1.5}
                        />
                      ) : null}
                      <Area type="monotone" dataKey="rate" stroke="var(--chart-1)" fill="url(#occupancyGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {occupancyTrend.length > 0 ? (
                  <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-block w-10 border-t-2 border-dashed border-muted-foreground" />
                    <span>Dashed line = selected period average occupancy ({formatPercent((occupancyTrend.reduce((sum, point) => sum + point.bookedSessions, 0) / occupancyTrend.reduce((sum, point) => sum + point.availableSessions, 0)) * 100)}).</span>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle><TitleWithTooltip title="Revenue by Play Date Trend" tooltip="Shows booking revenue grouped by play date, using the same filters as the overview card." /></CardTitle>
                <CardDescription>{revenueTrendSubtitle}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  {revenueTrendHasData ? (
                    <ResponsiveContainer width="100%" height="100%">
  <BarChart
    data={reportData?.revenueTrend || []}
    margin={{
      top: 8,
      right: 28,
      bottom: 4,
      left: 4,
    }}
  >
    <CartesianGrid
      strokeDasharray="3 3"
      stroke="var(--border)"
      vertical={false}
    />

    <XAxis
      dataKey="key"
      ticks={revenueXAxisTicks}
      tickFormatter={(value: string) =>
        formatTrendXAxisTick(value, periodType)
      }
      stroke="var(--muted-foreground)"
      tickLine={false}
      axisLine={false}
      interval={0}
      tickMargin={10}
      fontSize={12}
      padding={{
        left: 8,
        right: 12,
      }}
    />

    <YAxis
      stroke="var(--muted-foreground)"
      tickLine={false}
      axisLine={false}
      tickFormatter={(value) =>
        `${Math.round(Number(value) / 1_000_000)}M`
      }
    />

    <RechartsTooltip
      labelFormatter={(value: string) =>
        formatTrendXAxisTick(value, periodType)
      }
      formatter={(value: number) => [
        formatCurrency(value),
        "Booking revenue by play date",
      ]}
    />

    <Bar
      dataKey="revenue"
      fill="var(--chart-2)"
      radius={[6, 6, 0, 0]}
    />
  </BarChart>
</ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                      No revenue trend data is available for the selected period. Check the active filters or uploaded transactions.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle><TitleWithTooltip title="Revenue vs Meta Insight" tooltip="Compares booking revenue with Meta reach and engagement rate to see if marketing is working well." /></CardTitle>
                <CardDescription>Compare booking revenue with Meta reach and engagement rate for this period.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {metaDashboard?.hasData && revenueMetaComparisonData.length > 0 ? (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={revenueMetaComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="label" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}M`} />
                        <YAxis yAxisId="right" orientation="right" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} tickFormatter={(value) => formatCompactNumber(Number(value))} />
                        <YAxis yAxisId="engagement" orientation="right" hide domain={[0, "auto"]} tickFormatter={(value) => `${Number(value).toFixed(0)}%`} />
                        <RechartsTooltip
                          formatter={(value: number, name: string) => {
                            if (name === "revenue") return [formatCurrency(value), "Booking revenue by play date"]
                            if (name === "reach") return [formatCompactNumber(value), "Meta Reach"]
                            if (name === "engagementRate") return [formatPercent(value), "Meta Engagement Rate"]
                            return [formatCompactNumber(value), "Meta Views"]
                          }}
                        />
                        <Bar yAxisId="left" dataKey="revenue" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="reach" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
                        <Line yAxisId="engagement" type="monotone" dataKey="engagementRate" stroke="var(--chart-3)" strokeWidth={2} strokeDasharray="6 4" dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-border px-6 text-center text-sm text-muted-foreground">
                    {metaDashboard?.configured
                      ? "Meta is connected, but there's no data for this period yet."
                      : "Meta is not connected yet, so we need InstaSight data for this."}
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-border bg-secondary/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Booking revenue by play date</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(reportData?.summary.totalRevenue || 0)}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Meta Reach</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{formatCompactNumber(metaDashboard?.summary.totalReach)}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Engagement Rate</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{formatPercent(metaDashboard?.summary.engagementRate)}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Revenue / 1K Reach</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {Number(finiteMetric(metaDashboard?.summary.totalReach)) > 0
                        ? formatCurrency((reportData?.summary.totalRevenue || 0) / (Number(finiteMetric(metaDashboard?.summary.totalReach)) / 1000))
                        : "-"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                  <p>{metaComparisonInsight}</p>
                  <p className="mt-2 text-xs">
                    {metaDashboard?.lastSyncedAt
                      ? `Last Meta sync: ${formatExactDateTime(metaDashboard.lastSyncedAt)} (${getRelativeTime(metaDashboard.lastSyncedAt)}).`
                      : "Meta sync time is not available yet."}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle><TitleWithTooltip title="Booking Type Mix" tooltip="Shows how bookings are split between members and guests." /></CardTitle>
                <CardDescription>Mix of member vs guest bookings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-[280px]">
                  {bookingTypeMixLegend.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                      No booking type mix is available for the selected period.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={bookingTypeMixLegend} dataKey="value" nameKey="name" innerRadius={72} outerRadius={108} labelLine={false} label={pieLabelRenderer}>
                          {bookingTypeMixLegend.map((entry) => <Cell key={entry.key} fill={entry.color} />)}
                        </Pie>
                        <RechartsTooltip formatter={(value: number, _name: string, props: { payload?: { percentage?: number; name?: string } }) => [`${value} bookings (${formatPercent(props.payload?.percentage || 0)})`, props.payload?.name || "Booking Type"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                {bookingTypeMixLegend.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Booking type legend will appear after booking data is available for the selected period.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {bookingTypeMixLegend.map((segment) => (
                      <div key={segment.key} className="rounded-xl border border-border bg-secondary/20 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="mt-1 inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
                            <div>
                              <p className="font-medium text-slate-900">{segment.name}</p>
                              <p className="text-xs text-muted-foreground">{segment.value} bookings</p>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-slate-900">{formatPercent(segment.percentage)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {bookingTypeMixLegend.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Shows what percentage of bookings are members vs guests.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
            <CardTitle><TitleWithTooltip title="Play-Time Preference Mix" tooltip="Shows how bookings are distributed across morning, afternoon, evening, and night." /></CardTitle>
              <CardDescription>{playtimeBehaviorInsight}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="h-[320px]">
                  {playtimeChart.every((item) => item.value === 0) || playtimeChart.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                      No time preference data yet. Load data for the selected period to see which times are most popular.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={playtimeChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} allowDecimals={false} />
                        <RechartsTooltip
                          formatter={(value: number, _name: string, props: { payload?: { value?: number; name?: string } }) => {
                            const sessionCount = Number(value || props.payload?.value || 0)
                            const percentage = playtimeChartTotal > 0 ? (sessionCount / playtimeChartTotal) * 100 : 0
                            return [`${sessionCount.toLocaleString("en-US")} sessions (${formatPercent(percentage)})`, props.payload?.name || "Historical demand"]
                          }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
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
                        ? `${formatPercent(dominantPlaytime.percentage)} of booked sessions in the selected period came from this time window.`
                        : "Load historical data for the selected period to identify the dominant time window."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                    This chart shows past bookings by time of day. Use it to see which times are usually busy before planning promotions.
                  </div>
                  {playtimeLegend.map((item) => (
                    <div key={item.name} className="rounded-xl border border-border bg-secondary/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="mt-1 inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <div>
                            <p className="font-medium text-slate-900">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{formatPercent(item.percentage)} of historical booked sessions</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{item.value.toLocaleString("en-US")}</p>
                      </div>
                    </div>
                  ))}
                  {playtimeData ? (
                    <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                      {playtimeData.totalSessions.toLocaleString("en-US")} sessions across {playtimeData.totalCustomers.toLocaleString("en-US")} customers{playtimeData.clusterCount ? ` across ${playtimeData.clusterCount} groups` : ""} in the selected period{playtimeData.createdAt ? `, updated ${formatExactDateTime(playtimeData.createdAt)} (${getRelativeTime(playtimeData.createdAt)})` : ""}.
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}











