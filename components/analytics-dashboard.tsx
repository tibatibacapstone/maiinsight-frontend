"use client"

import { useEffect, useRef, useState } from "react"
import { getApiUrl } from "@/lib/api"

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
type OccupancyTrendPoint = {
  label: string
  displayLabel?: string
  month?: string
  date?: string
  bookedSessions: number
  availableSessions: number
  rate: number
}

type OccupancyTrendResponse = {
  success: boolean
  message: string
  data?: OccupancyTrendPoint[]
}
type OverviewKpiData = {
  occupancyRate: number
  occupancyChange: number
  totalRevenue: number
  revenueChange: number
  lowSessionLabel: string
  lowSessionCount: number
  totalBookedSessions: number
  availableSessions: number
}

type OverviewKpiResponse = {
  success: boolean
  message: string
  data?: OverviewKpiData
}

type SessionByTimeItem = {
  play_time_group?: string
  playTimeGroup?: string
  session_count?: number
  sessionCount?: number
  value?: number
}

type HeatmapItem = {
  day_short?: string
  dayShort?: string
  startHour?: number
  start_hour?: number
  session_count?: number
  sessionCount?: number
}

type SegmentSummary = {
  id: number
  playtimeCluster: number
  playtimeSegment: string
  totalCustomers: number
  avgRatioPagi: number
  avgRatioSiang: number
  avgRatioMalam: number
  avgSesiPagi: number
  avgSesiSiang: number
  avgSesiMalam: number
  avgTotalSesi: number
}

type PlaytimeMlData = {
  id: number
  period?: string | null
  clusterCount: number
  totalCustomers: number
  totalSessions: number
  sessionByTime?: unknown
  heatmapData?: unknown
  topHourData?: unknown
  segmentSummaries?: SegmentSummary[]
}

type PlaytimeMlResponse = {
  success: boolean
  message: string
  data?: PlaytimeMlData
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
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return []
}

const playtimeColors: Record<string, string> = {
  Pagi: "var(--chart-1)",
  Siang: "var(--chart-2)",
  Malam: "var(--chart-3)",
}

const segmentColors: Record<string, string> = {
  "Morning Player": "var(--chart-1)",
  "Afternoon Player": "var(--chart-2)",
  "Night Player": "var(--chart-3)",
}
const monthShortNames = [
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

const formatShortDateLabel = (dateValue?: string) => {
  if (!dateValue) return ""

  const [yearText, monthText, dayText] = dateValue.split("-")

  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!year || !month || !day) return dateValue

  return `${day} ${monthShortNames[month - 1]} '${String(year).slice(-2)}`
}
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
  const [occupancyTrendData, setOccupancyTrendData] = useState<
  OccupancyTrendPoint[]
>([])

const [isLoadingOccupancyTrend, setIsLoadingOccupancyTrend] = useState(false)
  const [overviewKpi, setOverviewKpi] = useState<OverviewKpiData | null>(null)
const [overviewKpiError, setOverviewKpiError] = useState("")
  const [playtimeMlData, setPlaytimeMlData] = useState<PlaytimeMlData | null>(null)
const [isLoadingPlaytimeMl, setIsLoadingPlaytimeMl] = useState(false)
const [playtimeMlError, setPlaytimeMlError] = useState("")
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"cluster" | "profile" | "radar">("cluster")
  const [periodType, setPeriodType] = useState<"MTD" | "YTD">("MTD")
  const periodOptions = ["MTD", "YTD"] as const

const [selectedMonth, setSelectedMonth] = useState("All Month")
const [selectedYear, setSelectedYear] = useState("2025")
const [selectedVenue, setSelectedVenue] = useState("All Venue")
const [selectedCustomerType, setSelectedCustomerType] = useState("All Type")
const [openCustomerType, setOpenCustomerType] = useState(false)

