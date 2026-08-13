"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { BusinessErrorAlert } from "@/components/business-error-alert"
import { HeatmapGrid } from "@/components/segment-visualization" // ⬅️ NEW: reused for Empty Slot Heatmap
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardTitleTooltip } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getApiUrl } from "@/lib/api"
import { getAuthHeaders } from "@/lib/roles"
import { CUSTOMER_SEGMENT_COLORS } from "@/lib/segmentation"
import { getDailyXTicks } from "@/lib/chart-ticks" // ⬅️ NEW: shared odd-day X-axis tick rule for both trend charts
import {
  AlertTriangle,
  ArrowRight,
  BarChart3, // ⬅️ NEW
  Calendar,
  CheckCircle2,
  Clock, // ⬅️ NEW
  Download,
  FileText,
  Info,
  Loader2,
  Sparkles,
  Target,
  TrendingDown, // ⬅️ NEW
  TrendingUp,
  Users,
  Wallet,
  Zap, // ⬅️ NEW
} from "lucide-react"
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
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
   LabelList,
  CartesianGrid,
  Cell, // ⬅️ NEW
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"

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

interface ComparisonMetric {
  current: number
  previous: number
  changePct: number | null
}

const PRESENTATION_THEMES = [
  {
    id: "executive",
    label: "Executive Navy",
    description: "Navy gelap + aksen emas — klasik boardroom",
    swatch: ["#0B1F3A", "#F5C451"],
  },
  {
    id: "emerald",
    label: "Forest Emerald",
    description: "Hijau hutan + aksen lime — modern & segar",
    swatch: ["#0F3D2E", "#D9F99D"],
  },
  {
    id: "slate",
    label: "Slate Modern",
    description: "Slate gelap + aksen biru langit — bersih",
    swatch: ["#0F172A", "#38BDF8"],
  },
  {
    id: "burgundy",
    label: "Burgundy Classic",
    description: "Merah anggur + aksen krem — premium",
    swatch: ["#43101F", "#E8C4A0"],
  },
]

interface CourtTypePerformanceRow {
  courtType: string
  courtLabel: string
  revenue: number
  bookings: number
  bookedHours: number
  availableHours: number
  occupancyRate: number
}

interface SessionOccupancyRow {
  sessionName: string
  bookedHours: number
  availableHours: number
  occupancyRate: number
  revenue: number
}

interface SegmentContributionRow {
  segmentName: string
  customerCount: number
}

interface MetaDashboardData {
  hasData: boolean
  lastSyncedAt: string | null
  summary: {
    totalViews: number | null
    totalReach: number | null
    totalInteractions: number
    totalShares: number
    engagementRate: number | null
    shareRate: number | null
  }
}

interface MetaAudienceSummary {
  hasData: boolean
  summary: {
    dominantGender: string
    dominantGenderPct: number
    dominantAgeGroup: string
    topCity: string
    topCityPct: number
  }
  personaInsight: string
}

// ⬅️ NEW: mirrors OverviewKpiData used in analytics-dashboard.tsx
interface OverviewKpiData {
  occupancyRate: number
  occupancyChange: number
  totalRevenue: number
  revenueChange: number
  lowSessionLabel: string
  peakSessionLabel: string
  peakSessionRevenue: number
}

// ⬅️ NEW: mirrors OccupancyTrendPoint used in analytics-dashboard.tsx
interface OccupancyTrendPoint {
  key?: string
  label: string
  bookedSessions: number
  availableSessions: number
  rate: number
}

// ⬅️ NEW: heatmap + playtime mix payload shape (same as analytics-dashboard.tsx / low-occupancy-targeting.tsx)
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

interface ReportResponse {
  success: boolean
  data?: {
    generatedAt: string
    hasData: boolean
    filters: {
      startDate: string
      endDate: string
      courtType: string
      bookingType: string
      customerType: string
    }
    summary: {
      totalRevenue: number
      totalBookings: number
      courtHourCount: number
      availableSessions: number
      occupancyRate: number
      avgRevenuePerBooking: number
    }
    period: {
      startDate: string
      endDate: string
      label: string
    }
    comparisonPeriod: {
      startDate: string
      endDate: string
      label: string
    }
    revenueTrend: Array<{
      key: string
      label: string
      revenue: number
      bookings: number
    }>
    bookingTypeBreakdown: Record<string, number>
    courtTypePerformance: CourtTypePerformanceRow[]
    sessionOccupancy: SessionOccupancyRow[]
    lowOccupancySessions: SessionOccupancyRow[]
    highOccupancySessions: SessionOccupancyRow[]
    segmentContribution: SegmentContributionRow[]
    segmentationSummary: {
      runDate: string
      totalCustomers: number
    } | null
    comparison: {
      revenue: ComparisonMetric
      bookings: ComparisonMetric
      occupancyRate: ComparisonMetric
      avgRevenuePerBooking: ComparisonMetric
    }
    insights: {
      executiveSummary: string
      occupancyInsight: string
      revenueInsight: string
      segmentationInsight: string
      keyFindings: string[]
      actionPlan: string[]
      recommendations: string[]
    }
  }
  message?: string
}

