"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"
import { AlertCircle, BrainCircuit, Info, Loader2, RefreshCw, Target, TrendingUp, Users } from "lucide-react"
import {
  CUSTOMER_SEGMENT_COLORS,
  SEGMENTATION_UPDATED_EVENT,
  fetchSegmentationCustomers,
  fetchSegmentationLatest,
  fetchSegmentationSummary,
  sortClusterProfiles,
  type ClusterProfile,
  type CustomerRfmScore,
  type SegmentationLatestData,
  type SegmentationSummaryData,
} from "@/lib/segmentation"

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
    "Routine Players": "Stable repeat customers who respond well to consistency and light incentives.",
    "Growth Players": "Promising customers who may spend more with the right nudge and follow-up.",
    "Re-Engagement Players": "Inactive or low-frequency customers who need a simple reactivation push.",
  }

  return summaryMap[segmentName] || description || "This segment reflects a distinct booking pattern and customer value profile."
}

const buildSegmentActionContext = (segmentName: string, recommendedAction?: string | null) => {
  const actionMap: Record<string, string> = {
    "Prime Players": "Use retention offers, VIP treatment, and priority booking reminders.",
    "Routine Players": "Keep them engaged with consistent offers and recurring booking packages.",
    "Growth Players": "Push follow-up campaigns, bundles, and repeat-booking incentives.",
    "Re-Engagement Players": "Send a simple reactivation message and make it easy to book again.",
  }

  return recommendedAction || actionMap[segmentName] || "Use the segment for targeted follow-up and campaign planning."
}

const EmptyState = () => (
  <Card className="border-border bg-card shadow-sm">
    <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
      <BrainCircuit className="h-12 w-12 text-muted-foreground" />
      <div>
        <p className="font-medium">No customer segmentation result yet.</p>
        <p className="text-sm text-muted-foreground">
          Run ML from Data Center to generate customer segments.
        </p>
      </div>
    </CardContent>
  </Card>
)

