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
  ComposedChart,
  Legend,
  Line,
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
import {
  AlertCircle,
  BrainCircuit,
  Info,
  Loader2,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from "lucide-react"
import {
  CUSTOMER_SEGMENT_COLORS,
  SEGMENTATION_UPDATED_EVENT,
  fetchSegmentationCustomers,
  fetchSegmentationLatest,
  fetchSegmentationSummary,
  sortClusterProfiles,
  type ClusterProfile,
  type CustomerRfmScore,
  type KEvaluationItem,
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
    return "Business Segmentation K is not available yet. Run ML from Data Center to generate customer segments."
  }

  if (
    latest.bestSilhouetteK !== null &&
    latest.bestSilhouetteK !== undefined &&
    latest.bestSilhouetteK !== latest.selectedK
  ) {
    return "K=4 is used for business-facing segmentation because it balances customer behavior detail and Marketing Operational efficiency. K evaluation is shown as validation evidence."
  }

  return latest.selectionReason || "Business Segmentation K is used for the production-facing customer segment view."
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
  const [viewMode, setViewMode] = useState<"distribution" | "profile" | "validation">(
    "distribution"
  )
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
  const kEvaluationItems: KEvaluationItem[] = latestData?.kEvaluation?.testedK || []
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
  const radarData = selectedCluster
    ? [
        { metric: "R Score", value: selectedCluster.avgRScore },
        { metric: "F Score", value: selectedCluster.avgFScore },
        { metric: "M Score", value: selectedCluster.avgMScore },
      ]
    : []

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
              RFM customer-value segmentation from the finalized backend K-Means pipeline
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Latest Run: {formatRunDate(latestData.run.runDate)}</Badge>
            <Badge>Business Segmentation K: {latestData.selectedK ?? 4}</Badge>
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
                  <p className="text-sm text-muted-foreground">Business Segmentation K</p>
                  <p className="text-2xl font-bold">{latestData.selectedK ?? 4}</p>
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
                  <p className="text-sm text-muted-foreground">Best Silhouette K</p>
                  <p className="text-2xl font-bold">
                    {latestData.bestSilhouetteK ?? latestData.optimalK ?? "-"}
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
                  <p className="text-sm text-muted-foreground">Silhouette Score</p>
                  <p className="text-2xl font-bold">
                    {formatNumber(latestData.silhouetteScore, 4)}
                  </p>
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
                    Business Segmentation K shows the production-facing K. K Evaluation is validation evidence only.
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
                    {cluster.customerCount}
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
                    {viewMode === "validation" && "K Evaluation"}
                  </CardTitle>
                  <CardDescription>
                    {viewMode === "distribution" && "Customer count by final business-facing segment"}
                    {viewMode === "profile" && "Average R/F/M score comparison across segments"}
                    {viewMode === "validation" && "Validation evidence from inertia/WCSS and silhouette score"}
                  </CardDescription>
                </div>

                <div className="flex overflow-hidden rounded-lg border border-border">
                  {([
                    "distribution",
                    "profile",
                    "validation",
                  ] as const).map((mode) => (
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
                  ) : viewMode === "profile" ? (
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
                  ) : (
                    <ComposedChart data={kEvaluationItems}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="k" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis yAxisId="left" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        domain={[-1, 1]}
                      />
                      <Legend />
                      <RechartsTooltip />
                      <Bar yAxisId="left" dataKey="inertia" name="Inertia / WCSS" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="silhouetteScore"
                        name="Silhouette Score"
                        stroke="var(--chart-3)"
                        strokeWidth={3}
                      />
                    </ComposedChart>
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
                  ? `${selectedCluster.segmentName} customer-value segment`
                  : "Select a segment to view details"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCluster ? (
                <>
                  <div className="rounded-lg bg-secondary/40 p-4">
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
                      {selectedCluster.segmentDescription || "No description available."}
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

                  <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm">
                    <p className="mb-2 font-medium">Label Reason</p>
                    <p className="text-muted-foreground">
                      {selectedCluster.labelReason || "No label reason available."}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm">
                    <p className="mb-2 font-medium">Recommended Action</p>
                    <p className="text-muted-foreground">
                      {selectedCluster.recommendedAction || "No recommended action available."}
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

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Business Segmentation K
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>K evaluation is validation evidence, not the production segmentation decision.</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>{buildBusinessSegmentationMessage(latestData)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-secondary/30 p-4">
                  <p className="text-sm text-muted-foreground">Business Segmentation K</p>
                  <p className="text-xl font-semibold">{latestData.selectedK ?? 4}</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-4">
                  <p className="text-sm text-muted-foreground">Best Silhouette K</p>
                  <p className="text-xl font-semibold">
                    {latestData.bestSilhouetteK ?? latestData.optimalK ?? "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-4">
                  <p className="text-sm text-muted-foreground">Elbow K</p>
                  <p className="text-xl font-semibold">{latestData.elbowK ?? "-"}</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-4">
                  <p className="text-sm text-muted-foreground">Silhouette Score</p>
                  <p className="text-xl font-semibold">{formatNumber(latestData.silhouetteScore, 4)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle>Selected Segment Radar</CardTitle>
              <CardDescription>
                {selectedCluster
                  ? `${selectedCluster.segmentName} average R/F/M score profile`
                  : "No selected segment"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="80%">
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                    <Radar
                      name={selectedCluster?.segmentName || "Segment"}
                      dataKey="value"
                      stroke={
                        selectedCluster
                          ? CUSTOMER_SEGMENT_COLORS[selectedCluster.segmentName] || "var(--chart-1)"
                          : "var(--chart-1)"
                      }
                      fill={
                        selectedCluster
                          ? CUSTOMER_SEGMENT_COLORS[selectedCluster.segmentName] || "var(--chart-1)"
                          : "var(--chart-1)"
                      }
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>K Evaluation</CardTitle>
            <CardDescription>
              Validation evidence only: inertia / WCSS and silhouette score across tested K values.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {kEvaluationItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No K evaluation evidence available for this run.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>K</TableHead>
                      <TableHead>Inertia / WCSS</TableHead>
                      <TableHead>Silhouette Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kEvaluationItems.map((item) => (
                      <TableRow key={item.k}>
                        <TableCell>{item.k}</TableCell>
                        <TableCell>{formatNumber(item.inertia, 4)}</TableCell>
                        <TableCell>{formatNumber(item.silhouetteScore, 4)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Customer Table</CardTitle>
            <CardDescription>
              {selectedSegment
                ? `Customer rows for ${selectedSegment}`
                : "Latest customer rows from the business-facing segmentation result"}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                      <TableHead>Recency</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Monetary</TableHead>
                      <TableHead>R Score</TableHead>
                      <TableHead>F Score</TableHead>
                      <TableHead>M Score</TableHead>
                      <TableHead>Segment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={`${customer.customerKey}-${customer.segmentName}`}>
                        <TableCell className="font-medium">
                          {customer.customerName || customer.customerKey}
                        </TableCell>
                        <TableCell>{customer.bookingTypeDominant || "-"}</TableCell>
                        <TableCell>{customer.recency}</TableCell>
                        <TableCell>{customer.frequency}</TableCell>
                        <TableCell>{formatCurrency(customer.monetary)}</TableCell>
                        <TableCell>{customer.rScore}</TableCell>
                        <TableCell>{customer.fScore}</TableCell>
                        <TableCell>{customer.mScore}</TableCell>
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

