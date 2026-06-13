"use client"

import { useEffect, useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

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
  Info,
  ChevronDown
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
  Legend,
  LineChart,
  Line,
  ComposedChart,
} from "recharts"

/* =========================
   DATA
========================= */

const occupancyData = [
  { time: "Jan", rate: 35 },
  { time: "Feb", rate: 48 },
  { time: "Mar", rate: 62 },
  { time: "Apr", rate: 78 },
  { time: "May", rate: 85 },
  { time: "Jun", rate: 82 },
  { time: "Jul", rate: 75 },
  { time: "Aug", rate: 88 },
  { time: "Sept", rate: 92 },
  { time: "Oct", rate: 95 },
  { time: "Nov", rate: 89 },
  { time: "Dec", rate: 72 },
]

const revenueTargetTrendData = [
  { month: "Jan", revenue: 35, target: 40 },
  { month: "Feb", revenue: 38, target: 40 },
  { month: "Mar", revenue: 42, target: 38 },
  { month: "Apr", revenue: 39, target: 55 },
  { month: "May", revenue: 47, target: 50 },
  { month: "Jun", revenue: 52, target: 50 },
  { month: "Jul", revenue: 35, target: 30 },
  { month: "Aug", revenue: 38, target: 20 },
  { month: "Sept", revenue: 42, target: 50 },
  { month: "Oct", revenue: 39, target: 40 },
  { month: "Nov", revenue: 47, target: 55 },
  { month: "Dec", revenue: 52, target: 60 },
]

const revenueViewData = [
  { month: "Jan", revenue: 35, tayangan: 1200 },
  { month: "Feb", revenue: 38, tayangan: 1500 },
  { month: "Mar", revenue: 42, tayangan: 1800 },
  { month: "Apr", revenue: 39, tayangan: 1600 },
  { month: "May", revenue: 47, tayangan: 2100 },
  { month: "Jun", revenue: 52, tayangan: 2400 },
  { month: "Jul", revenue: 35, tayangan: 1200 },
  { month: "Aug", revenue: 38, tayangan: 1500 },
  { month: "Sept", revenue: 42, tayangan: 1800 },
  { month: "Oct", revenue: 39, tayangan: 1600 },
  { month: "Nov", revenue: 47, tayangan: 2100 },
  { month: "Dec", revenue: 52, tayangan: 2400 },
  
]

const customerSegmentData = [
  { name: "Champions", value: 245, color: "var(--chart-1)" },
  { name: "Loyal", value: 520, color: "var(--chart-2)" },
  { name: "Potential", value: 680, color: "var(--chart-3)" },
  { name: "At Risk", value: 310, color: "var(--chart-4)" },
]

const playTimeSegmentData = [
  { name: "Pagi", value: 30, color: "var(--chart-1)" },
  { name: "Siang", value: 45, color: "var(--chart-2)" },
  { name: "Malam", value: 25, color: "var(--chart-3)" },
]

const LAST_SYNC_KEY = "maiinLastDataSyncAt"

const formatLastUpdated = (value: string | null) => {
  if (!value) return "No data sync yet"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "No data sync yet"

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

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
    color: "#C96ACF",
  },
  {
    name: "Remaining",
    value: 100 - achievement,
    color: "#ECECEC",
  },
]

const metrics = [
  {
  title: "Occupancy Rate",
  value: (
    <span className="flex items-baseline gap-1">
      <span className="text-3xl font-bold">87.5%</span>
      <span className="text-sm font-medium text-muted-foreground">
      </span>
    </span>
  ),
  change: "+5.2% From last month",
  trend: "up",
  description: "Current field occupancy rate",
  icon: Users,
},
  {
  title: "Revenue",
  value: (
    <span className="flex items-baseline gap-1">
      <span className="text-3xl font-bold">Rp 35M</span>
      <span className="text-sm font-medium text-muted-foreground">
      </span>
    </span>
  ),
  change: "Rp.5.43M From last month",
  trend: "up",
  description: "Revenue achievement compared to last month",
  icon: Target,
},
  {
  title: "Low Session",
  value: (
    <span className="flex items-baseline gap-1">
      <span className="text-2xl font-bold">Monday Morning</span>
      <span className="text-sm font-medium text-muted-foreground">
      </span>
    </span>
  ),
  change: "0 Custome",
  trend: "up",
  description: "Lowest session in selected period",
  icon: TrendingUp,
},
  {
  title: "At Risk Customer",
  value: (
    <span className="flex items-baseline gap-1">
      <span className="text-3xl font-bold">12</span>
      <span className="text-sm font-medium text-muted-foreground">
        Inactive Cust
      </span>
    </span>
  ),
  change: "7.5% from last month",
  trend: "up",
  description: "Customers who have not been active recently",
  icon: Gift,
}
]

