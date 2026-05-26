"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

import {
  Users,
  TrendingUp,
  Gift,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Info
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
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend
} from "recharts"

const occupancyData = [
  { time: "9AM", rate: 35 },
  { time: "10AM", rate: 48 },
  { time: "11AM", rate: 62 },
  { time: "12PM", rate: 78 },
  { time: "1PM", rate: 85 },
  { time: "2PM", rate: 82 },
  { time: "3PM", rate: 75 },
  { time: "4PM", rate: 88 },
  { time: "5PM", rate: 92 },
  { time: "6PM", rate: 95 },
  { time: "7PM", rate: 89 },
  { time: "8PM", rate: 72 },
]

const segmentData = [
  { name: "Premium", value: 35, color: "var(--chart-1)" },
  { name: "Regular", value: 40, color: "var(--chart-2)" },
  { name: "Budget", value: 15, color: "var(--chart-3)" },
  { name: "New", value: 10, color: "var(--chart-4)" },
]

const revenueData = [
  { month: "Jan", actual: 420, target: 450 },
  { month: "Feb", actual: 480, target: 470 },
  { month: "Mar", actual: 510, target: 500 },
  { month: "Apr", actual: 490, target: 520 },
  { month: "May", actual: 550, target: 540 },
  { month: "Jun", actual: 580, target: 560 },
]

const promoData = [
  { name: "Flash Sale", redeemed: 85 },
  { name: "Weekend Deal", redeemed: 72 },
  { name: "Member Exclusive", redeemed: 91 },
  { name: "Holiday Special", redeemed: 68 },
  { name: "Bundle Offer", redeemed: 45 },
]

/* =========================
   REVENUE GAP DATA
========================= */
const actualRevenue = 35
const targetRevenue = 50

const achievement = (actualRevenue / targetRevenue) * 100

const revenueGapData = [
  {
    name: "Achieved",
    value: achievement,
    color: "#C96ACF"
  },
  {
    name: "Remaining",
    value: 100 - achievement,
    color: "#ECECEC"
  }
]

const metrics = [
  {
    title: "Occupancy Rate",
    value: "87.5%",
    change: "+5.2%",
    trend: "up",
    description: "Current field occupancy rate",
    icon: Users,
  },
  {
    title: "Low Segment",
    value: "Premium",
    change: "35% share",
    trend: "up",
    description: "Lowest performing customer",
    icon: TrendingUp,
  },
  {
    title: "Promo Redemption",
    value: "72.3%",
    change: "+8.1%",
    trend: "up",
    description: "Active promotion redemption rate",
    icon: Gift,
  },
  {
    title: "Revenue",
    value: "Rp 35M",
    change: "RP. 5M From last month",
    trend: "down",
    description: "Revenue achievement compared to last month",
    icon: Target,
  },
]

