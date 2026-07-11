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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getApiUrl } from "@/lib/api"
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
  latestMlRun: {
    createdAt: string
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
  reach: number
  views: number
  interactions: number
  engagementRate?: number
}

interface MetaDashboardData {
  configured: boolean
  hasData: boolean
  lastSyncedAt: string | null
  summary: {
    totalViews: number
    totalReach: number
    totalInteractions: number
    totalShares: number
    engagementRate: number
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

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DEFAULT_MONTH_OPTION = "All Month"
const venues = [
  { value: "All Venue", label: "All Venue" },
  { value: "Mini Soccer", label: "Mini Soccer" },
  { value: "Basketball", label: "Basketball" },
]
const customerTypes = ["All Type", "Membership", "Non Membership", "Internal"]
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
  regular_booking: "Membership",
  member_internal_booking: "Non Membership",
  internal: "Internal",
  other: "Other",
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
const formatPercent = (value: number) => `${Number(value.toFixed(1))}%`
const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)

const formatLocalDate = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const formatMonthValue = (month: string, year: string) => {
  const monthIndex = months.indexOf(month)
  if (monthIndex < 0 || !year) return null

  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`
}

const buildYearOptions = (min?: string | null, max?: string | null, fallbackYear?: string) => {
  const minYear = min ? Number(min.slice(0, 4)) : Number(fallbackYear)
  const maxYear = max ? Number(max.slice(0, 4)) : Number(fallbackYear)
  const safeFallbackYear = Number(fallbackYear) || new Date().getFullYear()
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
  const now = new Date()

  return {
    month: DEFAULT_MONTH_OPTION,
    year: String(now.getFullYear()),
  }
}

const resolveDateRange = (month: string, year: string, periodType: "MTD" | "YTD" | null) => {
  const yearNumber = Number(year)
  const now = new Date()
  const monthIndex = months.indexOf(month)

  if (!yearNumber) {
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: now,
    }
  }

  if (month === DEFAULT_MONTH_OPTION) {
    return {
      startDate: new Date(yearNumber, 0, 1),
      endDate: yearNumber === now.getFullYear() ? now : new Date(yearNumber, 11, 31),
    }
  }

  const safeMonthIndex = monthIndex >= 0 ? monthIndex : now.getMonth()

  if (periodType === "YTD") {
    return {
      startDate: new Date(yearNumber, 0, 1),
      endDate: new Date(yearNumber, safeMonthIndex + 1, 0),
    }
  }

  return {
    startDate: new Date(yearNumber, safeMonthIndex, 1),
    endDate: new Date(yearNumber, safeMonthIndex + 1, 0),
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
  const metaContext = metaDashboard?.hasData
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

const buildMetaComparisonInsight = ({
  reportData,
  metaDashboard,
}: {
  reportData: RevenueReportData | null
  metaDashboard: MetaDashboardData | null
}) => {
  if (!reportData) {
    return "Revenue data is not available yet for comparison with Meta."
  }

  if (!metaDashboard?.configured) {
    return "Meta is not connected yet. Sync Instagram data first if you want to compare revenue with ads reach."
  }

  if (!metaDashboard.hasData) {
    return "No Meta data for this period yet. Revenue data is ready, but ads reach data is not available for comparison."
  }

  const revenue = reportData.summary.totalRevenue
  const reach = metaDashboard.summary.totalReach
  const engagementRate = metaDashboard.summary.engagementRate
  const revenuePer1kReach = reach > 0 ? revenue / (reach / 1000) : 0

  return `Revenue was ${formatCurrency(revenue)} with ${formatCompactNumber(reach)} reach from Meta ads in this period. That's about ${formatCurrency(revenuePer1kReach)} per 1K reach with ${formatPercent(engagementRate)} engagement rate.`
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
  const [selectedCustomerType, setSelectedCustomerType] = useState("All Type")
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

  const yearOptions = useMemo(() => {
    const options = buildYearOptions(status?.transactionMonthRange.min, status?.transactionMonthRange.max, selectedYear)
    return options.map((year) => ({
      value: year,
      disabled: getAvailableMonthValuesForYear(year, availableMonthValues).length === 0,
    }))
  }, [availableMonthValues, selectedYear, status?.transactionMonthRange.max, status?.transactionMonthRange.min])

  const monthOptions = useMemo(() => {
    return months.map((month) => ({
      value: month,
      disabled: !availableMonthValues.includes(formatMonthValue(month, selectedYear) || ""),
    }))
  }, [availableMonthValues, selectedYear])

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const token = getStoredToken()
      if (!token) {
        throw new Error("Please sign in again to load the Overview dashboard.")
      }

      const statusResponse = await fetch(getApiUrl("/operations/status"), { headers: getAuthHeaders(), cache: "no-store" })
      const statusResult = await statusResponse.json().catch(() => null)

      if (!statusResponse.ok || !statusResult?.success || !statusResult.data) {
        throw new Error(statusResult?.message || "Overview status could not be loaded.")
      }

      const statusData = statusResult.data as DashboardStatus
      const effectiveSelection = {
        month: selectedMonth,
        year: selectedYear,
      }

      const { startDate, endDate } = resolveDateRange(effectiveSelection.month, effectiveSelection.year, periodType || "MTD")
      const startDateIso = formatLocalDate(startDate)
      const endDateIso = formatLocalDate(endDate)
      const overviewParams = new URLSearchParams({
        month: effectiveSelection.month,
        year: effectiveSelection.year,
        periodType: periodType || "MTD",
        venue: selectedVenue,
        customerType: selectedCustomerType,
      })
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

      const [
        kpiResponse,
        occupancyResponse,
        reportResponse,
        playtimeResponse,
        segmentationResponse,
        metaResult,
      ] = await Promise.all([
        fetch(getApiUrl(`/dashboard/overview-kpis?${overviewParams.toString()}`), { headers: getAuthHeaders(), cache: "no-store" }),
        fetch(getApiUrl(`/dashboard/occupancy-trend?${overviewParams.toString()}`), { headers: getAuthHeaders(), cache: "no-store" }),
        fetch(getApiUrl(`/operations/management-report?${reportParams.toString()}`), { headers: getAuthHeaders(), cache: "no-store" }),
        fetch(getApiUrl(`/dashboard/playtime-mix?${overviewParams.toString()}`), { headers: getAuthHeaders(), cache: "no-store" }),
        fetchSegmentationSummary().then((data) => ({ success: true, data })).catch(() => ({ success: false, data: null })),
        fetch(getApiUrl(`/meta/dashboard?${metaParams.toString()}`), { headers: getAuthHeaders(), cache: "no-store" })
          .then(async (response) => {
            const result = await response.json().catch(() => null)
            return response.ok && result?.success ? result.data as MetaDashboardData : null
          })
          .catch(() => null),
      ])

      const kpiResult = await kpiResponse.json().catch(() => null)
      const occupancyResult = await occupancyResponse.json().catch(() => null)
      const reportResult = await reportResponse.json().catch(() => null)
      const playtimeResult = await playtimeResponse.json().catch(() => null)

      setStatus(statusData)
      setOverviewKpi(kpiResult?.success ? kpiResult.data : null)
      setOccupancyTrend(occupancyResult?.success && Array.isArray(occupancyResult.data) ? occupancyResult.data : [])
      setReportData(reportResult?.success ? reportResult.data : null)
      setPlaytimeData(playtimeResult?.success ? playtimeResult.data : null)
      setSegmentation(segmentationResponse.success && segmentationResponse.data ? sortClusterProfiles(segmentationResponse.data.clusters || []) : [])
      setMetaDashboard(metaResult)
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
      setIsLoading(false)
    }
  }, [periodType, selectedCustomerType, selectedMonth, selectedVenue, selectedYear])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    const refresh = () => void loadDashboard()
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
      .map(([key, value], index) => ({
        key,
        name: bookingTypeLabelMap[key] || key,
        value: Number(value || 0),
        color: chartColors[index % chartColors.length],
      }))
      .filter((item) => item.value > 0)
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

    const metaDailyMap = new Map<string, { reach: number; views: number; interactions: number; engagementRate?: number }>()
    const metaMonthlyMap = new Map<string, { reach: number; views: number; interactions: number; engagementRate?: number }>()

    metaDashboard?.trend?.forEach((item) => {
      const dailyKey = item.date
      const monthlyKey = item.date.slice(0, 7)
      const daily = metaDailyMap.get(dailyKey) || { reach: 0, views: 0, interactions: 0 }
      daily.reach += Number(item.reach || 0)
      daily.views += Number(item.views || 0)
      daily.interactions += Number(item.interactions || 0)
      const dailyEngagementRate = Number(item.engagementRate ?? NaN)
      if (Number.isFinite(dailyEngagementRate)) daily.engagementRate = dailyEngagementRate
      metaDailyMap.set(dailyKey, daily)

      const monthly = metaMonthlyMap.get(monthlyKey) || { reach: 0, views: 0, interactions: 0 }
      monthly.reach += Number(item.reach || 0)
      monthly.views += Number(item.views || 0)
      monthly.interactions += Number(item.interactions || 0)
      metaMonthlyMap.set(monthlyKey, monthly)
    })

    return reportData.revenueTrend.map((point) => {
      const metaPoint = point.key.length === 7
        ? metaMonthlyMap.get(point.key)
        : metaDailyMap.get(point.key)

      const reach = Number(metaPoint?.reach || 0)
      const interactions = Number(metaPoint?.interactions || 0)
      const engagementRate = Number(metaPoint?.engagementRate ?? NaN)

      return {
        label: point.label,
        revenue: Number(point.revenue || 0),
        reach,
        views: Number(metaPoint?.views || 0),
        engagementRate: Number.isFinite(engagementRate)
          ? engagementRate
          : reach > 0
            ? Number(((interactions / reach) * 100).toFixed(2))
            : 0,
      }
    })
  }, [metaDashboard?.trend, reportData])

  const metaComparisonInsight = useMemo(
    () => buildMetaComparisonInsight({ reportData, metaDashboard }),
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
      languagePreference: "Bahasa Indonesia",
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
        metaReach: metaDashboard?.summary.totalReach || 0,
        metaViews: metaDashboard?.summary.totalViews || 0,
        metaEngagementRate: metaDashboard?.summary.engagementRate || 0,
        metaInsight: metaComparisonInsight,
        historicalOnly: true,
        revenueDefinition: "Revenue is based on when the booking was made.",
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
        providerLabel:
          result?.data?.provider === "azure" || result?.provider === "azure"
            ? "Azure OpenAI"
            : "Gemini",
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
    <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
      Dashboard filters
    </p>

    <div className="flex flex-wrap items-center justify-end gap-2">
      {/* Month Filter */}
      <div className="w-[176px]">
        <Select
          value={selectedMonth}
          onValueChange={setSelectedMonth}
          disabled={!status?.hasTransactionData && !isLoading}
        >
          <SelectTrigger className="h-11 w-full rounded-xl border border-border/70 bg-background/90 px-3 shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:ring-2 focus:ring-primary/15">
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Month
              </span>
              <SelectValue placeholder="Month" />
            </div>
          </SelectTrigger>

          <SelectContent
            position="popper"
            className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg"
          >
            <SelectItem value={DEFAULT_MONTH_OPTION}>
              {DEFAULT_MONTH_OPTION}
            </SelectItem>

            {months.map((month) => {
              const option = monthOptions.find((item) => item.value === month)

              return (
                <SelectItem
                  key={month}
                  value={month}
                  disabled={option?.disabled}
                >
                  {month}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Year Filter */}
      <div className="w-[140px]">
        <Select
          value={selectedYear}
          onValueChange={setSelectedYear}
          disabled={!status?.hasTransactionData && !isLoading}
        >
          <SelectTrigger className="h-11 w-full rounded-xl border border-border/70 bg-background/90 px-3 shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:ring-2 focus:ring-primary/15">
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Year
              </span>
              <SelectValue placeholder="Year" />
            </div>
          </SelectTrigger>

          <SelectContent
            position="popper"
            className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg"
          >
            {yearOptions.map((year) => (
              <SelectItem
                key={year.value}
                value={year.value}
                disabled={year.disabled}
              >
                {year.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Venue Filter */}
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
            {venues.map((venue) => (
              <SelectItem key={venue.value} value={venue.value}>
                {venue.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Customer Filter */}
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
            {customerTypes.map((customerType) => (
              <SelectItem key={customerType} value={customerType}>
                {customerType}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* MTD / YTD Filter */}
      <div className="inline-flex h-11 items-center rounded-xl border border-border/70 bg-background/80 p-1 shadow-sm">
        {(["MTD", "YTD"] as const).map((type) => (
          <Button
            key={type}
            variant={periodType === type ? "secondary" : "ghost"}
            className={`h-8 rounded-lg border px-3 text-[11px] transition ${
              periodType === type
                ? type === "MTD"
                  ? "border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200"
                  : "border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                : "border-transparent text-muted-foreground hover:bg-accent/80 hover:text-foreground"
            }`}
            onClick={() =>
              setPeriodType((current) => (current === type ? null : type))
            }
          >
            {type}
          </Button>
        ))}
      </div>
    </div>
  </div>
</div>
      </div>

      {error ? (
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Occupancy Rate</CardTitle>
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Revenue
        
                </CardTitle>
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">Lowest-Demand Session</CardTitle>
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Peak Session Revenue</CardTitle>
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
                    <AreaChart data={occupancyTrend}>
                      <defs>
                        <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
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
                <CardTitle><TitleWithTooltip title="Revenue Trend" tooltip="Shows booking revenue grouped by play date, using the same filters as the overview card." /></CardTitle>
                <CardDescription>{revenueTrendSubtitle}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  {revenueTrendHasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData?.revenueTrend || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="label" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}M`} />
                        <RechartsTooltip formatter={(value: number) => [formatCurrency(value), "Revenue"]} />
                        <Bar dataKey="revenue" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
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
                        <RechartsTooltip
                          formatter={(value: number, name: string) => {
                            if (name === "revenue") return [formatCurrency(value), "Revenue"]
                            if (name === "reach") return [formatCompactNumber(value), "Meta Reach"]
                            return [formatCompactNumber(value), "Meta Views"]
                          }}
                        />
                        <Bar yAxisId="left" dataKey="revenue" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="reach" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} /> 
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
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Revenue</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(reportData?.summary.totalRevenue || 0)}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Meta Reach</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{formatCompactNumber(metaDashboard?.summary.totalReach || 0)}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Engagement Rate</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{formatPercent(metaDashboard?.summary.engagementRate || 0)}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Revenue / 1K Reach</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {metaDashboard?.summary.totalReach
                        ? formatCurrency((reportData?.summary.totalRevenue || 0) / (metaDashboard.summary.totalReach / 1000))
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
                <CardTitle><TitleWithTooltip title="Booking Type" tooltip="Shows how bookings are split between members and guests." /></CardTitle>
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
              <CardTitle><TitleWithTooltip title="Play-Time Distribution" tooltip="Shows which time of day (morning, afternoon, or night) is most popular for bookings." /></CardTitle>
              <CardDescription>{playtimeBehaviorInsight}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="h-[320px]">
                  {playtimeChart.every((item) => item.value === 0) || playtimeChart.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                      No time preference data yet. Run Machine Learning from Data Center to see which times are most popular.
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
                        ? `${formatPercent(dominantPlaytime.percentage)} of booked sessions in the latest ML run came from this play-time window.`
                        : "Run Machine Learning to identify which play-time window dominates the imported dataset."}
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
                      {playtimeData.totalSessions.toLocaleString("en-US")} sessions across {playtimeData.totalCustomers.toLocaleString("en-US")} customers{playtimeData.clusterCount ? ` across ${playtimeData.clusterCount} clusters` : ""} in the latest ML run{playtimeData.createdAt ? `, updated ${formatExactDateTime(playtimeData.createdAt)} (${getRelativeTime(playtimeData.createdAt)})` : ""}.
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