/* =========================
   DROPDOWN COMPONENT
========================= */

type DropdownProps = {
  options: string[]
  selected: string
  setSelected: (value: string) => void
  open: boolean
  setOpen: (value: boolean) => void
}

const Dropdown = ({
  options,
  selected,
  setSelected,
  open,
  setOpen,
}: DropdownProps) => {
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-4 py-2 border rounded-xl text-sm bg-background min-w-[130px] flex items-center justify-between gap-2"
      >
        <span>{selected}</span>

        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute mt-2 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
          {options.map((item) => (
            <div
              key={item}
              onClick={() => {
                setSelected(item)
                setOpen(false)
              }}
              className="px-4 py-2 text-sm hover:bg-muted cursor-pointer"
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* =========================
   DASHBOARD
========================= */

export function AnalyticsDashboard() {
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"cluster" | "profile" | "radar">("cluster")
  const [periodType, setPeriodType] = useState<"MTD" | "YTD">("MTD")
  const [lastUpdated, setLastUpdated] = useState("No data sync yet")
  const [dashboardVersion, setDashboardVersion] = useState(0)
  const periodOptions = ["MTD", "YTD"] as const

const [selectedMonth, setSelectedMonth] = useState("All Month")
const [selectedYear, setSelectedYear] = useState("2024")
const [selectedVenue, setSelectedVenue] = useState("All Venue")
const [selectedCustomerType, setSelectedCustomerType] = useState("All Type")
const [openCustomerType, setOpenCustomerType] = useState(false)

const customerTypes = ["All Type", "Membership", "Online"]

const [openMonth, setOpenMonth] = useState(false)
const [openYear, setOpenYear] = useState(false)
const [openVenue, setOpenVenue] = useState(false)

  const months = [
    "All Month",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sept",
    "Oct",
    "Nov",
    "Dec",
  ]

  const years = ["2022", "2023", "2024", "2025"]

  const venues = ["All Venue", "Mini Soccer", "Basket"]

  useEffect(() => {
    const syncLabel = () => {
      const storedTimestamp = localStorage.getItem(LAST_SYNC_KEY)
      setLastUpdated(formatLastUpdated(storedTimestamp))
    }

    syncLabel()

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LAST_SYNC_KEY) {
        syncLabel()
        setDashboardVersion((current) => current + 1)
      }
    }

    const handleSyncUpdate = () => {
      syncLabel()
      setDashboardVersion((current) => current + 1)
    }

    window.addEventListener("storage", handleStorage)
    window.addEventListener("maiin-data-sync-updated", handleSyncUpdate as EventListener)

    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("maiin-data-sync-updated", handleSyncUpdate as EventListener)
    }
  }, [])

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* =========================
            HEADER
        ========================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>

            <p className="text-muted-foreground">
              Real-time insights for Maiin Gandaria
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Live
              </Badge>

              <span className="text-sm text-muted-foreground">
                Last updated: {lastUpdated}
              </span>
            </div>

             {/* FILTERS */}
<div className="flex items-center gap-2 flex-wrap">

  {/* MONTH */}
  <Dropdown
    options={months}
    selected={selectedMonth}
    setSelected={setSelectedMonth}
    open={openMonth}
    setOpen={setOpenMonth}
  />

  {/* YEAR */}
  <Dropdown
    options={years}
    selected={selectedYear}
    setSelected={setSelectedYear}
    open={openYear}
    setOpen={setOpenYear}
  />

  {/* MTD / YTD */}
  <div className="flex border rounded-xl overflow-hidden">
  {periodOptions.map((type) => (
    <button
      key={type}
      onClick={() => setPeriodType(type)}
      className={`px-3 py-2 text-sm ${
        periodType === type
          ? "bg-primary text-white"
          : "bg-background text-muted-foreground"
      }`}
    >
      {type}
    </button>
  ))}
</div>

  {/* VENUE */}
  <Dropdown
    options={venues}
    selected={selectedVenue}
    setSelected={setSelectedVenue}
    open={openVenue}
    setOpen={setOpenVenue}
  />

  {/* CUSTOMER TYPE */}
  <Dropdown
    options={customerTypes}
    selected={selectedCustomerType}
    setSelected={setSelectedCustomerType}
    open={openCustomerType}
    setOpen={setOpenCustomerType}
  />

</div>
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
                      <div className="font-bold">
                        {metric.value}
                      </div>

                      <p
                        className={`text-[10px] flex items-center gap-1 ${
                          metric.trend === "up"
                            ? "text-primary"
                            : "text-destructive"
                        }`}
                      >
                        {metric.trend === "up" ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}

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
    REVENUE GAP + OCCUPANCY
========================= */}
<div className="grid gap-6 lg:grid-cols-2">

  {/* REVENUE GAP PERFORMANCE */}
  <Card key={`revenue-gap-${dashboardVersion}`} className="bg-card border-border shadow-sm">
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
      <div className="h-[300px] relative flex items-center justify-center">
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
                <Cell key={`revenue-gap-${index}`} fill={entry.color} />
              ))}
            </Pie>

            <RechartsTooltip
              formatter={(value: any) => [
                `${Number(value).toFixed(0)}%`,
                "Revenue",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>

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

  {/* OCCUPANCY RATE TREND */}
  <Card key={`occupancy-${dashboardVersion}`} className="bg-card border-border shadow-sm">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        Occupancy Rate Trend

        <Tooltip>
          <TooltipTrigger>
            <Info className="h-4 w-4 text-muted-foreground" />
          </TooltipTrigger>

          <TooltipContent>
            <p>Hourly field occupancy percentage today</p>
          </TooltipContent>
        </Tooltip>
      </CardTitle>

      <CardDescription>
        Hourly occupancy throughout the day
      </CardDescription>
    </CardHeader>

    <CardContent>
      <div className="h-[300px]">
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
                color: "var(--foreground)",
              }}
              formatter={(value: any) => [`${value}%`, "Occupancy"]}
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