export function AnalyticsDashboard() {

  return (
    <TooltipProvider>

      <div className="space-y-6">

        {/* =========================
            HEADER
        ========================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div>
            <h1 className="text-2xl font-bold">
              Analytics Dashboard
            </h1>

            <p className="text-muted-foreground">
              Real-time insights for Maiin Gandaria
            </p>
          </div>

          <div className="flex items-center gap-2">

            <Badge variant="outline" className="gap-1">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Live
            </Badge>

            <span className="text-sm text-muted-foreground">
              Last updated: 2 min ago
            </span>

          </div>
        </div>

        {/* =========================
            KPI CARDS
        ========================= */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {metrics.map((metric) => {

            const Icon = metric.icon

            return (
              <Card
                key={metric.title}
                className="bg-card border-border shadow-sm hover:shadow-md transition-shadow"
              >

                <CardHeader className="flex flex-row items-center justify-between pb-2">

                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </CardTitle>

                  <Tooltip>

                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground">
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>

                    <TooltipContent>
                      <p>{metric.description}</p>
                    </TooltipContent>

                  </Tooltip>

                </CardHeader>

                <CardContent>

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-2xl font-bold">
                        {metric.value}
                      </p>

                      <p
                        className={`text-[10px] flex items-center gap-1 ${
                          metric.trend === "up"
                            ? "text-primary"
                            : "text-destructive"
                        }`}
                      >

                        {metric.trend === "up"
                          ? <ArrowUpRight className="h-3 w-3" />
                          : <ArrowDownRight className="h-3 w-3" />
                        }

                        {metric.change}

                      </p>

                    </div>

                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>

                  </div>

                </CardContent>

              </Card>
            )
          })}
        </div>

        {/* =========================
            ROW 1
        ========================= */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* OCCUPANCY */}
          <Card className="bg-card border-border shadow-sm">

            <CardHeader>

              <CardTitle className="flex items-center gap-2">
                Occupancy Rate Trend

                <Tooltip>

                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>

                  <TooltipContent>
                    <p>Hourly Field occupancy percentage today</p>
                  </TooltipContent>

                </Tooltip>

              </CardTitle>

              <CardDescription>
                Hourly occupancy throughout the day
              </CardDescription>

            </CardHeader>

            <CardContent>

              <div className="h-[280px]">

                <ResponsiveContainer width="100%" height="100%">

                  <AreaChart data={occupancyData}>

                    <defs>

                      <linearGradient
                        id="occupancyGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >

                        <stop
                          offset="5%"
                          stopColor="var(--chart-1)"
                          stopOpacity={0.3}
                        />

                        <stop
                          offset="95%"
                          stopColor="var(--chart-1)"
                          stopOpacity={0}
                        />

                      </linearGradient>

                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="time"
                      stroke="var(--muted-foreground)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      height={30}
                      tickMargin={4}
                      minTickGap={-10}
                    />

                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}%`}
                    />

                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        color: "var(--foreground)"
                      }}
                      formatter={(value: number) => [`${value}%`, "Occupancy"]}
                    />

                    <Area
                      type="monotone"
                      dataKey="rate"
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      fill="url(#occupancyGradient)"
                    />

                  </AreaChart>

                </ResponsiveContainer>

              </div>

            </CardContent>
          </Card>

          {/* REVENUE GAP */}
<Card className="bg-card border-border shadow-sm">

  <CardHeader>

    <CardTitle className="flex items-center gap-2">
      Revenue Gap Performance

      <Tooltip>

        <TooltipTrigger>
          <Info className="h-4 w-4 text-muted-foreground" />
        </TooltipTrigger>

        <TooltipContent>
          <p>Current revenue achievement compared to target</p>
        </TooltipContent>

      </Tooltip>

    </CardTitle>

    <CardDescription>
      Revenue target achievement progress
    </CardDescription>

  </CardHeader>

  <CardContent>

    <div className="h-[280px] relative flex items-center justify-center">

      <ResponsiveContainer width="100%" height="100%">

        <PieChart>

          <Pie
            data={revenueGapData}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            innerRadius={90}
            outerRadius={115}
            stroke="none"
            cornerRadius={10}
          >

            {revenueGapData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
              />
            ))}

          </Pie>

          <RechartsTooltip
            formatter={(value: number) => [
              `${value.toFixed(0)}%`,
              "Revenue"
            ]}
          />

        </PieChart>

      </ResponsiveContainer>

      {/* CENTER TEXT */}
      <div className="absolute flex flex-col items-center justify-center">

        <span className="text-5xl font-bold text-[#C96ACF]">
          {achievement.toFixed(0)}%
        </span>

        <span className="text-sm font-medium text-[#C96ACF]">
          Actual: Rp {actualRevenue}M
        </span>

        <span className="text-xs text-muted-foreground">
          Target: Rp {targetRevenue}M
        </span>

      </div>

    </div>

  </CardContent>

</Card>
</div>
        {/* =========================
            ROW 2
        ========================= */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* REVENUE VS TARGET */}
          <Card className="bg-card border-border shadow-sm">

            <CardHeader>

              <CardTitle className="flex items-center gap-2">
                Revenue vs Target
              </CardTitle>

              <CardDescription>
                Monthly performance comparison
              </CardDescription>

            </CardHeader>

            <CardContent>

              <div className="h-[280px]">

                <ResponsiveContainer width="100%" height="100%">

                  <BarChart data={revenueData}>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />

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
                    />

                    <RechartsTooltip />

                    <Legend />

                    <Bar
                      dataKey="actual"
                      fill="var(--chart-1)"
                      radius={[4, 4, 0, 0]}
                    />

                    <Bar
                      dataKey="target"
                      fill="var(--chart-2)"
                      radius={[4, 4, 0, 0]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>

            </CardContent>
          </Card>

          {/* CUSTOMER SEGMENTS */}
          <Card className="bg-card border-border shadow-sm">

            <CardHeader>

              <CardTitle>
                Customer Segments
              </CardTitle>

              <CardDescription>
                Breakdown by customer category
              </CardDescription>

            </CardHeader>

            <CardContent>

              <div className="h-[280px] flex items-center">

                <ResponsiveContainer width="100%" height="100%">

                  <PieChart>

                    <Pie
                      data={segmentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >

                      {segmentData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                        />
                      ))}

                    </Pie>

                    <Legend />

                    <RechartsTooltip />

                  </PieChart>

                </ResponsiveContainer>

              </div>

            </CardContent>
          </Card>
        </div>

        {/* =========================
            ROW 3
        ========================= */}
        <Card className="bg-card border-border shadow-sm">

          <CardHeader>

            <CardTitle>
              Promo Redemption Rates
            </CardTitle>

            <CardDescription>
              Active promotion performance
            </CardDescription>

          </CardHeader>

          <CardContent>

            <div className="h-[320px]">

              <ResponsiveContainer width="100%" height="100%">

                <BarChart
                  data={promoData}
                  layout="vertical"
                  barSize={20}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    horizontal={false}
                  />

                  <XAxis
                    type="number"
                    domain={[0, 100]}
                  />

                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                  />

                  <RechartsTooltip />

                  <Bar
                    dataKey="redeemed"
                    fill="var(--chart-3)"
                    radius={[0, 4, 4, 0]}
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </CardContent>
        </Card>

      </div>
    </TooltipProvider>
  )
}

