"use client"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Eye,
  MousePointer,
  Heart,
  Share2,
  Calendar,
  Filter,
  RefreshCw,
  ExternalLink,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Line,
  Tooltip as RechartsTooltip,
  Legend,
  ComposedChart,
} from "recharts"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type MetaSummary = {
  totalViews: number
  totalReach: number
  totalInteractions: number
  totalShares: number
  engagementRate: number
  shareRate: number
}

type MetaTrendItem = {
  date: string
  reach: number
  views: number
  interactions: number
}

type MetaTopContentItem = {
  id: string
  igMediaId?: string
  caption?: string
  mediaType?: string
  mediaProductType?: string
  mediaUrl?: string
  thumbnailUrl?: string | null
  permalink?: string
  postedAt?: string
  views: number
  reach: number
  interactions: number
  shares: number
  engagementRate: number
}

type MetaDashboardResponse = {
  summary: MetaSummary
  trend: MetaTrendItem[]
  topContent: MetaTopContentItem[]
}

const defaultMetaData: MetaDashboardResponse = {
  summary: {
    totalViews: 0,
    totalReach: 0,
    totalInteractions: 0,
    totalShares: 0,
    engagementRate: 0,
    shareRate: 0,
  },
  trend: [],
  topContent: [],
}

/**
 * Data ini masih dummy karena revenue, conversion, dan correlation
 * belum berasal dari Meta API. Nanti baru diganti saat data revenue internal
 * sudah dihubungkan.
 */
const revenueComparison = [
  { month: "Jan", before: 380, after: 420 },
  { month: "Feb", before: 400, after: 480 },
  { month: "Mar", before: 420, after: 510 },
  { month: "Apr", before: 410, after: 490 },
  { month: "May", before: 450, after: 550 },
  { month: "Jun", before: 460, after: 580 },
]

const correlationData = [
  { metric: "Views", revenueCorr: 0.82, footfallCorr: 0.75 },
  { metric: "Reach", revenueCorr: 0.78, footfallCorr: 0.71 },
  { metric: "Engagement", revenueCorr: 0.91, footfallCorr: 0.85 },
  { metric: "Interactions", revenueCorr: 0.88, footfallCorr: 0.79 },
  { metric: "Shares", revenueCorr: 0.72, footfallCorr: 0.68 },
]

function formatNumber(value?: number) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0))
}

function formatShort(value?: number) {
  const numberValue = Number(value || 0)

  if (numberValue >= 1000000) {
    return `${(numberValue / 1000000).toFixed(1)}M`
  }

  if (numberValue >= 1000) {
    return `${(numberValue / 1000).toFixed(1)}K`
  }

  return String(numberValue)
}

function formatPercent(value?: number) {
  return `${Number(value || 0).toFixed(2)}%`
}

function formatDate(value?: string) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

function shortCaption(value?: string) {
  if (!value) return "No caption"
  return value.length > 45 ? `${value.slice(0, 45)}...` : value
}

function getPerformanceLabel(engagementRate: number) {
  if (engagementRate >= 5) return "High"
  if (engagementRate >= 2) return "Medium"
  return "Low"
}

type InstaSightHubProps = {
  onViewAudience?: () => void
}