// startDate/endDate will be set by `applyDefaultRange` (from API or fallback)

// ⬅️ NEW: shared helper constants for the playtime + segment charts
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
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

const buildPlaytimeChart = (playtimeMix: { sessionByTime: PlaytimeSessionPoint[] } | null) => {
  const directRows = parseJsonArray<PlaytimeSessionPoint>(playtimeMix?.sessionByTime)

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

// ⬅️ NEW: derives the overview-kpis / occupancy-trend query params from the report's date range + court filter
const deriveOverviewParams = (endDate: string, courtType: string) => {
  const parsed = endDate ? new Date(endDate) : new Date()
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed
  const month = months[safeDate.getMonth()] || months[0]
  const year = String(safeDate.getFullYear())
  const venue = courtType === "mini_soccer" ? "Mini Soccer" : courtType === "basketball" ? "Basketball" : "All Venue"

  return { month, year, venue }
}

const formatCurrency = (value: number) => `IDR ${Math.round(value).toLocaleString("id-ID")}`

const formatPercent = (value: number | null | undefined) => (value === null || value === undefined ? "-" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`)

const formatDateInput = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const getLastMonthRange = () => {
  const end = new Date()
  end.setDate(0)
  const start = new Date(end.getFullYear(), end.getMonth(), 1)

  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
  }
}

export function ManagementReport() {
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [courtType, setCourtType] = useState("all")
  const [bookingType, setBookingType] = useState("all")
  const [report, setReport] = useState<ReportResponse["data"] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isApplyingDefaultRange, setIsApplyingDefaultRange] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadConfirmOpen, setDownloadConfirmOpen] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState("executive")
  const [isExporting, setIsExporting] = useState(false)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null)
  const [metaDashboard, setMetaDashboard] = useState<MetaDashboardData | null>(null)
  const [metaAudienceSummary, setMetaAudienceSummary] = useState<MetaAudienceSummary | null>(null)

  // ⬅️ NEW: state for the visuals pulled in from Overview / Fill Empty Sessions / Segments
  const [overviewKpi, setOverviewKpi] = useState<OverviewKpiData | null>(null)
  const [occupancyTrend, setOccupancyTrend] = useState<OccupancyTrendPoint[]>([])
  // ⬅️ NEW: playtime + heatmap now come from actual-data endpoints, not ML
  const [playtimeMix, setPlaytimeMix] = useState<{ sessionByTime: PlaytimeSessionPoint[]; totalSessions: number; totalCustomers: number } | null>(null)
  const [heatmapSummary, setHeatmapSummary] = useState<HeatmapSummary | null>(null)

  useEffect(() => {
    const applyDefaultRange = async () => {
      try {
        const response = await fetch(getApiUrl("/operations/status"), {
          method: "GET",
          cache: "no-store",
          headers: getAuthHeaders(),
        })

        const result = await response.json().catch(() => null)
        const range = result?.success ? result?.data?.transactionMonthRange : null

        if (range?.min && range?.max) {
          try {
            // Prefer using the reported max transaction date to determine the latest month
            const maxDate = new Date(range.max)
            if (!isNaN(maxDate.getTime())) {
              const end = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0) // last day of that month
              const start = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)
              setStartDate(formatDateInput(start))
              setEndDate(formatDateInput(end))
              return
            }
          } catch {
            // fall back to last calendar month below
          }
        }
      } catch {
        // fall back to the last calendar month below
      } finally {
        setIsApplyingDefaultRange(false)
      }

      const fallbackRange = getLastMonthRange()
      setStartDate(fallbackRange.startDate)
      setEndDate(fallbackRange.endDate)
    }

    void applyDefaultRange()
  }, [])

  const loadReport = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        startDate,
        endDate,
        courtType,
        bookingType,
      })

      // ⬅️ NEW: params for overview-kpis, derived from the current report filters
      const { venue } = deriveOverviewParams(endDate, courtType)
      const exactRangeParams = new URLSearchParams({
        startDate,
        endDate,
        venue,
        customerType: "All Type",
        bookingType,
      })

      // ⬅️ NEW: occupancy-trend reuses the report's exact date range; the backend
      // emits daily buckets (<= 45 days) or monthly buckets (longer ranges) just
      // like Revenue Trend, so no bucket override is needed
      const occupancyTrendParams = new URLSearchParams({
        startDate,
        endDate,
        venue,
        customerType: "All Type",
        bookingType,
      })

      const [
        reportResponse,
        metaDashboardResponse,
        metaAudienceResponse,
        overviewKpiResponse, // ⬅️ NEW
        occupancyTrendResponse, // ⬅️ NEW
        playtimeMixResponse, // ⬅️ NEW: actual data, replaces /ml/playtime/latest
        heatmapResponse, // ⬅️ NEW: actual data, replaces /ml/playtime/latest heatmap
      ] = await Promise.all([
        fetch(getApiUrl(`/operations/management-report?${params.toString()}`), {
          method: "GET",
          cache: "no-store",
          headers: getAuthHeaders(),
        }),
        fetch(getApiUrl(`/meta/dashboard?since=${startDate}&until=${endDate}`), {
          method: "GET",
          cache: "no-store",
          headers: getAuthHeaders(),
        }).catch(() => null),
        fetch(getApiUrl("/meta/audience-summary"), {
          method: "GET",
          cache: "no-store",
          headers: getAuthHeaders(),
        }).catch(() => null),
        fetch(getApiUrl(`/dashboard/overview-kpis?${exactRangeParams.toString()}`), {
          method: "GET",
          cache: "no-store",
          headers: getAuthHeaders(),
        }).catch(() => null),
        fetch(getApiUrl(`/dashboard/occupancy-trend?${occupancyTrendParams.toString()}`), {
          method: "GET",
          cache: "no-store",
          headers: getAuthHeaders(),
        }).catch(() => null),
        fetch(getApiUrl(`/dashboard/playtime-mix?${exactRangeParams.toString()}`), {
          method: "GET",
          cache: "no-store",
          headers: getAuthHeaders(),
        }).catch(() => null),
        fetch(getApiUrl(`/dashboard/empty-slot-heatmap?${exactRangeParams.toString()}`), {
          method: "GET",
          cache: "no-store",
          headers: getAuthHeaders(),
        }).catch(() => null),
      ])

      const result: ReportResponse | null = await reportResponse.json().catch(() => null)
      if (!reportResponse.ok || !result?.success || !result.data) {
        throw new Error(result?.message || "Management report could not be loaded.")
      }

      const metaDashboardResult = metaDashboardResponse ? await metaDashboardResponse.json().catch(() => null) : null
      const metaAudienceResult = metaAudienceResponse ? await metaAudienceResponse.json().catch(() => null) : null

      // ⬅️ NEW: parse the extra visuals' responses
      const overviewKpiResult = overviewKpiResponse ? await overviewKpiResponse.json().catch(() => null) : null
      const occupancyTrendResult = occupancyTrendResponse ? await occupancyTrendResponse.json().catch(() => null) : null
      const playtimeMixResult = playtimeMixResponse ? await playtimeMixResponse.json().catch(() => null) : null
      const heatmapResult = heatmapResponse ? await heatmapResponse.json().catch(() => null) : null

      setReport(result.data)
      setMetaDashboard(metaDashboardResult?.success ? metaDashboardResult.data : null)
      setMetaAudienceSummary(metaAudienceResult?.success ? metaAudienceResult.data : null)

      // ⬅️ NEW: commit the extra visuals' state
      setOverviewKpi(overviewKpiResult?.success ? overviewKpiResult.data : null)
      setOccupancyTrend(occupancyTrendResult?.success && Array.isArray(occupancyTrendResult.data) ? occupancyTrendResult.data : [])
      // ⬅️ NEW: actual-data playtime + heatmap (no more ML)
      setPlaytimeMix(
        playtimeMixResult?.success
          ? {
              sessionByTime: Array.isArray(playtimeMixResult.data?.sessionByTime)
                ? playtimeMixResult.data.sessionByTime
                : [],
              totalSessions: Number(playtimeMixResult.data?.totalSessions || 0),
              totalCustomers: Number(playtimeMixResult.data?.totalCustomers || 0),
            }
          : null
      )
      setHeatmapSummary(heatmapResult?.success ? (heatmapResult.data as HeatmapSummary) : null)

      setLastRefreshedAt(new Date().toISOString())
    } catch (loadError) {
      setReport(null)
      setMetaDashboard(null)
      setMetaAudienceSummary(null)
      setOverviewKpi(null) // ⬅️ NEW
      setOccupancyTrend([]) // ⬅️ NEW
      setPlaytimeMix(null) // ⬅️ NEW
      setHeatmapSummary(null) // ⬅️ NEW
      setError(loadError instanceof Error ? loadError.message : "Management report could not be loaded.")
    } finally {
      setIsLoading(false)
    }
  }, [bookingType, courtType, endDate, startDate])

  useEffect(() => {
    if (isApplyingDefaultRange) return
    void loadReport()
  }, [isApplyingDefaultRange, loadReport])

  const handleExportPresentation = async () => {
    setDownloadConfirmOpen(false)
    setIsExporting(true)

    const toastId = toast.loading(
      "AI sedang menyusun presentasi manajemen dari data nyata...",
      { description: "Proses ini bisa memakan waktu sekitar 30 detik." },
    )

    try {
      const response = await fetch(
        getApiUrl("/operations/management-report/presentation"),
        {
          method: "POST",
          cache: "no-store",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate,
            endDate,
            courtType,
            bookingType,
            theme: selectedTheme,
          }),
        },
      )

      if (!response.ok) {
        let message = "Presentasi gagal dibuat."
        try {
          const result = await response.json()
          message = result.message || message
        } catch {
          /* non-JSON error body */
        }
        throw new Error(message)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      const disposition = response.headers.get("Content-Disposition") || ""
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/)
      link.download = filenameMatch?.[1] || "MAIIN-Gandaria-Management-Report.pdf"
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      toast.dismiss(toastId)
      toast.success("Presentasi manajemen siap", {
        description: `${link.download} telah diunduh. Management dan Operational juga menerima notifikasi dengan file yang bisa dilihat.`,
        duration: 8000,
      })
    } catch (error) {
      toast.dismiss(toastId)
      toast.error("Gagal membuat presentasi", {
        description:
          error instanceof Error
            ? error.message
            : "Presentasi tidak dapat dibuat saat ini. Coba lagi.",
        duration: 6000,
      })
    } finally {
      setIsExporting(false)
    }
  }

  const breakdownRows = report
    ? Object.entries(report.bookingTypeBreakdown).map(([label, value]) => ({ label, value }))
    : []

  const reportBadges = report
    ? [
        { label: "Revenue", value: formatCurrency(report.summary.totalRevenue), icon: Wallet, tone: "emerald" as const },
        { label: "Bookings", value: report.summary.totalBookings.toLocaleString("en-US"), icon: Users, tone: "sky" as const },
        { label: "Occupancy", value: `${report.summary.occupancyRate}%`, icon: Target, tone: "amber" as const },
        { label: "Avg Value", value: formatCurrency(report.summary.avgRevenuePerBooking), icon: TrendingUp, tone: "rose" as const },
      ]
    : []

  const toneStyles: Record<"emerald" | "sky" | "amber" | "rose", string> = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  }

  const reportPeriodLabel = report?.period.label || "-"
  const comparisonPeriodLabel = report?.comparisonPeriod.label || "-"
  const generatedAtLabel = report
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.generatedAt))
    : "-"
  const refreshedAtLabel = lastRefreshedAt
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(lastRefreshedAt))
    : "-"

  const courtPerformanceRows = report?.courtTypePerformance ?? []
  const sessionOccupancyRows = report?.sessionOccupancy ?? []
  const segmentContributionRows = useMemo(
    () => report?.segmentContribution ?? [],
    [report?.segmentContribution]
  )
  const comparisonCards = (() => {
    if (!report?.comparison) return []

    return [
      {
        label: "Revenue",
        current: formatCurrency(report.comparison.revenue.current),
        previous: formatCurrency(report.comparison.revenue.previous),
        change: formatPercent(report.comparison.revenue.changePct),
        tone: "emerald" as const,
        icon: Wallet,
      },
      {
        label: "Bookings",
        current: report.comparison.bookings.current.toLocaleString("en-US"),
        previous: report.comparison.bookings.previous.toLocaleString("en-US"),
        change: formatPercent(report.comparison.bookings.changePct),
        tone: "sky" as const,
        icon: Users,
      },
      {
        label: "Occupancy",
        current: `${report.comparison.occupancyRate.current.toFixed(1)}%`,
        previous: `${report.comparison.occupancyRate.previous.toFixed(1)}%`,
        change: formatPercent(report.comparison.occupancyRate.changePct),
        tone: "amber" as const,
        icon: Target,
      },
      {
        label: "Avg Booking Value",
        current: formatCurrency(report.comparison.avgRevenuePerBooking.current),
        previous: formatCurrency(report.comparison.avgRevenuePerBooking.previous),
        change: formatPercent(report.comparison.avgRevenuePerBooking.changePct),
        tone: "rose" as const,
        icon: TrendingUp,
      },
    ]
  })()

  const metaInsightSummary = (() => {
    if (!metaDashboard?.hasData && !metaAudienceSummary?.hasData) return null

    const lines = []

    if (metaDashboard?.hasData) {
      const { totalReach, engagementRate, shareRate } = metaDashboard.summary
      lines.push(
        totalReach != null && engagementRate != null && shareRate != null
          ? `Meta reach is ${totalReach.toLocaleString("en-US")} with ${engagementRate.toFixed(1)}% engagement and ${shareRate.toFixed(1)}% share rate.`
          : "Stored Meta performance data is available, but reach or rate metrics are unavailable for this reporting period."
      )
    }

    if (metaAudienceSummary?.hasData) {
      lines.push(
        `Audience is led by ${metaAudienceSummary.summary.dominantGender.toLowerCase()} followers in the ${metaAudienceSummary.summary.dominantAgeGroup} age band, especially around ${metaAudienceSummary.summary.topCity}.`
      )
      lines.push(metaAudienceSummary.personaInsight)
    }

    return lines
  })()

  // ⬅️ NEW: derived chart data for Play-Time Preference Mix (now from actual data, not ML)
  const playtimeChart = useMemo(() => buildPlaytimeChart(playtimeMix), [playtimeMix])
  const playtimeChartTotal = useMemo(() => playtimeChart.reduce((sum, item) => sum + item.value, 0), [playtimeChart])
  const playtimeLegend = useMemo(
    () =>
      playtimeChart.map((item) => ({
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
    if (!dominantPlaytime || !playtimeMix) {
      return "No historical play-time preference insight is available yet."
    }
    return `Most bookings are in the ${dominantPlaytime.name} slot with ${formatPercent(dominantPlaytime.percentage).replace("+", "")} of all bookings.`
  }, [dominantPlaytime, playtimeMix])

  // ⬅️ NEW: derived chart data for Customer Value Segments
  const segmentChart = useMemo(
    () =>
      segmentContributionRows.map((item, index) => ({
        name: item.segmentName,
        value: item.customerCount,
        color: CUSTOMER_SEGMENT_COLORS[item.segmentName] || chartColors[index % chartColors.length],
      })),
    [segmentContributionRows]
  )
  const segmentChartTotal = useMemo(() => segmentChart.reduce((sum, item) => sum + Number(item.value || 0), 0), [segmentChart])
  const segmentLegend = useMemo(
    () =>
      segmentChart.map((item) => ({
        ...item,
        percentage: segmentChartTotal > 0 ? (item.value / segmentChartTotal) * 100 : 0,
      })),
    [segmentChart, segmentChartTotal]
  )

  // ⬅️ NEW: average occupancy line for the Occupancy Trend chart
  const occupancyAverageRate = useMemo(() => {
    if (occupancyTrend.length === 0) return 0
    const totalBooked = occupancyTrend.reduce((sum, point) => sum + point.bookedSessions, 0)
    const totalAvailable = occupancyTrend.reduce((sum, point) => sum + point.availableSessions, 0)
    return totalAvailable > 0 ? (totalBooked / totalAvailable) * 100 : 0
  }, [occupancyTrend])

  // ⬅️ NEW: shared odd-day X-axis tick rule for daily ranges (identical for
  // Revenue Trend and Occupancy Trend so their timelines stay visually aligned).
  // Undefined in monthly mode, so the default month labels are kept untouched.
  const revenueTrendXTicks = useMemo(
    () => getDailyXTicks(report?.revenueTrend ?? []),
    [report?.revenueTrend]
  )
  const occupancyTrendXTicks = useMemo(
    () => getDailyXTicks(occupancyTrend),
    [occupancyTrend]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Management Report</h1>
          <p className="text-base text-muted-foreground">
            Executive summary, KPI highlights, occupancy insight, revenue insight, and segmentation context for MaiinSight.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <span className="rounded-full border border-border bg-secondary/40 px-3 py-1.5">Report period: {reportPeriodLabel}</span>
            <span className="rounded-full border border-border bg-secondary/40 px-3 py-1.5">Generated at: {generatedAtLabel}</span>
            {comparisonPeriodLabel !== "-" ? (
              <span className="rounded-full border border-border bg-secondary/40 px-3 py-1.5">Comparison: {comparisonPeriodLabel}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm backdrop-blur no-print">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Report filters</p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="group relative min-w-[132px]">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors group-focus-within:text-foreground">
                Start
              </span>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-10 w-full rounded-lg border border-border/70 bg-background/90 pl-[3.6rem] pr-2.5 text-xs shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <div className="group relative min-w-[132px]">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors group-focus-within:text-foreground">
                End
              </span>
              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-10 w-full rounded-lg border border-border/70 bg-background/90 pl-[3.2rem] pr-2.5 text-xs shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <Select value={courtType} onValueChange={setCourtType}>
              <SelectTrigger className="h-10 w-[150px] rounded-lg border border-border/70 bg-background/90 px-3 text-xs shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:border-primary focus:ring-2 focus:ring-primary/15">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Court
                  </span>
                  <SelectValue placeholder="Court" />
                </div>
              </SelectTrigger>
              <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg">
                <SelectItem value="all">All courts</SelectItem>
                <SelectItem value="mini_soccer">Mini Soccer</SelectItem>
                <SelectItem value="basketball">Basketball</SelectItem>
              </SelectContent>
            </Select>
            <Select value={bookingType} onValueChange={setBookingType}>
              <SelectTrigger className="h-10 w-[170px] rounded-lg border border-border/70 bg-background/90 px-3 text-xs shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:border-primary focus:ring-2 focus:ring-primary/15">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Booking
                  </span>
                  <SelectValue placeholder="Booking" />
                </div>
              </SelectTrigger>
              <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg">
                <SelectItem value="all">All booking types</SelectItem>
                <SelectItem value="GeloraApp Booking">GeloraApp Booking</SelectItem>
                <SelectItem value="Manual/Walk-in">Manual/Walk-in</SelectItem>
                <SelectItem value="Internal">Internal</SelectItem>
                <SelectItem value="Tutup/Maintenance">Tutup/Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <div className="inline-flex h-10 items-center rounded-lg border border-border/70 bg-background/80 p-1 shadow-sm">
              <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5 text-[11px]" onClick={() => setDownloadConfirmOpen(true)} disabled={!report?.hasData}>
                <Download className="h-3 w-3" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={downloadConfirmOpen} onOpenChange={setDownloadConfirmOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Export management report (PDF presentasi)
            </DialogTitle>
            <DialogDescription>
              AI (Gemini) akan menyusun presentasi landscape berisi data nyata periode{" "}
              <span className="font-medium text-foreground">
                {startDate ? new Date(`${startDate}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                {" – "}
                {endDate ? new Date(`${endDate}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}
              </span>{" "}
              lengkap dengan insight interpretatif, rencana aksi, dan slide penutup kontak MAIIN Gandaria.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Pilih tema presentasi
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {PRESENTATION_THEMES.map((theme) => {
                const selected = selectedTheme === theme.id
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition ${
                      selected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border/70 bg-background/60 hover:border-primary/40"
                    }`}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border"
                      style={{
                        background: `linear-gradient(135deg, ${theme.swatch[0]} 50%, ${theme.swatch[1]} 50%)`,
                      }}
                      aria-hidden
                    >
                      <span
                        className="h-4 w-1 rounded-full"
                        style={{ backgroundColor: theme.swatch[1] }}
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">
                        {theme.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                        {theme.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <DialogFooter className="mt-1">
            <Button variant="outline" onClick={() => setDownloadConfirmOpen(false)} disabled={isExporting}>
              Cancel
            </Button>
            <Button onClick={handleExportPresentation} disabled={isExporting || !report?.hasData}>
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyiapkan presentasi...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Generate &amp; Download PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ⬇️ PRINT-ONLY LAYOUT — everything the PDF should contain lives in here */}
      <div className="print-report hidden">
        {report?.hasData ? (
          <div className="space-y-6 p-8 text-slate-900">
            <div className="border-b border-emerald-200 pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">MaiinSight</p>
              <h1 className="mt-2 text-3xl font-bold">Management Report</h1>
              <p className="mt-2 text-sm text-slate-600">
                {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.generatedAt))}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.12em]">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700">Report period: {reportPeriodLabel}</span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sky-700">Comparison period: {comparisonPeriodLabel}</span>
              </div>
            </div>

            {/* ⬅️ NEW: KPI summary cards (from Overview) */}
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Occupancy Rate</p>
                <p className="text-xl font-bold">{overviewKpi ? `${overviewKpi.occupancyRate}%` : `${report.summary.occupancyRate}%`}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Revenue by Play Date</p>
                <p className="text-xl font-bold">{formatCurrency(overviewKpi?.totalRevenue ?? report.summary.totalRevenue)}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Lowest-Demand Session</p>
                <p className="text-xl font-bold">{overviewKpi?.lowSessionLabel || "-"}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Peak Session Revenue</p>
                <p className="text-xl font-bold">{overviewKpi?.peakSessionLabel || "-"}</p>
                <p className="text-xs text-muted-foreground">
                  {(overviewKpi?.peakSessionRevenue || 0) > 0 ? formatCurrency(overviewKpi?.peakSessionRevenue || 0) : ""}
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="print-section rounded-2xl border border-border p-5">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Executive Summary</h2>
                <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  <p>{report.insights.executiveSummary}</p>
                  <p>{report.insights.occupancyInsight}</p>
                  <p>{report.insights.revenueInsight}</p>
                  <p>{report.insights.segmentationInsight}</p>
                </div>
              </div>
              <div className="print-section rounded-2xl border border-border p-5">
              
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Recommendations</h2>
                <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  {report.insights.recommendations.map((recommendation) => (
                    <div key={recommendation} className="rounded-lg border border-border/70 p-3">
                      {recommendation}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Executive Summary
                  <InfoTooltip content="Presentation-ready summary for management review." />
                </CardTitle>
                <CardDescription>Presentation-ready summary for management review</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl border border-border bg-gradient-to-br from-background to-secondary/20 p-4 text-foreground shadow-sm">
                  <p className="leading-6">{report.insights.executiveSummary}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-amber-900 shadow-sm">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em]">Occupancy</p>
                    <p className="leading-6">{report.insights.occupancyInsight}</p>
                  </div>
                  <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-sky-900 shadow-sm">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em]">Revenue</p>
                    <p className="leading-6">{report.insights.revenueInsight}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-900 shadow-sm">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em]">Segmentation</p>
                  <p className="leading-6">{report.insights.segmentationInsight}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Recommendations / Notes
                  <InfoTooltip content="Business-friendly follow-up suggestions based on the selected period." />
                </CardTitle>
                <CardDescription>Business-friendly follow-up suggestions based on the selected period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {report.insights.recommendations.map((recommendation) => (
                  <div key={recommendation} className="flex items-start gap-3 rounded-2xl border border-border bg-gradient-to-br from-background to-secondary/20 p-4 shadow-sm">
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="leading-6 text-foreground">{recommendation}</span>
                  </div>
                ))}
                <div className="rounded-2xl border border-border bg-secondary/20 p-3 text-xs">
                  Generated at {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.generatedAt))}
                </div>
              </CardContent>
            </Card>
          </div>
            {/* ⬅️ NEW: Occupancy Trend, fixed-size Recharts (no ResponsiveContainer) so it renders even hidden→visible */}
            <div className="print-section rounded-2xl border border-border p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Occupancy Trend (per date)</h2>
              {occupancyTrend.length > 0 ? (
                <div className="mt-3 flex justify-center">
                  <AreaChart width={700} height={260} data={occupancyTrend}>
                    <defs>
                      <linearGradient id="printOccupancyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" ticks={occupancyTrendXTicks} interval={occupancyTrendXTicks ? 0 : undefined} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} unit="%" />
                    <RechartsTooltip formatter={(value: number) => [`${value}%`, "Occupancy"]} />
                  <Area type="monotone" dataKey="rate" stroke="var(--chart-1)" fill="url(#printOccupancyGradient)" strokeWidth={2}>
  <LabelList dataKey="rate" position="top" formatter={(value: number) => `${value}%`} style={{ fontSize: 10, fill: "var(--foreground)" }} />
</Area>
                  </AreaChart>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No occupancy trend data available for this period.</p>
              )}
            </div>

            <div className="print-section rounded-2xl border border-border p-5">
  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Revenue by Play Date Trend</h2>
  {report.revenueTrend.length > 0 ? (
    <div className="mt-3 flex justify-center">
      <AreaChart width={700} height={280} data={report.revenueTrend} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="printRevenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" ticks={revenueTrendXTicks} interval={revenueTrendXTicks ? 0 : undefined} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
        <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}M`} />
        <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" fill="url(#printRevenueGradient)" strokeWidth={2}>
          <LabelList
            dataKey="revenue"
            position="top"
            formatter={(value: number) => `${Math.round(value / 1000000)}M`}
            style={{ fontSize: 10, fill: "var(--foreground)" }}
          />
        </Area>
      </AreaChart>
    </div>
  ) : (
    <p className="mt-2 text-sm text-muted-foreground">No revenue trend data available for this period.</p>
  )}
</div>
<div className="print-section rounded-2xl border border-border p-5">
  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Booking Mix</h2>
  {breakdownRows.length > 0 ? (
    <div className="mt-3 flex justify-center">
      <BarChart width={700} height={260} data={breakdownRows}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
        <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} allowDecimals={false} />
        <RechartsTooltip formatter={(value: number) => [`${value} bookings`, "Bookings"]} />
        <Bar dataKey="value" name="Bookings" fill="var(--chart-2)" radius={[6, 6, 0, 0]} barSize={64}>
  <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: "var(--foreground)", fontWeight: 600 }} />
</Bar>
      </BarChart>
    </div>
  ) : (
    <p className="mt-2 text-sm text-muted-foreground">No booking type breakdown available for this period.</p>
  )}
</div>

            {/* ⬅️ NEW: Play-Time Preference Mix, fixed-size Recharts */}
            <div className="print-section rounded-2xl border border-border p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Play-Time Preference Mix</h2>
              <p className="mt-1 text-xs text-muted-foreground">{playtimeBehaviorInsight}</p>
              {playtimeChart.length > 0 ? (
                <div className="mt-3 flex justify-center">
                  <BarChart width={700} height={260} data={playtimeChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip formatter={(value: number) => [`${value} sessions`, "Historical demand"]} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={64}>
  {playtimeChart.map((entry) => (
    <Cell key={entry.name} fill={entry.color} />
  ))}
  <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: "var(--foreground)", fontWeight: 600 }} />
</Bar>
                  </BarChart>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No play-time preference data available yet.</p>
              )}
            </div>

            {/* ⬅️ NEW: Empty Slot Heatmap — plain CSS grid component, safe inside a hidden section */}
            <HeatmapGrid heatmapSummary={heatmapSummary} />

            {/* ⬅️ NEW: Customer Value Segments, fixed-size Recharts + table */}
            <div className="print-section rounded-2xl border border-border p-5">
  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Customer Value Segments</h2>
  {segmentChart.length > 0 ? (
    <div className="mt-3 flex justify-center">
      <BarChart width={700} height={300} data={segmentChart} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
        <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
        <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={64}>
          {segmentChart.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
          <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: "var(--foreground)", fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </div>
  ) : (
    <p className="mt-2 text-sm text-muted-foreground">No segmentation data available yet.</p>
  )}
</div>
</div>
        ) : null}
      </div>


      {error ? (
        <BusinessErrorAlert
          title="Report Unavailable"
          message="The management report could not be prepared."
          suggestion="Please review the selected date range and try again. Contact IT Support if the issue continues."
          technicalDetails={error}
        />
      ) : null}

      {isLoading ? (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex min-h-[260px] items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparing management report...
          </CardContent>
        </Card>
      ) : !report || !report.hasData ? (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-600" />
            <div>
              <p className="font-medium">No transaction data is available for this reporting period.</p>
              <p className="text-sm text-muted-foreground">
                Upload a transaction file from Data Center or choose a different date range.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ⬅️ NEW: on-screen KPI cards (mirrors Overview) */}
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
                    <p className="text-3xl font-bold">{overviewKpi ? `${overviewKpi.occupancyRate}%` : `${report.summary.occupancyRate}%`}</p>
                    {overviewKpi ? (
                      <p className={`mt-2 flex items-center gap-1 text-xs ${overviewKpi.occupancyChange < 0 ? "text-destructive" : "text-primary"}`}>
                        {overviewKpi.occupancyChange < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                        {`${overviewKpi.occupancyChange >= 0 ? "+" : ""}${overviewKpi.occupancyChange}% vs previous period`}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">No comparison available</p>
                    )}
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
                    <p className="text-3xl font-bold">{formatCurrency(overviewKpi?.totalRevenue ?? report.summary.totalRevenue)}</p>
                    {overviewKpi ? (
                      <p className={`mt-2 flex items-center gap-1 text-xs ${overviewKpi.revenueChange < 0 ? "text-destructive" : "text-primary"}`}>
                        {overviewKpi.revenueChange < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                        {`${overviewKpi.revenueChange >= 0 ? "+" : ""}${overviewKpi.revenueChange}% vs previous period`}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">No comparison available</p>
                    )}
                  </div>
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitleTooltip
                  title="Lowest-Demand Session"
                  tooltip="The time slot with the fewest bookings — a candidate for promotional pricing."
                  className="text-sm font-medium text-muted-foreground"
                />
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xl font-bold">{overviewKpi?.lowSessionLabel || "No data"}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Lowest booking volume among all sessions</p>
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
                      {(overviewKpi?.peakSessionRevenue || 0) > 0 ? formatCurrency(overviewKpi?.peakSessionRevenue || 0) : "No revenue data available"}
                    </p>
                  </div>
                  <Zap className="h-5 w-5 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border bg-gradient-to-br from-emerald-50 via-background to-sky-50 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Meta Signal
                <InfoTooltip content="Reach and audience profile from synced Meta data." />
              </CardTitle>
              <CardDescription>Reach and audience profile from synced Meta data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {metaInsightSummary ? (
                metaInsightSummary.map((line) => (
                  <div key={line} className="rounded-2xl border border-border bg-card/90 p-4 text-foreground shadow-sm">
                    <p className="leading-6">{line}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background/70 p-4 text-foreground">
                  <p className="font-medium">No Meta data is available for this period.</p>
                  <p className="mt-1 text-sm text-muted-foreground">Sync InstaSight first to include reach and audience signals in the management report.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle>
                  <span className="flex items-center gap-2">
                    Revenue Trend
                    <InfoTooltip content="Revenue progression across the selected reporting period." />
                  </span>
                </CardTitle>
                <CardDescription>Revenue progression across the selected reporting period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={report.revenueTrend}>
                      <defs>
                        <linearGradient id="reportRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" ticks={revenueTrendXTicks} interval={revenueTrendXTicks ? 0 : undefined} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}M`} />
                      <RechartsTooltip formatter={(value: number) => [formatCurrency(value), "Revenue"]} />
                      <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" fill="url(#reportRevenueGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* ⬅️ NEW: Occupancy Trend (on-screen, ResponsiveContainer since it's always visible) */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle>
                  <span className="flex items-center gap-2">
                    Occupancy Trend (per date)
                    <InfoTooltip content="Court hours booked per day across the selected reporting period." />
                  </span>
                </CardTitle>
                <CardDescription>Court hours booked per day across the selected reporting period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  {occupancyTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={occupancyTrend}>
                        <defs>
                          <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="label" ticks={occupancyTrendXTicks} interval={occupancyTrendXTicks ? 0 : undefined} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} unit="%" />
                        <RechartsTooltip formatter={(value: number) => [`${value}%`, "Occupancy"]} />
                        <Area type="monotone" dataKey="rate" stroke="var(--chart-1)" fill="url(#occupancyGradient)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                      No occupancy trend data is available for the selected period.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle>
                  <span className="flex items-center gap-2">
                    Booking Type Distribution
                    <InfoTooltip content="Booking type distribution for the selected reporting period." />
                  </span>
                </CardTitle>
                <CardDescription>Booking type distribution for the selected reporting period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={breakdownRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} allowDecimals={false} />
                      <RechartsTooltip formatter={(value: number) => [`${value} bookings`, "Bookings"]} />
                      <Legend />
                      <Bar dataKey="value" name="Bookings" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* ⬅️ NEW: Play-Time Preference Mix (on-screen) */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle>
                  <span className="flex items-center gap-2">
                    Play-Time Preference Mix
                    <InfoTooltip content="Booking time distribution (morning / afternoon / evening / night) for the selected period." />
                  </span>
                </CardTitle>
                <CardDescription>{playtimeBehaviorInsight}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  {playtimeChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={playtimeChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} allowDecimals={false} />
                        <RechartsTooltip formatter={(value: number) => [`${value} sessions`, "Historical demand"]} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {playtimeChart.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                      No play-time preference data available yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ⬅️ NEW: Empty Slot Heatmap (on-screen) — actual data, not ML */}
          <HeatmapGrid heatmapSummary={heatmapSummary} />

          {/* ⬅️ NEW: Customer Value Segments (on-screen) */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
                <CardTitle>
                  <span className="flex items-center gap-2">
                    Customer Value Segments
                    <InfoTooltip content="Customer value segmentation from the latest RFM clustering run (same source as the Segments page)." />
                  </span>
                </CardTitle>
              <CardDescription>
                {segmentChartTotal > 0
                  ? `${segmentChartTotal.toLocaleString("en-US")} customers across ${segmentChart.length} segments`
                  : "No segmentation result yet. Run Machine Learning from Data Center to generate customer segments."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {segmentChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={segmentChart} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                      <RechartsTooltip formatter={(value: number) => [`${value} customers`, "Customer Count"]} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={56}>
                        {segmentChart.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                    No customer segmentation result yet.
                  </div>
                )}
              </div>
              {segmentLegend.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {segmentLegend.map((segment) => (
                    <div key={segment.name} className="rounded-xl border border-border bg-secondary/20 p-3">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
                        <p className="text-sm font-medium text-slate-900">{segment.name}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {segment.value.toLocaleString("en-US")} customers ({formatPercent(segment.percentage).replace("+", "")})
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

        </>
      )}
    </div>
  )
}