const customerTypes = ["All Type", "Membership", "Non Membership"]

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

  const years = ["2022", "2023", "2024", "2025", "2026"]

  const venues = ["All Venue", "Mini Soccer", "Basket"]
  useEffect(() => {
  const fetchOverviewKpi = async () => {
    try {
      setOverviewKpiError("")

      const token = getStoredToken()

      if (!token) {
        setOverviewKpiError("Token not found.")
        return
      }

       const params = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear,
        periodType,
        venue: selectedVenue,
        customerType: selectedCustomerType,
      })

      const response = await fetch(
        getApiUrl(`/dashboard/overview-kpis?${params.toString()}`),
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      
      const result: OverviewKpiResponse = await response.json()

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || "Failed to fetch overview KPI.")
      }

      setOverviewKpi(result.data)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch overview KPI."

      console.warn("Overview KPI fetch failed:", message)
      setOverviewKpiError(message)
    }
  }

  fetchOverviewKpi()
}, [
  selectedMonth,
  selectedYear,
  periodType,
  selectedVenue,
  selectedCustomerType,
])
useEffect(() => {
  const fetchOccupancyTrend = async () => {
    try {
      setIsLoadingOccupancyTrend(true)

      const token = getStoredToken()

      if (!token) {
        console.warn("Token not found for occupancy trend.")
        setOccupancyTrendData([])
        return
      }

      const params = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear,
        periodType,
        venue: selectedVenue,
        customerType: selectedCustomerType,
      })

      const url = getApiUrl(`/dashboard/occupancy-trend?${params.toString()}`)

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result: OccupancyTrendResponse | null = await response
        .json()
        .catch(() => null)

      if (response.status === 401 || response.status === 403) {
        console.warn("Token expired. Please login again.")
        setOccupancyTrendData([])
        return
      }

      if (!response.ok || !result?.success || !Array.isArray(result.data)) {
        console.warn("Invalid occupancy trend response:", result)
        setOccupancyTrendData([])
        return
      }

     const isDailyTrend = selectedMonth !== "All Month" && periodType === "MTD"

const normalizedData = result.data.map((item) => ({
  label: item.label,
  displayLabel:
    isDailyTrend && item.date
      ? formatShortDateLabel(item.date)
      : item.label,
  month: item.month,
  date: item.date,
  bookedSessions: Number(item.bookedSessions || 0),
  availableSessions: Number(item.availableSessions || 0),
  rate: Number(item.rate || 0),
}))

      setOccupancyTrendData(normalizedData)
    } catch (error) {
      console.warn("Failed to fetch occupancy trend:", error)
      setOccupancyTrendData([])
    } finally {
      setIsLoadingOccupancyTrend(false)
    }
  }

  fetchOccupancyTrend()
}, [
  selectedMonth,
  selectedYear,
  periodType,
  selectedVenue,
  selectedCustomerType,
])

  useEffect(() => {
  const fetchPlaytimeMl = async () => {
    try {
      setIsLoadingPlaytimeMl(true)
      setPlaytimeMlError("")

      const token = getStoredToken()

      if (!token) {
        setPlaytimeMlError("Token not found. Please login again.")
        return
      }

      const response = await fetch(getApiUrl("/ml/playtime/latest"), {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result: PlaytimeMlResponse = await response.json()

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || "Failed to fetch playtime ML data.")
      }

      setPlaytimeMlData(result.data)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch playtime ML data."

      console.warn("Playtime ML fetch failed:", message)
      setPlaytimeMlError(message)
    } finally {
      setIsLoadingPlaytimeMl(false)
    }
  }

  fetchPlaytimeMl()
}, [])
const sessionByTimeSource = parseJsonArray<SessionByTimeItem>(
  playtimeMlData?.sessionByTime
)

const playTimeSegmentRawData = ["Pagi", "Siang", "Malam"].map((group) => {
  const found = sessionByTimeSource.find((item) => {
    const itemGroup = item.play_time_group || item.playTimeGroup
    return itemGroup === group
  })

  const sessions = Number(
    found?.session_count ?? found?.sessionCount ?? found?.value ?? 0
  )

  return {
    name: group,
    sessions,
    color: playtimeColors[group],
  }
})

const totalPlaytimeSessions = playTimeSegmentRawData.reduce(
  (total, item) => total + item.sessions,
  0
)

const playTimeSegmentChartData = playTimeSegmentRawData.map((item) => ({
  ...item,
  percentage:
    totalPlaytimeSessions > 0
      ? Number(((item.sessions / totalPlaytimeSessions) * 100).toFixed(1))
      : 0,
}))
console.log("PLAYTIME ML DATA:", playtimeMlData)
console.log("SESSION BY TIME SOURCE:", sessionByTimeSource)
console.log("PLAYTIME RAW DATA:", playTimeSegmentRawData)
console.log("PLAYTIME CHART DATA:", playTimeSegmentChartData)
console.log("TOTAL PLAYTIME SESSIONS:", totalPlaytimeSessions)

const customerPlaytimeSegmentData =
  playtimeMlData?.segmentSummaries?.map((item) => ({
    name: item.playtimeSegment,
    value: item.totalCustomers,
    color: segmentColors[item.playtimeSegment] || "var(--chart-4)",
  })) || []

const heatmapSource = parseJsonArray<HeatmapItem>(playtimeMlData?.heatmapData)

const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const heatmapHours = Array.from(
  new Set(
    heatmapSource
      .map((item) => Number(item.startHour ?? item.start_hour))
      .filter((hour) => !Number.isNaN(hour))
  )
).sort((a, b) => a - b)

const maxHeatmapValue = Math.max(
  ...heatmapSource.map((item) =>
    Number(item.session_count ?? item.sessionCount ?? 0)
  ),
  1
)