export function InstaSightHub({ onViewAudience }: InstaSightHubProps) {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "quarter">("month")
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)

  const [since, setSince] = useState("2026-05-01")
  const [until, setUntil] = useState("2026-05-28")
  const [metaData, setMetaData] = useState<MetaDashboardResponse>(defaultMetaData)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const totalBefore = revenueComparison.reduce((sum, d) => sum + d.before, 0)
  const totalAfter = revenueComparison.reduce((sum, d) => sum + d.after, 0)
  const revenueGrowth = (((totalAfter - totalBefore) / totalBefore) * 100).toFixed(1)

  const fetchMetaDashboard = async () => {
    try {
      setIsLoading(true)
      setErrorMessage("")

      const response = await fetch(
        `${API_URL}/api/meta/dashboard?since=${since}&until=${until}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || "Failed to fetch Meta dashboard data")
      }

      const result: MetaDashboardResponse = await response.json()

      setMetaData({
        summary: result.summary || defaultMetaData.summary,
        trend: Array.isArray(result.trend) ? result.trend : [],
        topContent: Array.isArray(result.topContent) ? result.topContent : [],
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load Meta dashboard data"
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMetaDashboard()
  }, [])

  const metaMetrics = useMemo(() => {
    if (!metaData.trend.length) {
      return [
        {
          date: "No Data",
          reach: 0,
          views: 0,
          engagement: 0,
        },
      ]
    }

    return metaData.trend.map((item) => ({
      date: item.date,
      reach: Number(item.reach || 0),
      views: Number(item.views || 0),
      engagement: Number(item.interactions || 0),
    }))
  }, [metaData.trend])

  const campaigns = useMemo(() => {
    return metaData.topContent.map((item) => ({
      id: item.id,
      name: shortCaption(item.caption),
      fullCaption: item.caption || "No caption",
      reach: Number(item.reach || 0),
      engagement: Number(item.engagementRate || 0),
      views: Number(item.views || 0),
      interactions: Number(item.interactions || 0),
      shares: Number(item.shares || 0),
      mediaType: item.mediaType || "-",
      mediaProductType: item.mediaProductType || "-",
      mediaUrl: item.mediaUrl || item.thumbnailUrl || "",
      permalink: item.permalink || "",
      postedAt: item.postedAt || "",
    }))
  }, [metaData.topContent])

  const kpis = useMemo(() => {
    const summary = metaData.summary

    return [
      {
        label: "Total Reach",
        value: formatShort(summary.totalReach),
        change: "From Meta API",
        trend: "up",
        icon: Eye,
        description: "Total unique users reached from Instagram content",
      },
      {
        label: "Views",
        value: formatShort(summary.totalViews),
        change: "From Meta API",
        trend: "up",
        icon: MousePointer,
        description: "Total views from Instagram content insights",
      },
      {
        label: "Engagement Rate",
        value: formatPercent(summary.engagementRate),
        change: "Calculated",
        trend: summary.engagementRate > 0 ? "up" : "down",
        icon: Heart,
        description: "Total interactions divided by total reach",
      },
      {
        label: "Share Rate",
        value: formatPercent(summary.shareRate),
        change: "Calculated",
        trend: summary.shareRate > 0 ? "up" : "down",
        icon: Share2,
        description: "Total shares divided by total reach",
      },
    ]
  }, [metaData.summary])

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Performance & Impact Hub</h1>
            <p className="text-muted-foreground">
              Instagram performance visualization from Meta API
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />

              <input
                type="date"
                value={since}
                onChange={(e) => setSince(e.target.value)}
                className="bg-transparent text-sm outline-none"
              />

              <span className="text-sm text-muted-foreground">to</span>

              <input
                type="date"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                className="bg-transparent text-sm outline-none"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={fetchMetaDashboard}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Filter className="h-4 w-4" />
              )}
              {isLoading ? "Loading..." : "Apply"}
            </Button>

            <div className="flex overflow-hidden rounded-lg border border-border">
              {(["week", "month", "quarter"] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-none capitalize"
                  onClick={() => setTimeRange(range)}
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {errorMessage && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{errorMessage}</p>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon

            return (
              <Card key={kpi.label} className="border-border bg-card shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">{kpi.label}</p>

                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{kpi.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      <p className="text-2xl font-bold">{kpi.value}</p>

                      <p
                        className={`flex items-center gap-1 text-sm ${
                          kpi.trend === "up" ? "text-primary" : "text-destructive"
                        }`}
                      >
                        {kpi.trend === "up" ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                        {kpi.change}
                      </p>
                    </div>

                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                        kpi.trend === "up" ? "bg-primary/10" : "bg-destructive/10"
                      }`}
                    >
                      <Icon
                        className={`h-6 w-6 ${
                          kpi.trend === "up" ? "text-primary" : "text-destructive"
                        }`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Revenue Before vs After */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Revenue Comparison: Before vs After
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        This section still uses dummy data because revenue is not
                        provided by Meta API.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>
                  Temporary dummy data until revenue/internal transaction data is connected
                </CardDescription>
              </div>

              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Growth</p>
                <p className="text-2xl font-bold text-primary">+{revenueGrowth}%</p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={revenueComparison} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />

                  <XAxis
                    dataKey="month"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}M`}
                  />

                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--foreground)",
                    }}
                    formatter={(value: unknown, name: unknown) => [
                      `IDR ${Number(value)}M`,
                      name === "before" ? "Before AI" : "After AI",
                    ]}
                  />

                  <Legend
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-sm text-foreground">
                        {value === "before" ? "Before AI Strategies" : "After AI Strategies"}
                      </span>
                    )}
                  />

                  <Bar dataKey="before" fill="var(--muted)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="after" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />

                  <Line
                    type="monotone"
                    dataKey="after"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    dot={{ fill: "var(--chart-2)", strokeWidth: 0 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Meta Metrics Over Time */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Meta Metrics Trend
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Trend for reach, views, and interactions from Meta API.</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>
                Social media performance based on selected period
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metaMetrics}>
                    <defs>
                      <linearGradient id="reachGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>

                      <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
                      </linearGradient>

                      <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />

                    <XAxis
                      dataKey="date"
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />

                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatShort(Number(value))}
                    />

                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        color: "var(--foreground)",
                      }}
                      formatter={(value: unknown, name: unknown) => [
                        formatNumber(Number(value)),
                        String(name),
                      ]}
                    />

                    <Legend
                      iconType="circle"
                      formatter={(value) => (
                        <span className="text-sm capitalize text-foreground">
                          {String(value)}
                        </span>
                      )}
                    />

                    <Area
                      type="monotone"
                      dataKey="reach"
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      fill="url(#reachGradient)"
                    />

                    <Area
                      type="monotone"
                      dataKey="views"
                      stroke="var(--chart-2)"
                      strokeWidth={2}
                      fill="url(#viewsGradient)"
                    />

                    <Area
                      type="monotone"
                      dataKey="engagement"
                      stroke="var(--chart-3)"
                      strokeWidth={2}
                      fill="url(#engagementGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {metaData.trend.length <= 1 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Note: trend chart masih terlihat pendek karena data sync baru memiliki sedikit tanggal insight.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Correlation Analysis */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Metrics Correlation
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      This section still uses dummy data because correlation needs
                      Meta data plus revenue or footfall data.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>Temporary impact correlation scores</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={correlationData} layout="vertical" barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />

                    <XAxis
                      type="number"
                      domain={[0, 1]}
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />

                    <YAxis
                      type="category"
                      dataKey="metric"
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      width={90}
                    />

                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        color: "var(--foreground)",
                      }}
                      formatter={(value: unknown) => [
                        `${(Number(value) * 100).toFixed(0)}%`,
                        "",
                      ]}
                    />

                    <Legend
                      iconType="circle"
                      formatter={(value) => (
                        <span className="text-sm text-foreground">
                          {value === "revenueCorr"
                            ? "Revenue Correlation"
                            : "Footfall Correlation"}
                        </span>
                      )}
                    />

                    <Bar dataKey="revenueCorr" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="footfallCorr" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Performance Table */}
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">Instagram Content Performance</h2>
                <p className="text-sm text-muted-foreground">
                  Top content based on views from Meta API
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={onViewAudience}
              >
                View Audience Insight
                <ExternalLink className="h-4 w-4" />
              </Button>
                          </div>

            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle>Instagram Content Performance</CardTitle>
                <CardDescription>
                  Top content based on views from Meta API
                </CardDescription>
              </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Content
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Views
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Reach
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Interactions
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Shares
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Engagement
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Performance
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {campaigns.map((campaign, idx) => {
                    const performanceLabel = getPerformanceLabel(campaign.engagement)

                    return (
                      <tr
                        key={campaign.id}
                        className={`cursor-pointer border-b border-border/30 transition-colors hover:bg-secondary/30 ${
                          selectedCampaign === campaign.id ? "bg-primary/5" : ""
                        }`}
                        onClick={() =>
                          setSelectedCampaign(
                            selectedCampaign === campaign.id ? null : campaign.id
                          )
                        }
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 overflow-hidden rounded-lg bg-secondary">
                              {campaign.mediaUrl ? (
                                <img
                                  src={campaign.mediaUrl}
                                  alt={campaign.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Calendar className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>

                            <div className="max-w-[360px]">
                              <div className="flex items-center gap-2">
                                {idx === 0 && (
                                  <TrendingUp className="h-4 w-4 text-primary" />
                                )}
                                <p className="font-medium">{campaign.name}</p>
                              </div>

                              <p className="text-xs text-muted-foreground">
                                Posted at {formatDate(campaign.postedAt)}
                              </p>

                              {campaign.permalink && (
                                <a
                                  href={campaign.permalink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 inline-flex items-center gap-1 text-xs text-primary"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Open Instagram
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm font-medium">{campaign.mediaProductType}</p>
                            <p className="text-xs text-muted-foreground">{campaign.mediaType}</p>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-right font-medium">
                          {formatNumber(campaign.views)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {formatNumber(campaign.reach)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {formatNumber(campaign.interactions)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {formatNumber(campaign.shares)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {formatPercent(campaign.engagement)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <Badge
                            variant={performanceLabel === "High" ? "default" : "secondary"}
                            className={
                              performanceLabel === "High"
                                ? "border-0 bg-primary/10 text-primary"
                                : performanceLabel === "Medium"
                                  ? "border-0 bg-secondary text-foreground"
                                  : "border-0 bg-destructive/10 text-destructive"
                            }
                          >
                            {performanceLabel}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}

                  {!campaigns.length && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-10 text-center text-sm text-muted-foreground"
                      >
                        Belum ada data content dari Meta API untuk periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tutup wrapper utama space-y-6 */}
    </div>
  </TooltipProvider>
)
}