export function SegmentVisualization() {
  const [summaryData, setSummaryData] = useState<SegmentationSummaryData | null>(null)
  const [latestData, setLatestData] = useState<SegmentationLatestData | null>(null)
  const [customers, setCustomers] = useState<CustomerRfmScore[]>([])
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"distribution" | "profile">("distribution")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)
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
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load customer segmentation."
      )
      setSummaryData(null)
      setLatestData(null)
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
    if (!latestData?.run?.id) {
      setCustomers([])
      return
    }

    const loadCustomers = async () => {
      try {
        setIsLoadingCustomers(true)
        const customerResult = await fetchSegmentationCustomers({
          segmentName: selectedSegment || undefined,
          limit: 100,
          offset: 0,
        })
        setCustomers(customerResult.customers)
      } catch (customerError) {
        setError(
          customerError instanceof Error
            ? customerError.message
            : "Failed to load segmentation customers."
        )
        setCustomers([])
      } finally {
        setIsLoadingCustomers(false)
      }
    }

    void loadCustomers()
  }, [latestData?.run?.id, selectedSegment])

  const clusters = summaryData?.clusters || []
  const selectedCluster =
    clusters.find((cluster) => cluster.segmentName === selectedSegment) || clusters[0] || null
  const selectedCustomers = selectedSegment
    ? customers.filter((customer) => customer.segmentName === selectedSegment)
    : customers
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
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex min-h-[280px] items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading customer segmentation...
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Failed to load customer segmentation.</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" onClick={() => void loadSegmentation()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!latestData?.run || clusters.length === 0) {
    return <EmptyState />
  }

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
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Customers</p>
                  <p className="text-2xl font-bold">
                    {formatNumber(latestData.totalCustomers, 0)}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Segments</p>
                  <p className="text-2xl font-bold">{clusters.length}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Target className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Focus Segment</p>
                  <p className="text-2xl font-bold">
                    {selectedCluster?.segmentName || "-"}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Latest Data Scope</p>
                  <p className="text-2xl font-bold">Cleaned</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <BrainCircuit className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Customer Value Segments
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Groups customers by their value to your business. This shows the final results used by the system.
                  </p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <CardDescription>{buildBusinessSegmentationMessage(latestData)}</CardDescription>
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
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: cluster.color }}
                  />
                  <span className="font-medium">{cluster.segmentName}</span>
                  <Badge variant="secondary" className="text-xs">
                    {formatNumber(cluster.customerCount, 0)} customers
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-border bg-card shadow-sm lg:col-span-2">
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>
                    {viewMode === "distribution" && "Segment Distribution"}
                    {viewMode === "profile" && "Segment Profile Comparison"}
                  </CardTitle>
                  <CardDescription>
                    {viewMode === "distribution" && "How customers are split across the main business segments"}
                    {viewMode === "profile" && "Compare booking recency, frequency, and value across segments"}
                  </CardDescription>
                </div>

                <div className="flex overflow-hidden rounded-lg border border-border">
                  {(["distribution", "profile"] as const).map((mode) => (
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
            <CardContent>
              <div className="h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  {viewMode === "distribution" ? (
                    <BarChart data={distributionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="segmentName" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                      <RechartsTooltip formatter={(value) => [`${value} customers`, "Customer Count"]} />
                      <Bar dataKey="customerCount" radius={[8, 8, 0, 0]}>
                        {distributionData.map((entry) => (
                          <Cell key={entry.segmentName} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <BarChart data={profileComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="segmentName" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} domain={[0, 5]} />
                      <Legend />
                      <RechartsTooltip />
                      <Bar dataKey="avgRScore" name="Avg R Score" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="avgFScore" name="Avg F Score" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="avgMScore" name="Avg M Score" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle>Segment Details</CardTitle>
              <CardDescription>
                {selectedCluster
                  ? `${selectedCluster.segmentName} business profile and next action`
                  : "Select a segment to view details"}
              </CardDescription>
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

                  <div className="rounded-2xl border border-border bg-gradient-to-br from-emerald-50 to-background p-4 text-sm shadow-sm">
                    <p className="mb-2 font-medium">Why This Segment Matters</p>
                    <p className="text-muted-foreground">
                      {buildSegmentActionContext(selectedCluster.segmentName, selectedCluster.labelReason)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-gradient-to-br from-sky-50 to-background p-4 text-sm shadow-sm">
                    <p className="mb-2 font-medium">Best Business Use</p>
                    <p className="text-muted-foreground">
                      {selectedCluster.recommendedAction || "Use this segment for targeted retention, upsell, or reactivation campaigns."}
                    </p>
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

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Segment Playbook</CardTitle>
            <CardDescription>
              Simple guidance for how the business should use the selected segment in campaigns.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-gradient-to-br from-background to-secondary/20 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Business Summary</p>
              <p className="mt-2 text-sm leading-6">
                {buildSegmentBusinessSummary(selectedSegment || selectedCluster?.segmentName || "", selectedCluster?.segmentDescription)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-gradient-to-br from-background to-secondary/20 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Recommended Use</p>
              <p className="mt-2 text-sm leading-6">
                {selectedCluster?.recommendedAction || "Use this group for targeted follow-up, retention, and conversion campaigns."}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-gradient-to-br from-background to-secondary/20 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Best Campaign Angle</p>
              <p className="mt-2 text-sm leading-6">
                {selectedCluster?.labelReason || "This segment is separated because its booking pattern and value profile differ from the others."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Customer Table</CardTitle>
            <CardDescription>
              {selectedSegment
                ? `Customer rows for ${selectedSegment}`
                : "Latest customer rows from the cleaned segmentation result"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-gradient-to-br from-background to-secondary/20 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Selected Segment</p>
                <p className="mt-2 text-sm font-medium text-foreground">{selectedSegment || "All segments"}</p>
              </div>
              <div className="rounded-2xl border border-border bg-gradient-to-br from-background to-secondary/20 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Visible Customers</p>
                <p className="mt-2 text-sm font-medium text-foreground">{formatNumber(selectedCustomers.length, 0)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-gradient-to-br from-background to-secondary/20 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Business Use</p>
                <p className="mt-2 text-sm font-medium text-foreground">Target follow-up and retention planning</p>
              </div>
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
              <div className="flex min-h-[160px] items-center justify-center text-sm text-muted-foreground">
                No customer rows available for this segment.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Booking Type</TableHead>
                      <TableHead>Last Visit</TableHead>
                      <TableHead>Visit Frequency</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Segment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={`${customer.customerKey}-${customer.segmentName}`}>
                        <TableCell className="font-medium">
                          {customer.customerName || customer.customerKey}
                        </TableCell>
                        <TableCell>{customer.bookingTypeDominant || "Unknown"}</TableCell>
                        <TableCell>{customer.recency} days ago</TableCell>
                        <TableCell>{customer.frequency} visits</TableCell>
                        <TableCell>{formatCurrency(customer.monetary)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{customer.segmentName}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