const getHeatmapValue = (day: string, hour: number) => {
  const found = heatmapSource.find((item) => {
    const itemDay = item.day_short || item.dayShort
    const itemHour = Number(item.startHour ?? item.start_hour)

    return itemDay === day && itemHour === hour
  })

  return Number(found?.session_count ?? found?.sessionCount ?? 0)
}
const formatRevenue = (value: number) => {
  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(1)}B`
  }

  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(1)}M`
  }

  return `Rp ${value.toLocaleString("id-ID")}`
}
const dashboardMetrics = [
  {
    title: "Occupancy Rate",
    value: (
      <span className="flex items-baseline gap-1">
        <span className="text-3xl font-bold">
          {overviewKpi ? `${overviewKpi.occupancyRate}%` : "0%"}
        </span>
      </span>
    ),
    change: overviewKpi
      ? `${overviewKpi.occupancyChange >= 0 ? "+" : ""}${overviewKpi.occupancyChange}% from previous period`
      : "No data",
    trend:
      overviewKpi && overviewKpi.occupancyChange < 0 ? "down" : "up",
    description: overviewKpi
      ? `${overviewKpi.totalBookedSessions} booked sessions from ${overviewKpi.availableSessions} available slots`
      : "Current field occupancy rate",
    icon: Users,
  },
  {
    title: "Revenue",
    value: (
      <span className="flex items-baseline gap-1">
        <span className="text-3xl font-bold">
          {overviewKpi ? formatRevenue(overviewKpi.totalRevenue) : "Rp 0"}
        </span>
      </span>
    ),
    change: overviewKpi
      ? `${overviewKpi.revenueChange >= 0 ? "+" : ""}${overviewKpi.revenueChange}% from previous period`
      : "No data",
    trend:
      overviewKpi && overviewKpi.revenueChange < 0 ? "down" : "up",
    description: "Total revenue from completed transactions",
    icon: Target,
  },
  {
    title: "Low Session",
    value: (
      <span className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">
          {overviewKpi?.lowSessionLabel || "No Data"}
        </span>
      </span>
    ),
    change: overviewKpi
      ? `${overviewKpi.lowSessionCount} sessions`
      : "No data",
    trend: "down",
    description: "Lowest booking session based on day and playtime group",
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
  },
]
const isDailyOccupancyTrend =
  selectedMonth !== "All Month" && periodType === "MTD"

const occupancyXAxisInterval =
  isDailyOccupancyTrend && occupancyTrendData.length > 20 ? 1 : 0

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
              </Badge>

              <span className="text-sm text-muted-foreground">
                Last updated: 2 min ago
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
          {dashboardMetrics.map((metric) => {
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
  <Card className="bg-card border-border shadow-sm">
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
  {isLoadingOccupancyTrend ? (
    <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
      Loading occupancy trend...
    </div>
  ) : occupancyTrendData.length === 0 ? (
    <div className="h-[300px] flex flex-col items-center justify-center text-sm text-muted-foreground">
      <p>No occupancy trend data available.</p>
      <p className="text-xs">
        Check API /dashboard/occupancy-trend for year {selectedYear}.
      </p>
    </div>
  ) : (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
       <AreaChart
  data={occupancyTrendData}
  margin={{
    top: 10,
    right: 24,
    left: 8,
    bottom: 8,
  }}
>
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
    dataKey="displayLabel"
    stroke="var(--muted-foreground)"
    fontSize={9}
    tickLine={false}
    axisLine={false}
    interval={occupancyXAxisInterval}
    height={isDailyOccupancyTrend ? 58 : 30}
    tickMargin={isDailyOccupancyTrend ? 12 : 4}
    angle={isDailyOccupancyTrend ? -45 : 0}
    textAnchor={isDailyOccupancyTrend ? "end" : "middle"}
  />

  <YAxis
  width={50}
  domain={[0, 100]}
  stroke="var(--muted-foreground)"
  fontSize={12}
  tickLine={false}
  axisLine={false}
  tickMargin={8}
  tickFormatter={(value) => `${value}%`}
/>

  <RechartsTooltip
    contentStyle={{
      backgroundColor: "var(--popover)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      color: "var(--foreground)",
    }}
    formatter={(value: any, name: any, props: any) => {
      if (name === "rate") {
        return [
          `${Number(value).toFixed(1)}%`,
          `Occupancy (${props.payload.bookedSessions}/${props.payload.availableSessions} sessions)`,
        ]
      }

      return [value, name]
    }}
  />

  <Area
    type="monotone"
    dataKey="rate"
    stroke="var(--chart-1)"
    strokeWidth={2}
    fill="url(#occupancyGradient)"
    dot={{ r: 3 }}
    activeDot={{ r: 5 }}
  />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )}
</CardContent>
  </Card>

</div>

{/* =========================
    ROW 2
    REVENUE VS TARGET + REVENUE VS TAYANGAN
========================= */}
<div className="grid gap-6 lg:grid-cols-2">

  {/* TREND REVENUE VS TARGET */}
  <Card className="bg-card border-border shadow-sm">
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
  <Card className="bg-card border-border shadow-sm">
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
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle>Customer Segmentation</CardTitle>

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
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle>Jam Main Segment - DATA FROM ML</CardTitle>

              <CardDescription>
                Segmentasi waktu main berdasarkan pagi, siang, dan malam
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="h-[320px] flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={playTimeSegmentChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={3}
                      dataKey="percentage"
                    >
                      {playTimeSegmentChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>

                    <Legend />

                    <RechartsTooltip
                    formatter={(value, name, props) => {
                      const sessions = props.payload.sessions

                      return [
                        `${value}% (${sessions} sessions)`,
                        name,
                      ]
                    }}
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