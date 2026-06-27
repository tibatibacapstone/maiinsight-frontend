"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  Info,
  Loader2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
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

interface PlaytimeMlData {
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
const venues = [
  { value: "All Venue", label: "All Venue" },
  { value: "Mini Soccer", label: "Mini Soccer" },
  { value: "Basketball", label: "Basketball" },
]
const customerTypes = ["All Type", "Membership", "Non Membership"]
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

const parseMonthValue = (value: string) => {
  const [year, monthValue] = value.split("-")
  const monthIndex = Math.max(1, Number(monthValue) || 1) - 1

  return {
    month: months[monthIndex] || months[0],
    year: year || String(new Date().getFullYear()),
  }
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

const getLatestAvailableMonthValue = (availableMonthValues: string[]) =>
  availableMonthValues.length ? availableMonthValues[availableMonthValues.length - 1] : null

const getFallbackMonthValueForYear = (year: string, preferredMonth: string, availableMonthValues: string[]) => {
  const availableMonthsForYear = getAvailableMonthValuesForYear(year, availableMonthValues)
  if (!availableMonthsForYear.length) return null

  const preferredValue = formatMonthValue(preferredMonth, year)
  if (preferredValue && availableMonthsForYear.includes(preferredValue)) return preferredValue

  return availableMonthsForYear[availableMonthsForYear.length - 1]
}

const getDefaultMonthSelection = () => {
  const now = new Date()

  return {
    month: months[now.getMonth()] || months[0],
    year: String(now.getFullYear()),
  }
}

const resolveDateRange = (month: string, year: string, periodType: "MTD" | "YTD") => {
  const yearNumber = Number(year)
  const now = new Date()
  const monthIndex = months.indexOf(month)

  if (!yearNumber) {
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: now,
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
  campaignObjective: "Belum ada objective utama yang bisa diringkas dari data saat ini.",
  targetCustomerGroup: "Target customer belum bisa diprioritaskan dari data saat ini.",
  customerReasoning: "Alasan bisnis belum bisa dirangkum karena data pendukung masih terbatas.",
  suggestedOffer: "Belum ada usulan promo yang cukup kuat dari data saat ini.",
  whatsappMessage: "Belum ada draft pesan yang dihasilkan dari context overview ini.",
  followUpPlan: "Belum ada follow-up plan yang bisa disusun dari data saat ini.",
  expectedBusinessImpact: "Dampak bisnis belum bisa diperkirakan secara meyakinkan.",
  dataLimitation: "Insight ini masih bergantung pada data historis yang sudah di-upload.",
})

const buildFallbackBusinessInsight = ({
  overviewKpi,
  reportData,
  topSegment,
  metaDashboard,
}: {
  overviewKpi: OverviewKpiData
  reportData: RevenueReportData
  topSegment: { name: string; percentage: number } | null
  metaDashboard: MetaDashboardData | null
}): BusinessInsightState => {
  const focusSession = overviewKpi.lowSessionLabel || "session terlemah"
  const topSegmentLabel = topSegment
    ? `${topSegment.name} (${formatPercent(topSegment.percentage)})`
    : "segment customer terbaru belum tersedia"
  const metaContext = metaDashboard?.hasData
    ? `Meta reach pada periode yang sama mencapai ${formatCompactNumber(metaDashboard.summary.totalReach)} dengan engagement rate ${formatPercent(metaDashboard.summary.engagementRate)}.`
    : "Data Meta belum tersedia, jadi perbandingan exposure vs revenue masih terbatas."

  return {
    source: "fallback",
    generatedAt: null,
    providerLabel: null,
    strategy: {
      campaignObjective: `Prioritaskan peningkatan okupansi untuk ${focusSession} sambil menjaga revenue by play date tetap sehat pada periode terpilih.`,
      targetCustomerGroup: `Fokus utama saat ini adalah ${topSegmentLabel}.`,
      customerReasoning: `${reportData.insights.occupancyInsight} ${reportData.insights.segmentationInsight}`,
      suggestedOffer: `Siapkan promo ringan atau bundling untuk session ${focusSession} dengan pesan yang relevan terhadap audience prioritas.`,
      whatsappMessage: "Overview insight tidak otomatis membuat pesan outreach. Gunakan GenAI Workspace jika ingin draft pesan siap pakai.",
      followUpPlan: `${metaContext} Setelah itu review kembali performa okupansi dan revenue by play date pada session yang diprioritaskan.`,
      expectedBusinessImpact: `${reportData.insights.revenueInsight} Jika promo diarahkan ke session terlemah, peluang perbaikan okupansi biasanya paling cepat terlihat di sana.`,
      dataLimitation: "Insight ini berasal dari data historis yang di-upload dan tidak menunjukkan ketersediaan slot secara real time.",
    },
  }
}

const buildPlaytimeChart = (playtimeMlData: PlaytimeMlData | null) => {
  const directRows = parseJsonArray<PlaytimeSessionPoint>(playtimeMlData?.sessionByTime)

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

  if (!Array.isArray(playtimeMlData?.customerSegments) || playtimeMlData.customerSegments.length === 0) {
    return []
  }

  const derived = playtimeMlData.customerSegments.reduce(
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
    return "Revenue by play date belum tersedia untuk dibandingkan dengan performa Meta."
  }

  if (!metaDashboard?.configured) {
    return "Meta belum terhubung. Sync InstaSight dulu kalau ingin membandingkan revenue by play date dengan exposure campaign."
  }

  if (!metaDashboard.hasData) {
    return "Belum ada data Meta pada periode ini. Revenue by play date sudah tampil, tapi exposure campaign belum bisa dibandingkan."
  }

  const revenue = reportData.summary.totalRevenue
  const reach = metaDashboard.summary.totalReach
  const engagementRate = metaDashboard.summary.engagementRate
  const revenuePer1kReach = reach > 0 ? revenue / (reach / 1000) : 0

  return `Revenue by play date mencapai ${formatCurrency(revenue)} dibanding ${formatCompactNumber(reach)} reach Meta pada periode yang sama. Itu setara sekitar ${formatCurrency(revenuePer1kReach)} per 1K reach dengan engagement rate ${formatPercent(engagementRate)}.`
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
  const [periodType, setPeriodType] = useState<"MTD" | "YTD">("MTD")
  const [status, setStatus] = useState<DashboardStatus | null>(null)
  const [overviewKpi, setOverviewKpi] = useState<OverviewKpiData | null>(null)
  const [occupancyTrend, setOccupancyTrend] = useState<OccupancyTrendPoint[]>([])
  const [reportData, setReportData] = useState<RevenueReportData | null>(null)
  const [segmentation, setSegmentation] = useState<ClusterProfile[]>([])
  const [playtimeMlData, setPlaytimeMlData] = useState<PlaytimeMlData | null>(null)
  const [metaDashboard, setMetaDashboard] = useState<MetaDashboardData | null>(null)
  const [businessInsight, setBusinessInsight] = useState<BusinessInsightState | null>(null)
  const [isLoadingBusinessInsight, setIsLoadingBusinessInsight] = useState(false)
  const [isBusinessInsightVisible, setIsBusinessInsightVisible] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentRole = getStoredRole()
  const canGenerateBusinessInsight = currentRole === "operational" || currentRole === "it_support"
  const availableMonthValues = status?.transactionAvailableMonths || []
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
      const availablePeriods = statusData.transactionAvailableMonths || []
      const fallbackMonthValue =
        getFallbackMonthValueForYear(selectedYear, selectedMonth, availablePeriods) ||
        getLatestAvailableMonthValue(availablePeriods) ||
        formatMonthValue(defaultSelection.month, defaultSelection.year) ||
        `${defaultSelection.year}-01`
      const currentMonthValue = formatMonthValue(selectedMonth, selectedYear)
      const effectiveMonthValue = currentMonthValue && availablePeriods.includes(currentMonthValue)
        ? currentMonthValue
        : fallbackMonthValue
      const effectiveSelection = parseMonthValue(effectiveMonthValue)

      if (effectiveSelection.month !== selectedMonth || effectiveSelection.year !== selectedYear) {
        setSelectedMonth(effectiveSelection.month)
        setSelectedYear(effectiveSelection.year)
      }

      const { startDate, endDate } = resolveDateRange(effectiveSelection.month, effectiveSelection.year, periodType)
      const startDateIso = formatLocalDate(startDate)
      const endDateIso = formatLocalDate(endDate)
      const overviewParams = new URLSearchParams({
        month: effectiveSelection.month,
        year: effectiveSelection.year,
        periodType,
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
        fetch(getApiUrl("/ml/playtime/latest"), { headers: getAuthHeaders(), cache: "no-store" }),
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
      setPlaytimeMlData(playtimeResult?.success ? playtimeResult.data : null)
      setSegmentation(segmentationResponse.success && segmentationResponse.data ? sortClusterProfiles(segmentationResponse.data.clusters || []) : [])
      setMetaDashboard(metaResult)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Overview data could not be loaded.")
      setStatus(null)
      setOverviewKpi(null)
      setOccupancyTrend([])
      setReportData(null)
      setPlaytimeMlData(null)
      setSegmentation([])
      setMetaDashboard(null)
    } finally {
      setIsLoading(false)
    }
  }, [defaultSelection.month, defaultSelection.year, periodType, selectedCustomerType, selectedMonth, selectedVenue, selectedYear])

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

  const playtimeChart = useMemo(() => buildPlaytimeChart(playtimeMlData), [playtimeMlData])

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
    if (!dominantPlaytime || !playtimeMlData) {
      return "No historical play-time preference insight is available yet."
    }

    return `${dominantPlaytime.name} currently dominates the imported historical dataset with ${formatPercent(dominantPlaytime.percentage)} of booked sessions from the latest ML run.`
  }, [dominantPlaytime, playtimeMlData])

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

  const revenueMetaComparisonData = useMemo(() => {
    if (!reportData?.revenueTrend?.length) return []

    const metaDailyMap = new Map<string, { reach: number; views: number }>()
    const metaMonthlyMap = new Map<string, { reach: number; views: number }>()

    metaDashboard?.trend?.forEach((item) => {
      const dailyKey = item.date
      const monthlyKey = item.date.slice(0, 7)
      const daily = metaDailyMap.get(dailyKey) || { reach: 0, views: 0 }
      daily.reach += Number(item.reach || 0)
      daily.views += Number(item.views || 0)
      metaDailyMap.set(dailyKey, daily)

      const monthly = metaMonthlyMap.get(monthlyKey) || { reach: 0, views: 0 }
      monthly.reach += Number(item.reach || 0)
      monthly.views += Number(item.views || 0)
      metaMonthlyMap.set(monthlyKey, monthly)
    })

    return reportData.revenueTrend.map((point) => {
      const metaPoint = point.key.length === 7
        ? metaMonthlyMap.get(point.key)
        : metaDailyMap.get(point.key)

      return {
        label: point.label,
        revenue: Number(point.revenue || 0),
        reach: Number(metaPoint?.reach || 0),
        views: Number(metaPoint?.views || 0),
      }
    })
  }, [metaDashboard?.trend, reportData?.revenueTrend])

  const metaComparisonInsight = useMemo(
    () => buildMetaComparisonInsight({ reportData, metaDashboard }),
    [metaDashboard, reportData]
  )

  const businessInsightRequest = useMemo(() => {
    if (!overviewKpi || !reportData) return null

    return {
      languagePreference: "Bahasa Indonesia",
      selected_filters: {
        mode: "overview_summary",
        month: selectedMonth,
        year: selectedYear,
        periodType,
        venue: selectedVenue,
        customerType: selectedCustomerType,
      },
      customer_segment_summary: {
        topSegment: topSegment?.name || "Not available",
        topSegmentSharePct: topSegment ? Number(topSegment.percentage.toFixed(1)) : null,
        totalSegmentedCustomers: segmentChartTotal,
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
        revenueDefinition: "Revenue is calculated by play date from uploaded transactions.",
      },
    }
  }, [metaComparisonInsight, metaDashboard?.summary.engagementRate, metaDashboard?.summary.totalReach, metaDashboard?.summary.totalViews, overviewKpi, periodType, reportData, segmentChartTotal, selectedCustomerType, selectedMonth, selectedVenue, selectedYear, topSegment])

  const businessInsightKey = useMemo(
    () => (businessInsightRequest ? JSON.stringify(businessInsightRequest) : null),
    [businessInsightRequest]
  )

  useEffect(() => {
    if (!overviewKpi || !reportData || !businessInsightKey) {
      setBusinessInsight(null)
      return
    }

    const fallbackInsight = buildFallbackBusinessInsight({
      overviewKpi,
      reportData,
      topSegment,
      metaDashboard,
    })

    const cached = businessInsightCacheRef.current.get(businessInsightKey)
    if (cached) {
      setBusinessInsight(cached)
      return
    }

    if (!canGenerateBusinessInsight) {
      businessInsightCacheRef.current.set(businessInsightKey, fallbackInsight)
      setBusinessInsight(fallbackInsight)
      return
    }

    let cancelled = false

    const generateInsight = async () => {
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

        if (cancelled) return
        businessInsightCacheRef.current.set(businessInsightKey, aiInsight)
        setBusinessInsight(aiInsight)
      } catch {
        if (cancelled) return
        businessInsightCacheRef.current.set(businessInsightKey, fallbackInsight)
        setBusinessInsight(fallbackInsight)
      } finally {
        if (!cancelled) {
          setIsLoadingBusinessInsight(false)
        }
      }
    }

    void generateInsight()

    return () => {
      cancelled = true
    }
  }, [businessInsightKey, businessInsightRequest, canGenerateBusinessInsight, metaDashboard, overviewKpi, reportData, topSegment])

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
            <p className="text-muted-foreground">Historical business performance, occupancy, segmentation, and machine learning highlights from imported transactions.</p>
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
              <div className="group relative min-w-[148px]">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors group-focus-within:text-foreground">Month</span>
                <select
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  disabled={!status?.hasTransactionData && !isLoading}
                  className="h-11 w-full appearance-none rounded-xl border border-border/70 bg-background/90 pl-[4.4rem] pr-10 text-sm font-medium text-foreground shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {months.map((month) => {
                    const option = monthOptions.find((item) => item.value === month)
                    return <option key={month} value={month} disabled={option?.disabled}>{month}</option>
                  })}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform group-hover:translate-y-[-45%] group-focus-within:text-foreground" />
              </div>
              <div className="group relative min-w-[124px]">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors group-focus-within:text-foreground">Year</span>
                <select
                  value={selectedYear}
                  onChange={(event) => {
                    const nextYear = event.target.value
                    const fallbackMonthValue = getFallbackMonthValueForYear(nextYear, selectedMonth, availableMonthValues)
                    setSelectedYear(nextYear)
                    if (fallbackMonthValue) {
                      const nextSelection = parseMonthValue(fallbackMonthValue)
                      setSelectedMonth(nextSelection.month)
                    }
                  }}
                  disabled={!status?.hasTransactionData && !isLoading}
                  className="h-11 w-full appearance-none rounded-xl border border-border/70 bg-background/90 pl-[3.6rem] pr-10 text-sm font-medium text-foreground shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {yearOptions.map((year) => (
                    <option key={year.value} value={year.value} disabled={year.disabled}>{year.value}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform group-hover:translate-y-[-45%] group-focus-within:text-foreground" />
              </div>
              <div className="group relative min-w-[150px]">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors group-focus-within:text-foreground">Venue</span>
                <select value={selectedVenue} onChange={(event) => setSelectedVenue(event.target.value)} className="h-11 w-full appearance-none rounded-xl border border-border/70 bg-background/90 pl-[4rem] pr-10 text-sm font-medium text-foreground shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:border-primary focus:ring-2 focus:ring-primary/15">
                  {venues.map((venue) => <option key={venue.value} value={venue.value}>{venue.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform group-hover:translate-y-[-45%] group-focus-within:text-foreground" />
              </div>
              <div className="group relative min-w-[172px]">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors group-focus-within:text-foreground">Customer</span>
                <select value={selectedCustomerType} onChange={(event) => setSelectedCustomerType(event.target.value)} className="h-11 w-full appearance-none rounded-xl border border-border/70 bg-background/90 pl-[5.6rem] pr-10 text-sm font-medium text-foreground shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:border-primary focus:ring-2 focus:ring-primary/15">
                  {customerTypes.map((customerType) => <option key={customerType} value={customerType}>{customerType}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform group-hover:translate-y-[-45%] group-focus-within:text-foreground" />
              </div>
              <div className="inline-flex h-11 items-center rounded-xl border border-border/70 bg-background/80 p-1 shadow-sm">
                {(["MTD", "YTD"] as const).map((type) => (
                  <Button
                    key={type}
                    variant={periodType === type ? "secondary" : "ghost"}
                    className={`h-9 rounded-lg border px-4 text-sm transition ${periodType === type
                      ? type === "MTD"
                        ? "border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200"
                        : "border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      : "border-transparent text-muted-foreground hover:bg-accent/80 hover:text-foreground"}`}
                    onClick={() => setPeriodType(type)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          {/* <p className="mt-3 text-xs text-muted-foreground">
            Metrics on this page are based on uploaded historical transaction data and do not reflect live slot availability.
          </p> */}
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
      ) : null}

      {!isLoading && status && !status.hasTransactionData ? (
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
                      ? "AI-generated summary from revenue by play date, occupancy, Meta exposure, and customer segmentation."
                      : "Priority summary from historical overview metrics."}
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
                  <Badge variant="secondary">
                    {businessInsight?.generatedAt ? `Updated ${getRelativeTime(businessInsight.generatedAt)}` : "Ready"}
                  </Badge>
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Revenue by Play Date</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold">{overviewKpi ? formatCurrency(overviewKpi.totalRevenue) : "-"}</p>
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
                  <Badge variant="outline" className="text-[11px]">
                    {lowSessionBadge}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{overviewKpi?.lowSessionLabel || "No data"}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {overviewKpi?.lowSessionDetail || "Low-demand session insight will appear after data is available."}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Booked Court-Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{overviewKpi?.totalBookedSessions?.toLocaleString("en-US") || "-"}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {overviewKpi
                    ? `${overviewKpi.totalBookedSessions.toLocaleString("en-US")} of ${overviewKpi.availableSessions.toLocaleString("en-US")} available court-hours were filled in the selected period.`
                    : "No booking volume is available yet."}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle><TitleWithTooltip title="Occupancy Trend" tooltip="Shows how much of the available court-hours were occupied across the selected historical play-date period." /></CardTitle>
                <CardDescription>
                  {reportData?.insights.occupancyInsight || "Court-hour occupancy based on imported transactions."}
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
                      {overviewKpi ? (
                        <ReferenceLine
                          y={overviewKpi.occupancyRate}
                          stroke="var(--muted-foreground)"
                          strokeDasharray="6 6"
                          strokeWidth={1.5}
                        />
                      ) : null}
                      <Area type="monotone" dataKey="rate" stroke="var(--chart-1)" fill="url(#occupancyGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {overviewKpi ? (
                  <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-block w-10 border-t-2 border-dashed border-muted-foreground" />
                    <span>Dashed line = selected period average occupancy ({formatPercent(overviewKpi.occupancyRate)}).</span>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle><TitleWithTooltip title="Revenue by Play Date Trend" tooltip="Tracks revenue using the play date of each booking, not the transaction timestamp." /></CardTitle>
                <CardDescription>
                  {reportData?.insights.revenueInsight || "Revenue trend by play date based on imported transactions."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData?.revenueTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}M`} />
                      <RechartsTooltip formatter={(value: number) => [formatCurrency(value), "Revenue by Play Date"]} />
                      <Bar dataKey="revenue" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle><TitleWithTooltip title="Revenue vs Meta Insight" tooltip="Compares revenue by play date with the latest synced Meta API reach so Marketing Ops can judge whether campaign exposure is keeping pace with booked revenue." /></CardTitle>
                <CardDescription>Revenue by play date compared with the latest synced Meta API reach for the selected historical period.</CardDescription>
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
                            if (name === "revenue") return [formatCurrency(value), "Revenue by Play Date"]
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
                      ? "Meta is connected, but there is no synced exposure data for this period yet."
                      : "Meta is not connected yet, so this comparison still needs InstaSight data."}
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-border bg-secondary/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Revenue by Play Date</p>
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
                <CardTitle><TitleWithTooltip title="Booking Type Mix" tooltip="Shows how the selected historical bookings are split between membership and non-membership activity, which is more directly actionable for daily operational campaigns." /></CardTitle>
                <CardDescription>Operational booking mix for the selected period.</CardDescription>
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
                    Percentages show each booking type's share of total bookings in the selected historical period.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle><TitleWithTooltip title="Play-Time Preference Mix" tooltip="Shows the historical mix of booked sessions from the latest play-time clustering run. Use it to see whether Morning, Afternoon, or Night demand dominates the imported dataset." /></CardTitle>
              <CardDescription>{playtimeBehaviorInsight}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="h-[320px]">
                  {playtimeChart.every((item) => item.value === 0) || playtimeChart.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                      No play-time ML result is available yet. Run Machine Learning from Data Center to generate a historical session-preference profile.
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
                    This chart reflects imported historical play-date sessions, not live slot availability. Use it as a demand baseline before deciding which session window needs promotion.
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
                  {playtimeMlData ? (
                    <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                      {playtimeMlData.totalSessions.toLocaleString("en-US")} sessions across {playtimeMlData.totalCustomers.toLocaleString("en-US")} customers{playtimeMlData.clusterCount ? ` across ${playtimeMlData.clusterCount} clusters` : ""} in the latest ML run{playtimeMlData.createdAt ? `, updated ${formatExactDateTime(playtimeMlData.createdAt)} (${getRelativeTime(playtimeMlData.createdAt)})` : ""}.
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



















