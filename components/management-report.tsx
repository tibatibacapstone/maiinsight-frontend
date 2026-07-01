"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { BusinessErrorAlert } from "@/components/business-error-alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getApiUrl } from "@/lib/api"
import { getAuthHeaders } from "@/lib/roles"
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
  ChevronDown,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"

interface ComparisonMetric {
  current: number
  previous: number
  changePct: number | null
}

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
  revenue: number
  bookings: number
  revenueShare: number
  bookingShare: number
}

interface MetaDashboardData {
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

const today = new Date()
const defaultEndDate = today.toISOString().slice(0, 10)
const defaultStartDate = new Date(today.getFullYear(), today.getMonth(), 1)
  .toISOString()
  .slice(0, 10)

const formatCurrency = (value: number) => `IDR ${Math.round(value).toLocaleString("id-ID")}`

const formatPercent = (value: number | null | undefined) => (value === null || value === undefined ? "-" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`)

const formatDateInput = (value: Date) => value.toISOString().slice(0, 10)

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
  const [startDate, setStartDate] = useState(defaultStartDate)
  const [endDate, setEndDate] = useState(defaultEndDate)
  const [courtType, setCourtType] = useState("all")
  const [bookingType, setBookingType] = useState("all")
  const [report, setReport] = useState<ReportResponse["data"] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isApplyingDefaultRange, setIsApplyingDefaultRange] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadConfirmOpen, setDownloadConfirmOpen] = useState(false)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null)
  const [metaDashboard, setMetaDashboard] = useState<MetaDashboardData | null>(null)
  const [metaAudienceSummary, setMetaAudienceSummary] = useState<MetaAudienceSummary | null>(null)

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
          const current = new Date()
          current.setDate(0)
          setStartDate(formatDateInput(new Date(current.getFullYear(), current.getMonth(), 1)))
          setEndDate(formatDateInput(current))
          return
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

      const [reportResponse, metaDashboardResponse, metaAudienceResponse] = await Promise.all([
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
      ])

      const result: ReportResponse | null = await reportResponse.json().catch(() => null)
      if (!reportResponse.ok || !result?.success || !result.data) {
        throw new Error(result?.message || "Management report could not be loaded.")
      }

      const metaDashboardResult = metaDashboardResponse ? await metaDashboardResponse.json().catch(() => null) : null
      const metaAudienceResult = metaAudienceResponse ? await metaAudienceResponse.json().catch(() => null) : null

      setReport(result.data)
      setMetaDashboard(metaDashboardResult?.success ? metaDashboardResult.data : null)
      setMetaAudienceSummary(metaAudienceResult?.success ? metaAudienceResult.data : null)
      setLastRefreshedAt(new Date().toISOString())
    } catch (loadError) {
      setReport(null)
      setMetaDashboard(null)
      setMetaAudienceSummary(null)
      setError(loadError instanceof Error ? loadError.message : "Management report could not be loaded.")
    } finally {
      setIsLoading(false)
    }
  }, [bookingType, courtType, endDate, startDate])

  useEffect(() => {
    if (isApplyingDefaultRange) return
    void loadReport()
  }, [isApplyingDefaultRange, loadReport])

  const handleConfirmDownload = () => {
    setDownloadConfirmOpen(false)
    window.setTimeout(() => window.print(), 50)
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
  const segmentContributionRows = report?.segmentContribution ?? []
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
      lines.push(
        `Meta reach is ${metaDashboard.summary.totalReach.toLocaleString("en-US")} with ${metaDashboard.summary.engagementRate.toFixed(1)}% engagement and ${metaDashboard.summary.shareRate.toFixed(1)}% share rate.`
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

      <div className="rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm backdrop-blur">
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
            <div className="group relative min-w-[128px]">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors group-focus-within:text-foreground">
                Court
              </span>
              <select
                value={courtType}
                onChange={(event) => setCourtType(event.target.value)}
                className="h-10 w-full appearance-none rounded-lg border border-border/70 bg-background/90 pl-[3.2rem] pr-8 text-xs font-medium text-foreground shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                <option value="all">All courts</option>
                <option value="mini_soccer">Mini Soccer</option>
                <option value="basketball">Basketball</option>
              </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform group-hover:translate-y-[-45%] group-focus-within:text-foreground" />
            </div>
            <div className="group relative min-w-[150px]">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors group-focus-within:text-foreground">
                Booking
              </span>
              <select
                value={bookingType}
                onChange={(event) => setBookingType(event.target.value)}
                className="h-10 w-full appearance-none rounded-lg border border-border/70 bg-background/90 pl-[4.2rem] pr-8 text-xs font-medium text-foreground shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                <option value="all">All booking types</option>
                <option value="regular_booking">Regular booking</option>
                <option value="member_internal_booking">Member / internal</option>
                <option value="other">Other</option>
              </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform group-hover:translate-y-[-45%] group-focus-within:text-foreground" />
            </div>
            <div className="inline-flex h-10 items-center rounded-xl border border-border/70 bg-background/80 p-1 shadow-sm">
              <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5 text-[11px]" onClick={() => setDownloadConfirmOpen(true)} disabled={!report?.hasData}>
                <Download className="h-3 w-3" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={downloadConfirmOpen} onOpenChange={setDownloadConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export management report as PDF?</AlertDialogTitle>
            <AlertDialogDescription>
              This will open the printable report layout so you can save it as a PDF from the browser print dialog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDownload}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-emerald-700">Revenue</p>
                <p className="mt-2 text-xl font-semibold">{formatCurrency(report.summary.totalRevenue)}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-emerald-700">Bookings</p>
                <p className="mt-2 text-xl font-semibold">{report.summary.totalBookings.toLocaleString("en-US")}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-emerald-700">Occupancy</p>
                <p className="mt-2 text-xl font-semibold">{report.summary.occupancyRate}%</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-emerald-700">Avg Booking Value</p>
                <p className="mt-2 text-xl font-semibold">{formatCurrency(report.summary.avgRevenuePerBooking)}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border p-5">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Executive Summary</h2>
                <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  <p>{report.insights.executiveSummary}</p>
                  <p>{report.insights.occupancyInsight}</p>
                  <p>{report.insights.revenueInsight}</p>
                  <p>{report.insights.segmentationInsight}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border p-5">
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

            <div className="rounded-2xl border border-border p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Revenue Trend</h2>
              <table className="mt-3 w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-emerald-700">
                    <th className="py-2 font-medium">Label</th>
                    <th className="py-2 font-medium">Revenue</th>
                    <th className="py-2 font-medium">Bookings</th>
                  </tr>
                </thead>
                <tbody>
                  {report.revenueTrend.map((row) => (
                    <tr key={row.key} className="border-b border-border/70">
                      <td className="py-2">{row.label}</td>
                      <td className="py-2">{formatCurrency(row.revenue)}</td>
                      <td className="py-2">{row.bookings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          <div className="grid gap-4 lg:grid-cols-4">
            {reportBadges.map((item) => {
              const Icon = item.icon
              return (
                <Card key={item.label} className="group border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <Badge variant="outline" className={`rounded-full px-3 py-1 ${toneStyles[item.tone]}`}>
                          <Icon className="mr-1 h-3.5 w-3.5" />
                          {item.label}
                        </Badge>
                        <p className="text-2xl font-semibold tracking-tight">{item.value}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.label === "Revenue" && "Revenue in the selected reporting period"}
                          {item.label === "Bookings" && "Booking records included in this report"}
                          {item.label === "Occupancy" && "Court-hour utilization for the selected period"}
                          {item.label === "Avg Value" && "Average revenue per booking"}
                        </p>
                      </div>
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${toneStyles[item.tone]}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {comparisonCards.map((item) => {
              const Icon = item.icon
              return (
                <Card key={item.label} className="border-border bg-card shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <Badge variant="outline" className={`rounded-full px-3 py-1 ${toneStyles[item.tone]}`}>
                          <Icon className="mr-1 h-3.5 w-3.5" />
                          {item.label}
                        </Badge>
                        <p className="text-2xl font-semibold tracking-tight">{item.current}</p>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>Previous period: {item.previous}</p>
                          <p>{item.change ? `Change: ${item.change} vs previous period` : "Previous period comparison is not available."}</p>
                        </div>
                      </div>
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${toneStyles[item.tone]}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card className="border-border bg-gradient-to-br from-emerald-50 via-background to-sky-50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Meta Signal
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
                <CardTitle>Revenue Trend</CardTitle>
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
                      <XAxis dataKey="label" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}M`} />
                      <RechartsTooltip formatter={(value: number) => [formatCurrency(value), "Revenue"]} />
                      <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" fill="url(#reportRevenueGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle>Booking Mix</CardTitle>
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
          </div>


          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Executive Summary
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
        </>
      )}
    </div>
  )
}


















