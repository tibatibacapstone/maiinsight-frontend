"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  BrainCircuit,
  ChevronDown,
  Info,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react"
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"

import { getApiUrl } from "@/lib/api"
import { getHeatmapCellVisual, getHeatmapTooltipLines } from "@/lib/heatmap-cell"
import {
  buildPeriodSearchParams,
  normalizeMonthNumber,
  type PeriodType,
} from "@/lib/period-filter"
import { getAuthHeaders } from "@/lib/roles"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  KpiCard,
  CardTitleTooltip,
  StateCard,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import {
  CUSTOMER_SEGMENT_COLORS,
  SEGMENTATION_UPDATED_EVENT,
  fetchSegmentationCustomers,
  fetchSegmentationLatest,
  fetchSegmentationSummary,
  sortClusterProfiles,
  type ClusterProfile,
  type CustomerRfmScore,
  type SegmentationCustomersData,
  type SegmentationLatestData,
  type SegmentationSummaryData,
} from "@/lib/segmentation"

interface OverviewKpiData {
  occupancyRate: number
  occupancyChange: number
  totalRevenue: number
  revenueChange: number
  lowSessionLabel: string
  lowSessionCount: number
  peakSessionLabel: string
  peakSessionRevenue: number
  totalBookedSessions: number
  availableSessions: number
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
    emptySessions?: number
    emptySlots?: number
    totalPossibleSlots?: number
    occupancyRate?: number | null
    emptyRate?: number
    internalRate?: number
  }>
  mostEmptySlot: {
    dayLabel: string
    hourLabel: string
    sessionLabel: string
    sessionCount: number
  } | null
}

const formatNumber = (value: number | null | undefined, maximumFractionDigits = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-"

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits === 0 ? 0 : 0,
  }).format(value)
}

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "Rp 0"

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

const formatPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-"
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value)}%`
}

const formatChange = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-"

  const prefix = value > 0 ? "+" : ""
  return `${prefix}${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value)}%`
}

const formatRunDate = (value?: string | null) => {
  if (!value) return "No run yet"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

const buildBusinessSegmentationMessage = (latest: SegmentationLatestData | null) => {
  if (!latest?.selectedK) {
    return "No segment results are available yet. Run ML from Data Center to generate customer groups."
  }

  if (
    latest.bestSilhouetteK !== null &&
    latest.bestSilhouetteK !== undefined &&
    latest.bestSilhouetteK !== latest.selectedK
  ) {
    return "This is the business-facing segment setup used for day-to-day marketing decisions."
  }

  return latest.selectionReason || "This is the production-facing customer segment view."
}

const buildSegmentBusinessSummary = (segmentName: string, description?: string | null) => {
  const summaryMap: Record<string, string> = {
    "Prime Players": "High-value customers worth protecting with priority treatment and loyalty perks.",
    "Routine Players": "Consistent high-frequency customers with stable contribution but lower overall value than Prime Players.",
    "Growth Players": "Promising customers who may spend more with the right nudge and follow-up.",
    "Re-Engagement Players": "Inactive or low-frequency customers who need a simple reactivation push.",
  }

  return summaryMap[segmentName] || description || "This segment reflects a distinct booking pattern and customer value profile."
}

const buildSegmentActionContext = (segmentName: string, recommendedAction?: string | null) => {
  const actionMap: Record<string, string> = {
    "Prime Players": "Use retention offers, VIP treatment, and priority booking reminders.",
    "Routine Players": "Maintain engagement with frequency-based loyalty perks, membership upgrades, and consistent booking packages.",
    "Growth Players": "Push follow-up campaigns, bundles, and repeat-booking incentives.",
    "Re-Engagement Players": "Send a simple reactivation message and make it easy to book again.",
  }

  return recommendedAction || actionMap[segmentName] || "Use the segment for targeted follow-up and campaign planning."
}

const EmptyState = () => (
  <StateCard
    state="empty"
    title="No customer segmentation result yet."
    description="Run ML from Data Center to generate customer segments."
    icon={BrainCircuit}
  />
)

export const HeatmapGrid = ({ heatmapSummary }: { heatmapSummary: HeatmapSummary | null }) => {
  const slots = heatmapSummary?.slots || []
  const mostEmptySlot = heatmapSummary?.mostEmptySlot
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const hours = Array.from(new Set(slots.map((slot) => slot.startHour)))

  if (hours.length === 0) {
    return (
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitleTooltip title="Empty Slot Heatmap" tooltip="No empty slot pattern available yet." />
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-amber-50 to-white p-4 text-sm text-orange-900/80">
            Waiting for playtime data.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitleTooltip title="Empty Slot Heatmap" tooltip={mostEmptySlot
              ? `${mostEmptySlot.dayLabel} ${mostEmptySlot.hourLabel} has the most empty bookable slots in the selected period.`
              : "No empty slot pattern available yet."} />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[900px] rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-amber-50 to-white p-4">
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `80px repeat(${hours.length}, minmax(18px, 1fr))` }}
            >
              <div />
              {hours.map((hour) => (
                <div key={hour} className="text-[10px] font-medium text-orange-700">
                  {hour}
                </div>
              ))}
                  {days.map((day) => (
                <div key={day} className="contents">
                  <div className="text-xs font-medium text-orange-900">{day}</div>
                  {hours.map((hour) => {
                    const slot = slots.find((item) => item.day_short === day && item.startHour === hour)
                    const emptySlots = slot?.emptySlots ?? slot?.emptySessions ?? slot?.session_count ?? 0
                    const occupancyRate = slot?.occupancyRate ?? null
                    const internalSessions = slot?.internalSessions ?? 0
                    const blockedSlots = slot?.blockedSlots ?? 0
                    const internalRate = slot?.internalRate ?? 0
                    const visual = getHeatmapCellVisual({ occupancyRate, internalRate })
                    const tooltipLines = getHeatmapTooltipLines({
                      ...slot,
                      emptySlots,
                      occupancyRate,
                      internalSessions,
                      blockedSlots,
                      internalRate,
                    })

                    return (
                      <Tooltip key={`${day}-${hour}`}>
                        <TooltipTrigger asChild>
                          <div
                            className="relative h-4 overflow-hidden rounded-sm border border-orange-200"
                            style={{
                              backgroundColor: `rgba(249, 115, 22, ${visual.orangeAlpha})`,
                            }}
                          >
                            {internalSessions + blockedSlots > 0 && (
                              <span
                                aria-hidden="true"
                                className="absolute inset-y-0 left-0 bg-slate-600"
                                style={{
                                  width: visual.internalWidth,
                                  opacity: visual.internalOpacity,
                                }}
                              />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            {day} {hour}
                          </p>
                          {tooltipLines.map((line) => (
                            <p key={line} className="text-xs text-muted-foreground">
                              {line}
                            </p>
                          ))}
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-orange-200" />
            Low occupancy
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-orange-400" />
            Moderate occupancy
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-orange-600" />
            High occupancy
          </span>
          <span className="text-xs text-muted-foreground">Darker orange = higher occupancy rate</span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-6 overflow-hidden rounded-sm border border-slate-300 bg-orange-200">
              <span className="block h-full w-2/3 bg-slate-600/70" />
            </span>
            Gray coverage: unavailable Internal / blocked slots
          </span>
          <span className="text-xs text-muted-foreground">Gray slots are excluded from bookable capacity</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function SegmentVisualization() {
  const [summaryData, setSummaryData] = useState<SegmentationSummaryData | null>(null)
  const [latestData, setLatestData] = useState<SegmentationLatestData | null>(null)
  const [overviewKpi, setOverviewKpi] = useState<OverviewKpiData | null>(null)
  const [heatmapSummary, setHeatmapSummary] = useState<HeatmapSummary | null>(null)
  const [customers, setCustomers] = useState<CustomerRfmScore[]>([])
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"distribution" | "profile" | "radar">("distribution")
  // Default these detail cards to hidden
  const [showWhyThisSegment, setShowWhyThisSegment] = useState(false)
  const [showBestBusinessUse, setShowBestBusinessUse] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)
  const [customerPagination, setCustomerPagination] = useState<SegmentationCustomersData["pagination"] | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [error, setError] = useState("")

  const loadSegmentation = async () => {
    try {
      setIsLoading(true)
      setError("")

      const [summaryResult, latestResult] = await Promise.all([
        fetchSegmentationSummary(),
        fetchSegmentationLatest(),
      ])

      const sortedClusters = sortClusterProfiles(summaryResult.clusters || [])
      const latestClusters = sortClusterProfiles(latestResult.clusters || [])

      const normalizedSummary = {
        ...summaryResult,
        clusters: sortedClusters,
        summary: sortClusterProfiles(summaryResult.summary || []),
      }

      const normalizedLatest = {
        ...latestResult,
        clusters: latestClusters,
        summary: sortClusterProfiles(latestResult.summary || []),
      }

      setSummaryData(normalizedSummary)
      setLatestData(normalizedLatest)
      setSelectedSegment((current) =>
        current && sortedClusters.some((cluster) => cluster.segmentName === current)
          ? current
          : sortedClusters[0]?.segmentName || null
      )

      const runScope = normalizedLatest.run
      const scopeMonth = normalizeMonthNumber(runScope?.filterMonth)
      const hasPeriodScope = Boolean(
        runScope?.filterYear && runScope?.filterPeriodType
      )
      const overviewParams = hasPeriodScope
        ? buildPeriodSearchParams({
            month: scopeMonth,
            year: Number(runScope?.filterYear),
            periodType: runScope?.filterPeriodType as PeriodType,
          }, {
            venue: runScope?.filterCourtType || "All Venue",
            customerType: "All Type",
            bookingType: runScope?.filterBookingType || "all",
          })
        : null

      if (!overviewParams) {
        setOverviewKpi(null)
        setHeatmapSummary(null)
        return
      }

      const [kpiResponse, playtimeResponse] = await Promise.all([
          fetch(getApiUrl(`/dashboard/overview-kpis?${overviewParams.toString()}`), {
            headers: getAuthHeaders(),
            cache: "no-store",
          }),
          fetch(getApiUrl(`/dashboard/playtime-mix?${overviewParams.toString()}`), {
            headers: getAuthHeaders(),
            cache: "no-store",
          }),
        ])

      const kpiResult = await kpiResponse.json().catch(() => null)
      const playtimeResult = await playtimeResponse.json().catch(() => null)

      setOverviewKpi(kpiResult?.success ? kpiResult.data : null)
      setHeatmapSummary(playtimeResult?.success ? (playtimeResult.data?.heatmapSummary as HeatmapSummary) : null)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load customer segmentation."
      )
      setSummaryData(null)
      setLatestData(null)
      setOverviewKpi(null)
      setHeatmapSummary(null)
      setSelectedSegment(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadSegmentation()

    const handleSegmentationUpdated = () => {
      void loadSegmentation()
    }

    window.addEventListener(SEGMENTATION_UPDATED_EVENT, handleSegmentationUpdated)
    return () => {
      window.removeEventListener(SEGMENTATION_UPDATED_EVENT, handleSegmentationUpdated)
    }
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedSegment, pageSize])

  useEffect(() => {
    if (!latestData?.run?.id) {
      setCustomers([])
      setCustomerPagination(null)
      return
    }

    const loadCustomers = async () => {
      try {
        setIsLoadingCustomers(true)
        const customerResult = await fetchSegmentationCustomers({
          segmentName: selectedSegment || undefined,
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
        })
        setCustomers(customerResult.customers)
        setCustomerPagination(customerResult.pagination)
      } catch (customerError) {
        setError(
          customerError instanceof Error
            ? customerError.message
            : "Failed to load segmentation customers."
        )
        setCustomers([])
        setCustomerPagination(null)
      } finally {
        setIsLoadingCustomers(false)
      }
    }

    void loadCustomers()
  }, [latestData?.run?.id, selectedSegment, currentPage, pageSize])

  const clusters = useMemo(() => summaryData?.clusters || [], [summaryData])
  const selectedCluster =
    clusters.find((cluster) => cluster.segmentName === selectedSegment) || clusters[0] || null
  const selectedCustomers = selectedSegment
    ? customers.filter((customer) => customer.segmentName === selectedSegment)
    : customers
  const totalCustomerRows = customerPagination?.totalCustomers ?? selectedCustomers.length
  const totalPages = Math.max(1, Math.ceil(totalCustomerRows / pageSize))
  const displayedRowStart = totalCustomerRows === 0 ? 0 : (customerPagination?.offset || 0) + 1
  const displayedRowEnd = customerPagination
    ? (customerPagination.offset || 0) + customerPagination.returned
    : selectedCustomers.length
  const pageButtons = useMemo(() => {
    const buttons: Array<number | "ellipsis"> = []

    for (let page = 1; page <= totalPages; page += 1) {
      if (
        page === 1 ||
        page === totalPages ||
        Math.abs(page - currentPage) <= 1
      ) {
        buttons.push(page)
      } else if (buttons[buttons.length - 1] !== "ellipsis") {
        buttons.push("ellipsis")
      }
    }

    return buttons
  }, [currentPage, totalPages])
  const distributionData = clusters.map((cluster) => ({
    ...cluster,
    color: CUSTOMER_SEGMENT_COLORS[cluster.segmentName] || "var(--chart-5)",
  }))
  const profileComparisonData = clusters.map((cluster) => ({
    segmentName: cluster.segmentName,
    avgRScore: cluster.avgRScore,
    avgFScore: cluster.avgFScore,
    avgMScore: cluster.avgMScore,
  }))

  const radarData = useMemo(() => {
    const maxRecency = Math.max(...clusters.map((cluster) => cluster.avgRecency), 1)
    const maxFrequency = Math.max(...clusters.map((cluster) => cluster.avgFrequency), 1)
    const maxMonetary = Math.max(...clusters.map((cluster) => cluster.avgMonetary), 1)

    return [
      {
        metric: "Recency",
        value: selectedCluster ? Math.max(10, 100 - (selectedCluster.avgRecency / maxRecency) * 100) : 0,
      },
      {
        metric: "Frequency",
        value: selectedCluster ? Math.max(10, (selectedCluster.avgFrequency / maxFrequency) * 100) : 0,
      },
      {
        metric: "Monetary",
        value: selectedCluster ? Math.max(10, (selectedCluster.avgMonetary / maxMonetary) * 100) : 0,
      },
      {
        metric: "R Score",
        value: selectedCluster ? Math.max(10, (selectedCluster.avgRScore / 5) * 100) : 0,
      },
      {
        metric: "F Score",
        value: selectedCluster ? Math.max(10, (selectedCluster.avgFScore / 5) * 100) : 0,
      },
      {
        metric: "M Score",
        value: selectedCluster ? Math.max(10, (selectedCluster.avgMScore / 5) * 100) : 0,
      },
    ]
  }, [clusters, selectedCluster])
  const chartHeightClass =
    viewMode === "radar" ? "h-[clamp(320px,52vw,520px)]" : "h-[clamp(300px,48vw,440px)]"
  const selectedCustomerCount = totalCustomerRows
  const topCustomer = selectedCustomers[0] || null
  const uniqueBookingTypes = new Set(
    selectedCustomers.map((customer) => customer.bookingTypeDominant || "Unknown")
  ).size

  if (isLoading) {
    return (
      <div className="space-y-6">
        <StateCard
          state="loading"
          title="Loading customer segmentation..."
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <StateCard
          state="error"
          title="Failed to load customer segmentation."
          description={error}
          action={
            <Button variant="outline" onClick={() => void loadSegmentation()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          }
        />
      </div>
    )
  }

  if (!latestData?.run || clusters.length === 0) {
    return <EmptyState />
  }

  const previousTotalCustomers = latestData.previousRun?.totalCustomers || 0
  const totalCustomersChange = latestData.totalCustomers - previousTotalCustomers

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold">Customer Segmentation</h1>
            <p className="text-muted-foreground">
              Business-ready customer groups based on completed bookings and walk-in activity only
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Latest Run Engine: {formatRunDate(latestData.run.runDate)}</Badge>
            <Button variant="outline" size="sm" onClick={() => void loadSegmentation()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total Customers"
            tooltip="Total number of unique customers identified from transaction data."
            value={formatNumber(latestData.totalCustomers, 0)}
            changeLabel={
              previousTotalCustomers
                ? `${formatChange((totalCustomersChange / previousTotalCustomers) * 100)} vs last month`
                : "No comparison available"
            }
            icon={Users}
            iconClassName={totalCustomersChange < 0 ? "text-destructive" : "text-emerald-600"}
          />
          <KpiCard
            label="Top Segment"
            tooltip="The customer segment with the largest population from the latest ML clustering run."
            value={
              clusters.length > 0
                ? clusters.reduce((a, b) => (a.customerCount && b.customerCount ? (b.customerCount > a.customerCount ? b : a) : a)).segmentName
                : "-"
            }
            changeLabel={
              clusters.length > 0 && latestData?.totalCustomers
                ? `${Math.round((clusters.reduce((a, b) => (a.customerCount && b.customerCount ? (b.customerCount > a.customerCount ? b : a) : a)).customerCount || 0) / latestData.totalCustomers * 100)}% of customers`
                : "No data available"
            }
          />
          <KpiCard
            label="Top 3 Segment Share"
            tooltip="Combined customer share of the three largest segments — indicates concentration."
            value={
              clusters.length > 0 && latestData?.totalCustomers
                ? `${Math.round((clusters
                    .slice(0)
                    .sort((x, y) => (y.customerCount || 0) - (x.customerCount || 0))
                    .slice(0, 3)
                    .reduce((sum, c) => sum + (c.customerCount || 0), 0) / latestData.totalCustomers) * 100)}%`
                : "-"
            }
            changeLabel="Share of customers in top 3 segments"
          />
          <KpiCard
            label="Active Segments"
            tooltip="Number of distinct customer segments generated by the latest Machine Learning run."
            value={clusters.length}
            changeLabel={selectedCluster?.segmentName || "No segment selected"}
          />
        </div>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitleTooltip title="Customer Value Segments" tooltip={buildBusinessSegmentationMessage(latestData)} />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {distributionData.map((cluster) => (
                <button
                  key={cluster.segmentName}
                  onClick={() => setSelectedSegment(cluster.segmentName)}
                  className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2 transition-all ${
                    selectedCluster?.segmentName === cluster.segmentName
                      ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                      : "border-border bg-secondary/50 hover:border-primary/50"
                  }`}
                >
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cluster.color }} />
                  <span className="font-medium">{cluster.segmentName}</span>
                  <Badge variant="secondary" className="text-xs">
                    {formatNumber(cluster.customerCount, 0)} customers
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitleTooltip
                      title={viewMode === "distribution" ? "Segment Distribution" : viewMode === "profile" ? "Segment Profile Comparison" : "Segment Radar Analysis"}
                      tooltip={viewMode === "distribution" ? "How customers are split across the main business segments" : viewMode === "profile" ? "Compare booking recency, frequency, and value across segments" : "A compact radar view of the selected segment"}
                    />
                  </div>
                </div>

                <div className="flex w-full flex-wrap overflow-hidden rounded-lg border border-border bg-background/80 sm:w-auto">
                  {(["distribution", "profile", "radar"] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={viewMode === mode ? "secondary" : "ghost"}
                      size="sm"
                      className="rounded-none capitalize"
                      onClick={() => setViewMode(mode)}
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-2xl border border-border bg-muted/20 p-4 shadow-inner">
                <div className={`${chartHeightClass} min-h-[300px] w-full`}>
                <ResponsiveContainer width="100%" height="100%">
                  {viewMode === "distribution" ? (
                    <BarChart data={distributionData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="segmentName" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                      <RechartsTooltip formatter={(value) => [`${value} customers`, "Customer Count"]} />
                      <Bar dataKey="customerCount" radius={[10, 10, 0, 0]} barSize={48}>
                        {distributionData.map((entry) => (
                          <Cell key={entry.segmentName} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : viewMode === "profile" ? (
                    <BarChart data={profileComparisonData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="segmentName" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} domain={[0, 5]} />
                      <Legend />
                      <RechartsTooltip />
                      <Bar dataKey="avgRScore" name="Avg R Score" fill="var(--chart-1)" radius={[8, 8, 0, 0]} barSize={18} />
                      <Bar dataKey="avgFScore" name="Avg F Score" fill="var(--chart-2)" radius={[8, 8, 0, 0]} barSize={18} />
                      <Bar dataKey="avgMScore" name="Avg M Score" fill="var(--chart-3)" radius={[8, 8, 0, 0]} barSize={18} />
                    </BarChart>
                  ) : (
                    <RadarChart data={radarData} outerRadius="75%">
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                      <Radar
                        name={selectedCluster?.segmentName || "Selected Segment"}
                        dataKey="value"
                        stroke="var(--chart-1)"
                        fill="var(--chart-1)"
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
                      <Legend />
                      <RechartsTooltip
                        formatter={(value) => [`${Number(value).toFixed(1)}%`, selectedCluster?.segmentName || "Selected Segment"]}
                      />
                    </RadarChart>
                  )}
                </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitleTooltip title="Segment Details" tooltip={selectedCluster
                  ? `${selectedCluster.segmentName} business profile and next action`
                  : "Select a segment to view details"} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCluster ? (
                <>
                  <div className="rounded-2xl border border-border bg-gradient-to-br from-background to-secondary/20 p-4 shadow-sm">
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            CUSTOMER_SEGMENT_COLORS[selectedCluster.segmentName] || "var(--chart-5)",
                        }}
                      />
                      <p className="font-semibold">{selectedCluster.segmentName}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {buildSegmentBusinessSummary(selectedCluster.segmentName, selectedCluster.segmentDescription)}
                    </p>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between border-b border-border/50 py-2">
                      <span className="text-muted-foreground">Customer Count</span>
                      <span className="font-medium">{formatNumber(selectedCluster.customerCount, 0)}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border/50 py-2">
                      <span className="text-muted-foreground">Avg Recency</span>
                      <span className="font-medium">{formatNumber(selectedCluster.avgRecency)} days</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border/50 py-2">
                      <span className="text-muted-foreground">Avg Frequency</span>
                      <span className="font-medium">{formatNumber(selectedCluster.avgFrequency)}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border/50 py-2">
                      <span className="text-muted-foreground">Avg Monetary</span>
                      <span className="font-medium">{formatCurrency(selectedCluster.avgMonetary)}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border/50 py-2">
                      <span className="text-muted-foreground">Avg R/F/M Scores</span>
                      <span className="font-medium">
                        {formatNumber(selectedCluster.avgRScore, 2)} / {formatNumber(selectedCluster.avgFScore, 2)} / {formatNumber(selectedCluster.avgMScore, 2)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/80 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setShowWhyThisSegment((current) => !current)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40"
                    >
                      <div>
                        <p className="text-sm font-medium">Why This Segment Matters</p>
                        <p className="text-xs text-muted-foreground">Business context and relevance</p>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${
                          showWhyThisSegment ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {showWhyThisSegment ? (
                      <div className="border-t border-border p-4">
                        <div className="rounded-2xl border border-border bg-gradient-to-br from-emerald-50 to-background p-4 text-sm shadow-sm">
                          <p className="text-muted-foreground">
                            {buildSegmentActionContext(selectedCluster.segmentName, selectedCluster.labelReason)}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-border bg-background/80 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setShowBestBusinessUse((current) => !current)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40"
                    >
                      <div>
                        <p className="text-sm font-medium">Best Business Use</p>
                        <p className="text-xs text-muted-foreground">Recommended action for this segment</p>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${
                          showBestBusinessUse ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {showBestBusinessUse ? (
                      <div className="border-t border-border p-4">
                        <div className="rounded-2xl border border-border bg-gradient-to-br from-sky-50 to-background p-4 text-sm shadow-sm">
                          <p className="text-muted-foreground">
                            {selectedCluster.recommendedAction || "Use this segment for targeted retention, upsell, or reactivation campaigns."}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="flex min-h-[280px] items-center justify-center text-center text-muted-foreground">
                  Select a segment to view details.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Segment Playbook removed per request */}

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitleTooltip title="Customer Table" tooltip={selectedSegment
                    ? `Customer rows for ${selectedSegment}`
                    : "Latest customer rows from the cleaned segmentation result"} />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Rows
                  </p>
                  <p className="mt-1 text-lg font-semibold">{formatNumber(selectedCustomerCount, 0)}</p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Booking Types
                  </p>
                  <p className="mt-1 text-lg font-semibold">{uniqueBookingTypes}</p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Top Customer
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold">
                    {topCustomer?.customerName || topCustomer?.customerKey || "-"}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full bg-secondary/40 px-3 py-1">
                Selected Segment: {selectedSegment || "All segments"}
              </Badge>
              <Badge variant="outline" className="rounded-full bg-secondary/40 px-3 py-1">
                {selectedCustomerCount} customer profiles
              </Badge>
              <Badge variant="outline" className="rounded-full bg-secondary/40 px-3 py-1">
                {uniqueBookingTypes} booking type groups
              </Badge>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              This table is built from completed payments and manual/walk-in bookings only, so the records shown here are already filtered for business use.
            </p>
            {isLoadingCustomers ? (
              <div className="flex min-h-[160px] items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading customer rows...
              </div>
            ) : customers.length === 0 ? (
              <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-gradient-to-br from-background to-secondary/20 text-sm text-muted-foreground">
                <Users className="h-10 w-10 text-muted-foreground/50" />
                <div className="text-center">
                  <p className="font-medium">No customer rows available for this segment.</p>
                  <p className="text-xs text-muted-foreground">
                    Try another segment or refresh the latest segmentation run.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex flex-col gap-4 border-b border-border bg-gradient-to-r from-background to-secondary/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr_0.8fr] gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>Customer</div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Customer name and key for each profile.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>Booking Type</div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Dominant booking type for the customer in this run.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>Last Visit</div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Days since the customer&apos;s most recent completed booking.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>Frequency</div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Number of visits or bookings for the customer.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>Value</div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Monetary value of bookings associated with the customer.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>Segment</div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Assigned customer segment from the latest model run.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      Showing {displayedRowStart}-{displayedRowEnd} of {totalCustomerRows}
                    </span>
                    <label className="flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1">
                      <span>Rows:</span>
                      <select
                        value={pageSize}
                        onChange={(event) => setPageSize(Number(event.target.value))}
                        className="rounded-full border border-border bg-background px-2 py-1 text-xs"
                      >
                        {[10, 20, 50].map((size) => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
                <div className="max-h-[560px] overflow-y-auto">
                  <div className="divide-y divide-border/60">
                    {customers.map((customer, index) => {
                      const scoreTone =
                        customer.monetary >= (selectedCluster?.avgMonetary || 0)
                          ? "from-emerald-50 to-background"
                          : index % 2 === 0
                            ? "from-background to-secondary/10"
                            : "from-background to-muted/10"

                      return (
                        <div
                          key={`${customer.customerKey}-${customer.segmentName}`}
                          className={`grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr_0.8fr] items-center gap-3 px-4 py-4 transition-all hover:-translate-y-[1px] hover:bg-gradient-to-r ${scoreTone}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                              {(customer.customerName || customer.customerKey || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {customer.customerName || customer.customerKey}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {customer.customerKey}
                              </p>
                            </div>
                          </div>

                          <div>
                            <Badge variant="secondary" className="rounded-full">
                              {customer.bookingTypeDominant || "Unknown"}
                            </Badge>
                          </div>

                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{customer.recency}</span> days ago
                          </div>

                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{customer.frequency}</span> visits
                          </div>

                          <div className="text-sm font-medium text-foreground">
                            {formatCurrency(customer.monetary)}
                          </div>

                          <div>
                            <Badge
                              className="rounded-full bg-orange-500/10 text-orange-700 hover:bg-orange-500/10"
                              variant="outline"
                            >
                              {customer.segmentName}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {totalPages > 1 ? (
                  <div className="border-t border-border bg-background/80 px-4 py-3">
                    <Pagination className="justify-between gap-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </div>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            aria-disabled={currentPage === 1}
                            onClick={(event) => {
                              event.preventDefault()
                              if (currentPage === 1) return
                              setCurrentPage((page) => Math.max(page - 1, 1))
                            }}
                          />
                        </PaginationItem>
                        {pageButtons.map((page, index) =>
                          page === "ellipsis" ? (
                            <PaginationItem key={`ellipsis-${index}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          ) : (
                            <PaginationItem key={page}>
                              <PaginationLink
                                href="#"
                                isActive={page === currentPage}
                                onClick={(event) => {
                                  event.preventDefault()
                                  setCurrentPage(page)
                                }}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ),
                        )}
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            aria-disabled={currentPage === totalPages}
                            onClick={(event) => {
                              event.preventDefault()
                              if (currentPage === totalPages) return
                              setCurrentPage((page) => Math.min(page + 1, totalPages))
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
    </TooltipProvider>
  )
}
