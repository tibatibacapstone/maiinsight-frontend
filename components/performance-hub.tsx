"use client"

import { useState } from "react"
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
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Eye,
  MousePointer,
  Heart,
  Share2,
  Calendar,
  Filter
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
  LineChart,
  Line,
  Tooltip as RechartsTooltip,
  Legend,
  ComposedChart
} from "recharts"

const revenueComparison = [
  { month: "Jan", before: 380, after: 420 },
  { month: "Feb", before: 400, after: 480 },
  { month: "Mar", before: 420, after: 510 },
  { month: "Apr", before: 410, after: 490 },
  { month: "May", before: 450, after: 550 },
  { month: "Jun", before: 460, after: 580 },
]

const metaMetrics = [
  { date: "Week 1", reach: 45000, impressions: 120000, engagement: 8500 },
  { date: "Week 2", reach: 52000, impressions: 145000, engagement: 9200 },
  { date: "Week 3", reach: 48000, impressions: 130000, engagement: 8800 },
  { date: "Week 4", reach: 61000, impressions: 168000, engagement: 11500 },
  { date: "Week 5", reach: 58000, impressions: 155000, engagement: 10800 },
  { date: "Week 6", reach: 72000, impressions: 195000, engagement: 14200 },
]

const correlationData = [
  { metric: "Impressions", revenueCorr: 0.82, footfallCorr: 0.75 },
  { metric: "Reach", revenueCorr: 0.78, footfallCorr: 0.71 },
  { metric: "Engagement", revenueCorr: 0.91, footfallCorr: 0.85 },
  { metric: "Click Rate", revenueCorr: 0.88, footfallCorr: 0.79 },
  { metric: "Shares", revenueCorr: 0.72, footfallCorr: 0.68 },
]

const campaigns = [
  { name: "Summer Flash Sale", reach: 85000, engagement: 12.5, conversion: 4.2, revenue: 450 },
  { name: "Member Exclusive", reach: 42000, engagement: 18.2, conversion: 6.8, revenue: 320 },
  { name: "Weekend Warriors", reach: 65000, engagement: 14.8, conversion: 5.1, revenue: 380 },
  { name: "Back to School", reach: 78000, engagement: 11.2, conversion: 3.9, revenue: 410 },
]

const kpis = [
  { 
    label: "Total Reach", 
    value: "336K", 
    change: "+23.5%", 
    trend: "up",
    icon: Eye,
    description: "Total unique users reached across all platforms"
  },
  { 
    label: "Impressions", 
    value: "913K", 
    change: "+31.2%", 
    trend: "up",
    icon: MousePointer,
    description: "Total content views and ad impressions"
  },
  { 
    label: "Engagement Rate", 
    value: "8.4%", 
    change: "+2.1%", 
    trend: "up",
    icon: Heart,
    description: "Average engagement across campaigns"
  },
  { 
    label: "Share Rate", 
    value: "3.2%", 
    change: "-0.4%", 
    trend: "down",
    icon: Share2,
    description: "Content sharing and virality metric"
  },
]

export function PerformanceHub() {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "quarter">("month")
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)

  const totalBefore = revenueComparison.reduce((sum, d) => sum + d.before, 0)
  const totalAfter = revenueComparison.reduce((sum, d) => sum + d.after, 0)
  const revenueGrowth = ((totalAfter - totalBefore) / totalBefore * 100).toFixed(1)

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Performance & Impact Hub</h1>
            <p className="text-muted-foreground">Revenue analysis and Meta metrics correlation</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            <div className="flex rounded-lg border border-border overflow-hidden">
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

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon
            return (
              <Card key={kpi.label} className="bg-card border-border shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
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
                      <p className={`text-sm flex items-center gap-1 ${
                        kpi.trend === "up" ? "text-primary" : "text-destructive"
                      }`}>
                        {kpi.trend === "up" ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                        {kpi.change}
                      </p>
                    </div>
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                      kpi.trend === "up" ? "bg-primary/10" : "bg-destructive/10"
                    }`}>
                      <Icon className={`h-6 w-6 ${kpi.trend === "up" ? "text-primary" : "text-destructive"}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Revenue Before vs After */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Revenue Comparison: Before vs After
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Compare revenue before and after implementing AI strategies</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>Impact of AI-driven marketing strategies (in millions IDR)</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Growth</p>
                  <p className="text-2xl font-bold text-primary">+{revenueGrowth}%</p>
                </div>
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
                      color: "var(--foreground)"
                    }}
                    formatter={(value: number, name: string) => [
                      `IDR ${value}M`,
                      name === "before" ? "Before AI" : "After AI"
                    ]}
                  />
                  <Legend 
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-foreground text-sm">
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
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Meta Metrics Trend
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Weekly trends for Reach, Impressions, and Engagement</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>Social media performance over time</CardDescription>
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
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        color: "var(--foreground)"
                      }}
                      formatter={(value: number) => [value.toLocaleString(), ""]}
                    />
                    <Legend 
                      iconType="circle"
                      formatter={(value) => <span className="text-foreground text-sm capitalize">{value}</span>}
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
                      dataKey="engagement"
                      stroke="var(--chart-3)"
                      strokeWidth={2}
                      fill="url(#engagementGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Correlation Analysis */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Metrics Correlation
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Correlation between Meta metrics and business outcomes</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>Impact correlation scores (0-1)</CardDescription>
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
                        color: "var(--foreground)"
                      }}
                      formatter={(value: number) => [(value * 100).toFixed(0) + "%", ""]}
                    />
                    <Legend 
                      iconType="circle"
                      formatter={(value) => (
                        <span className="text-foreground text-sm">
                          {value === "revenueCorr" ? "Revenue Correlation" : "Footfall Correlation"}
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

        {/* Campaign Performance Table */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle>Campaign Performance</CardTitle>
            <CardDescription>Individual campaign metrics and ROI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Campaign</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Reach</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Engagement</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Conversion</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Revenue</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign, idx) => (
                    <tr 
                      key={campaign.name}
                      className={`border-b border-border/30 cursor-pointer transition-colors hover:bg-secondary/30 ${
                        selectedCampaign === campaign.name ? "bg-primary/5" : ""
                      }`}
                      onClick={() => setSelectedCampaign(
                        selectedCampaign === campaign.name ? null : campaign.name
                      )}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                            idx === 0 ? "bg-chart-3/10" : "bg-secondary"
                          }`}>
                            {idx === 0 ? (
                              <TrendingUp className="h-4 w-4 text-chart-3" />
                            ) : (
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <span className="font-medium">{campaign.name}</span>
                        </div>
                      </td>
                      <td className="text-right py-4 px-4">{campaign.reach.toLocaleString()}</td>
                      <td className="text-right py-4 px-4">{campaign.engagement}%</td>
                      <td className="text-right py-4 px-4">{campaign.conversion}%</td>
                      <td className="text-right py-4 px-4 font-medium">IDR {campaign.revenue}M</td>
                      <td className="text-right py-4 px-4">
                        <Badge 
                          variant={campaign.conversion > 5 ? "default" : "secondary"}
                          className={campaign.conversion > 5 ? "bg-primary/10 text-primary border-0" : ""}
                        >
                          {campaign.conversion > 5 ? "High" : "Medium"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