</div>

{/* =========================
    ROW 2
    REVENUE VS TARGET + REVENUE VS TAYANGAN
========================= */}
<div className="grid gap-6 lg:grid-cols-2">

  {/* TREND REVENUE VS TARGET */}
  <Card key={`revenue-target-${dashboardVersion}`} className="bg-card border-border shadow-sm">
    <CardHeader>
      <CardTitle>Trend Revenue vs Target</CardTitle>

      <CardDescription>
        Bar sebagai revenue dan line sebagai target
      </CardDescription>
    </CardHeader>

    <CardContent>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={revenueTargetTrendData}>
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
              tickFormatter={(value) => `Rp ${value}M`}
            />

            <RechartsTooltip
              formatter={(value: any, name: any) => [
                `Rp ${value}M`,
                name === "revenue" ? "Revenue" : "Target",
              ]}
            />

            <Legend />

            <Bar
              dataKey="revenue"
              name="Revenue"
              fill="var(--chart-1)"
              radius={[6, 6, 0, 0]}
              barSize={36}
            />

            <Line
              type="monotone"
              dataKey="target"
              name="Target"
              stroke="var(--chart-2)"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>

  {/* TREND REVENUE VS TAYANGAN */}
  <Card key={`revenue-view-${dashboardVersion}`} className="bg-card border-border shadow-sm">
    <CardHeader>
      <CardTitle>Trend Revenue vs Tayangan</CardTitle>

      <CardDescription>
        Bar sebagai revenue dan line sebagai tayangan
      </CardDescription>
    </CardHeader>

    <CardContent>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={revenueViewData}>
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
              yAxisId="left"
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `Rp ${value}M`}
            />

            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />

            <RechartsTooltip />
            <Legend />

            <Bar
              yAxisId="left"
              dataKey="revenue"
              name="Revenue"
              fill="var(--chart-1)"
              radius={[6, 6, 0, 0]}
              barSize={36}
            />

            <Line
              yAxisId="right"
              type="monotone"
              dataKey="tayangan"
              name="Tayangan"
              stroke="var(--chart-2)"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>

</div>

        {/* =========================
            ROW 3
            PIE CUSTOMER SEGMENT + PIE JAM MAIN SEGMENT
        ========================= */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* CUSTOMER SEGMENT PIE */}
          <Card key={`customer-segment-${dashboardVersion}`} className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle>Customer Segment</CardTitle>

              <CardDescription>
                Breakdown customer by RFM segment
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="h-[320px] flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={customerSegmentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {customerSegmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>

                    <Legend />

                    <RechartsTooltip
                      formatter={(value, name) => [`${value} customers`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* JAM MAIN SEGMENT PIE */}
          <Card key={`playtime-segment-${dashboardVersion}`} className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle>Jam Main Segment</CardTitle>

              <CardDescription>
                Segmentasi waktu main berdasarkan pagi, siang, dan malam
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="h-[320px] flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={playTimeSegmentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {playTimeSegmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>

                    <Legend />

                    <RechartsTooltip
                      formatter={(value, name) => [`${value}%`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}
