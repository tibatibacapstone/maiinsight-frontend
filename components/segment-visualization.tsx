"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Info, Users, TrendingUp, ShoppingBag, Clock, Filter, TimerIcon, ChevronDown } from "lucide-react"
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Cell,
  BarChart,
  Bar,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
} from "recharts"

// RFM Cluster Data (Recency, Frequency, Monetary)
const rfmClusters = [
  { name: "Champions", recency: 5, frequency: 95, monetary: 12000, count: 245, color: "var(--chart-1)" },
  { name: "Loyal", recency: 15, frequency: 75, monetary: 8500, count: 520, color: "var(--chart-2)" },
  { name: "Potential", recency: 25, frequency: 55, monetary: 5200, count: 680, color: "var(--chart-3)" },
  { name: "At Risk", recency: 45, frequency: 35, monetary: 3800, count: 310, color: "var(--chart-4)" },
  { name: "Dormant", recency: 75, frequency: 15, monetary: 1500, count: 185, color: "var(--chart-5)" },
]

const segmentProfile = [
  { segment: "Champions", avgSpend: 12000, visitFreq: 8.2, retention: 95, satisfaction: 92 },
  { segment: "Loyal", avgSpend: 8500, visitFreq: 5.5, retention: 82, satisfaction: 85 },
  { segment: "Potential", avgSpend: 5200, visitFreq: 3.2, retention: 65, satisfaction: 78 },
  { segment: "At Risk", avgSpend: 3800, visitFreq: 1.8, retention: 35, satisfaction: 62 },
  { segment: "Dormant", avgSpend: 1500, visitFreq: 0.5, retention: 12, satisfaction: 48 },
]

const radarData = [
  { metric: "Spend", Champions: 95, Loyal: 75, Potential: 55, "At Risk": 40, Dormant: 15 },
  { metric: "Frequency", Champions: 90, Loyal: 70, Potential: 50, "At Risk": 35, Dormant: 12 },
  { metric: "Recency", Champions: 98, Loyal: 80, Potential: 60, "At Risk": 30, Dormant: 10 },
  { metric: "Engagement", Champions: 92, Loyal: 78, Potential: 58, "At Risk": 38, Dormant: 18 },
  { metric: "Loyalty", Champions: 88, Loyal: 82, Potential: 45, "At Risk": 25, Dormant: 8 },
]

const segmentStats = [
  { label: "Total Customers", value: "1,940", icon: Users, change: "+12%" },
  { label: "Lowest Occupancy Rate", value: "39%", icon:  TrendingUp, change: "+8%" },
  { label: "Most Idle Time", value: "Morning", icon: Clock, change: "+5%" },
  { label: "Growth Rate", value: "15.2%", icon: TrendingUp, change: "+3%" },
]
const occupancyTrendData = [
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
const customerRfmData = [
  {
    name: "Alya Putri",
    email: "alya@gmail.com",
    phone: "081234567890",
    frequency: 12,
    recency: "2026-05-20",
    monetary: 12000000,
    segment: "Champions",
  },
  {
    name: "Rizky Pratama",
    email: "rizky@gmail.com",
    phone: "081298765432",
    frequency: 10,
    recency: "2026-05-18",
    monetary: 10500000,
    segment: "Champions",
  },
  {
    name: "Nadia Salsabila",
    email: "nadia@gmail.com",
    phone: "081377788899",
    frequency: 7,
    recency: "2026-05-10",
    monetary: 8500000,
    segment: "Loyal",
  },
  {
    name: "Dimas Ardi",
    email: "dimas@gmail.com",
    phone: "081355566677",
    frequency: 5,
    recency: "2026-04-28",
    monetary: 5200000,
    segment: "Potential",
  },
  {
    name: "Fira Maharani",
    email: "fira@gmail.com",
    phone: "081322233344",
    frequency: 2,
    recency: "2026-03-15",
    monetary: 3800000,
    segment: "At Risk",
  },
  {
    name: "Bagas Saputra",
    email: "bagas@gmail.com",
    phone: "081399900011",
    frequency: 1,
    recency: "2026-01-20",
    monetary: 1500000,
    segment: "Dormant",
  },
]
const heatmapDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const heatmapHours = Array.from({ length: 17 }, (_, index) => index + 6)
// hasil: 06 sampai 22

const formatHour = (hour: number) => {
  const period = hour >= 12 ? "PM" : "AM"
  const formattedHour = hour % 12 === 0 ? 12 : hour % 12
  return `${formattedHour} ${period}`
}

const isOpenHour = (day: string, hour: number) => {
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri"]

  if (weekday.includes(day)) {
    return hour >= 8 && hour <= 22
  }

  return hour >= 6 && hour <= 22
}

const getEmptyRate = (day: string, hour: number) => {
  if (!isOpenHour(day, hour)) return null

  // MOCK DATA
  // Nanti bagian ini bisa diganti dari hasil ML / API backend

  if (["Mon", "Tue"].includes(day) && hour >= 8 && hour <= 10) {
    return 85
  }

  if (["Sat", "Sun"].includes(day) && hour >= 6 && hour <= 8) {
    return 78
  }

  if (["Wed", "Thu"].includes(day) && hour >= 13 && hour <= 15) {
    return 55
  }

  if (["Fri", "Sat"].includes(day) && hour >= 18 && hour <= 21) {
    return 18
  }

  if (hour >= 11 && hour <= 16) {
    return 40
  }

  return 60
}

const emptySlotHeatmapData = heatmapDays.flatMap((day) =>
  heatmapHours.map((hour) => ({
    day,
    hour,
    emptyRate: getEmptyRate(day, hour),
  }))
)

const getHeatmapColor = (emptyRate: number | null) => {
  if (emptyRate === null) return "transparent"

  if (emptyRate >= 70) return "#6D3F99" // high empty
  if (emptyRate >= 40) return "#9DBFF8" // medium empty
  return "#E5E7EB" // low empty
}

const getHeatmapLabel = (emptyRate: number | null) => {
  if (emptyRate === null) return "Closed"
  if (emptyRate >= 70) return "High Empty"
  if (emptyRate >= 40) return "Medium Empty"
  return "Low Empty"
}

const EmptySlotHeatmap = () => {
  const highestEmptySlot = emptySlotHeatmapData
    .filter(
      (item): item is { day: string; hour: number; emptyRate: number } =>
        item.emptyRate !== null
    )
    .sort((a, b) => b.emptyRate - a.emptyRate)[0]

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              Empty Slot Heatmap

              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>

                <TooltipContent>
                  <p>
                    Dot heatmap menunjukkan jam kosong berdasarkan hari dan jam operasional.
                  </p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>

            <CardDescription>
              Senin-Jumat 08:00-22:00, Sabtu-Minggu 06:00-22:00
            </CardDescription>
          </div>

          <div className="text-sm font-medium text-muted-foreground lg:text-center">
            <span className="text-foreground">
              {highestEmptySlot.day} at {formatHour(highestEmptySlot.hour)}
            </span>{" "}
            has the highest empty slot
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto pb-3">
          <div className="min-w-[900px] space-y-4">

            {/* HEATMAP GRID */}
            <div
              className="grid gap-x-3 gap-y-3 items-center"
              style={{
                gridTemplateColumns: `48px repeat(${heatmapHours.length}, minmax(28px, 1fr))`,
              }}
            >
              {/* EMPTY TOP LEFT */}
              <div />

              {/* HOURS HEADER */}
              {heatmapHours.map((hour) => (
                <div
                  key={hour}
                  className="text-[10px] text-muted-foreground -rotate-45 origin-bottom-left h-8 flex items-end"
                >
                  {formatHour(hour)}
                </div>
              ))}

              {/* DAY ROWS */}
              {heatmapDays.map((day) => (
  <div key={day} className="contents">
    <div className="text-xs font-medium text-muted-foreground">
      {day}
    </div>

    {heatmapHours.map((hour) => {
      const item = emptySlotHeatmapData.find(
        (data) => data.day === day && data.hour === hour
      )

      const emptyRate = item?.emptyRate ?? null

      return (
        <Tooltip key={`${day}-${hour}`}>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center">
              <div
                className={`h-5 w-5 rounded-full transition-transform ${
                  emptyRate !== null
                    ? "cursor-pointer hover:scale-125 shadow-sm"
                    : ""
                }`}
                style={{
                  backgroundColor: getHeatmapColor(emptyRate),
                  opacity: emptyRate === null ? 0 : 1,
                }}
              />
            </div>
          </TooltipTrigger>

          <TooltipContent>
            <div className="text-xs">
              <p className="font-semibold">
                {day} - {formatHour(hour)}
              </p>

              {emptyRate === null ? (
                <p>Closed hour</p>
              ) : (
                <>
                  <p>Empty Rate: {emptyRate}%</p>
                  <p>Status: {getHeatmapLabel(emptyRate)}</p>
                </>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      )
    })}
  </div>
))}
</div>

            {/* LEGEND */}
            <div className="flex flex-col items-center gap-2 pt-2">
              <div
                className="h-3 w-[360px] rounded-full"
                style={{
                  background:
                    "linear-gradient(to right, #E5E7EB, #9DBFF8, #6D3F99)",
                }}
              />

              <div className="flex w-[360px] justify-between text-[11px] text-muted-foreground">
                <span>Low Vacancy</span>
                <span>Moderate Vacancy</span>
                <span>High Vacancy</span>
              </div>
            </div>

          </div>
        </div>
      </CardContent>
    </Card>
  )
}
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
export function SegmentVisualization() {
 
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"cluster" | "profile" | "radar">("cluster")
  const [periodType, setPeriodType] = useState<"MTD" | "YTD">("MTD")
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

const years = ["2022", "2023", "2024", "2025", "2026"]

const venues = ["All Venue", "Mini Soccer", "Basket"]
const [showCustomerTable, setShowCustomerTable] = useState(false)

const selectedCustomerTable = customerRfmData.filter(
  (customer) => customer.segment === selectedSegment
)

const closeAllDropdowns = () => {
  setOpenMonth(false)
  setOpenYear(false)
  setOpenVenue(false)
}
  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Customer Segmentation</h1>
            <p className="text-muted-foreground">RFM analysis and customer clustering insights</p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-3">
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

        {/* Stats Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {segmentStats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="bg-card border-border shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-primary">{stat.change} vs last month</p>
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
        {/* Empty Slot Heatmap */}
<EmptySlotHeatmap />
        {/* Occupancy Rate Trend */}
<Card className="bg-card border-border shadow-sm">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      Occupancy Rate Trend

      <Tooltip>
        <TooltipTrigger>
          <Info className="h-4 w-4 text-muted-foreground" />
        </TooltipTrigger>

        <TooltipContent>
          <p>Hourly occupancy trend based on transaction activity</p>
        </TooltipContent>
      </Tooltip>
    </CardTitle>

    <CardDescription>
      Hourly occupancy throughout the day
    </CardDescription>
  </CardHeader>

  <CardContent>
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={occupancyTrendData}>
          <defs>
            <linearGradient
              id="segmentOccupancyGradient"
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
            fontSize={12}
            tickLine={false}
            axisLine={false}
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
            formatter={(value) => [`${value}%`, "Occupancy"]}
          />

          <Area
            type="monotone"
            dataKey="rate"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#segmentOccupancyGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </CardContent>
</Card>

        {/* Segment Legend */}
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              {rfmClusters.map((cluster) => (
                <button
                  key={cluster.name}
                  onClick={() => {
                    setSelectedSegment(selectedSegment === cluster.name ? null : cluster.name)
                    setShowCustomerTable(false)
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${
                    selectedSegment === cluster.name
                      ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                      : "border-border hover:border-primary/50 bg-secondary/50"
                  }`}
                >
                  <span 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: cluster.color }}
                  />
                  <span className="font-medium">{cluster.name}</span>
                  <Badge variant="secondary" className="text-xs">{cluster.count}</Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Visualization */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* RFM Scatter Plot */}
          <Card className="lg:col-span-2 bg-card border-border shadow-sm">
  <CardHeader>
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

      {/* LEFT TITLE */}
      <div>
        <CardTitle className="flex items-center gap-2">
          {viewMode === "cluster" && "RFM Cluster Map"}
          {viewMode === "profile" && "Segment Profile Comparison"}
          {viewMode === "radar" && "Segment Radar Analysis"}

          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>

            <TooltipContent>
              <p>
                {viewMode === "cluster" &&
                  "Recency vs Frequency with bubble size representing monetary value"}
                {viewMode === "profile" &&
                  "Compare key metrics across all customer segments"}
                {viewMode === "radar" &&
                  "Multi-dimensional view of segment characteristics"}
              </p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>

        <CardDescription>
          {viewMode === "cluster" && "Interactive customer clustering visualization"}
          {viewMode === "profile" && "Side-by-side segment metrics"}
          {viewMode === "radar" && "Holistic segment performance view"}
        </CardDescription>
      </div>

      {/* RIGHT VIEW MODE BUTTON */}
      <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
        {(["cluster", "profile", "radar"] as const).map((mode) => (
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
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  {viewMode === "cluster" ? (
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis 
                        type="number" 
                        dataKey="recency" 
                        name="Recency (days)"
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        label={{ value: "Recency (days ago)", position: "bottom", fill: "var(--muted-foreground)", fontSize: 12 }}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="frequency" 
                        name="Frequency"
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        label={{ value: "Frequency (%)", angle: -90, position: "insideLeft", fill: "var(--muted-foreground)", fontSize: 12 }}
                      />
                      <ZAxis type="number" dataKey="monetary" range={[100, 1000]} />
                      <RechartsTooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        contentStyle={{
                          backgroundColor: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          color: "var(--foreground)"
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === "Recency (days)") return [`${value} days`, "Last Visit"]
                          if (name === "Frequency") return [`${value}%`, "Visit Frequency"]
                          return [value, name]
                        }}
                      />
                      <Scatter name="Customers" data={rfmClusters}>
                        {rfmClusters.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            opacity={selectedSegment ? (selectedSegment === entry.name ? 1 : 0.2) : 0.8}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  ) : viewMode === "profile" ? (
                    <BarChart data={segmentProfile} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis 
                        dataKey="segment" 
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
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          color: "var(--foreground)"
                        }}
                      />
                      <Legend 
                        iconType="circle"
                        formatter={(value) => <span className="text-foreground text-sm">{value}</span>}
                      />
                      <Bar dataKey="retention" name="Retention %" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="satisfaction" name="Satisfaction %" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="80%">
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis 
                        dataKey="metric" 
                        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                      />
                      <PolarRadiusAxis 
                        angle={30} 
                        domain={[0, 100]}
                        tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                      />
                      <Radar 
                        name="Champions" 
                        dataKey="Champions" 
                        stroke="var(--chart-1)" 
                        fill="var(--chart-1)" 
                        fillOpacity={selectedSegment === "Champions" ? 0.5 : 0.1}
                        strokeWidth={selectedSegment === "Champions" ? 2 : 1}
                      />
                      <Radar 
                        name="Loyal" 
                        dataKey="Loyal" 
                        stroke="var(--chart-2)" 
                        fill="var(--chart-2)" 
                        fillOpacity={selectedSegment === "Loyal" ? 0.5 : 0.1}
                        strokeWidth={selectedSegment === "Loyal" ? 2 : 1}
                      />
                      <Radar 
                        name="Potential" 
                        dataKey="Potential" 
                        stroke="var(--chart-3)" 
                        fill="var(--chart-3)" 
                        fillOpacity={selectedSegment === "Potential" ? 0.5 : 0.1}
                        strokeWidth={selectedSegment === "Potential" ? 2 : 1}
                      />
                      <Legend 
                        iconType="circle"
                        formatter={(value) => <span className="text-foreground text-sm">{value}</span>}
                      />
                    </RadarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Segment Details Panel */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle>Segment Details</CardTitle>
              <CardDescription>
                {selectedSegment ? `${selectedSegment} segment insights` : "Select a segment to view details"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedSegment ? (
                <>
                  {(() => {
                    const segment = rfmClusters.find(c => c.name === selectedSegment)
                    const profile = segmentProfile.find(p => p.segment === selectedSegment)
                    if (!segment || !profile) return null
                    return (
                      <>
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/30">
                          <span 
                            className="h-4 w-4 rounded-full" 
                            style={{ backgroundColor: segment.color }}
                          />
                          <div>
                            <p className="font-semibold">{segment.name}</p>
                            <p className="text-sm text-muted-foreground">{segment.count} customers</p>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-muted-foreground">Avg. Spend</span>
                            <span className="font-medium">IDR {profile.avgSpend.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-muted-foreground">Visit Frequency</span>
                            <span className="font-medium">{profile.visitFreq}x/month</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-muted-foreground">Retention Rate</span>
                            <span className="font-medium">{profile.retention}%</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-muted-foreground">Satisfaction</span>
                            <span className="font-medium">{profile.satisfaction}%</span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-muted-foreground">Last Activity</span>
                            <span className="font-medium">{segment.recency} days ago</span>
                          </div>
                        </div>

                        <Button
                          className="w-full mt-4"
                          onClick={() => setShowCustomerTable(true)}
                        >
                          View Full Analysis
                        </Button>
                      </>
                    )
                  })()}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mb-4 opacity-50" />
                  <p>Click on a segment to view detailed metrics and insights</p>
                </div>
              )}
            </CardContent>
          </Card>
          {showCustomerTable && selectedSegment && (
  <Card className="lg:col-span-3 w-full min-h-[420px] bg-card border-border shadow-sm">
    <CardHeader className="flex flex-row items-start justify-between gap-4">
      <div>
        <CardTitle>
          Customer List - {selectedSegment}
        </CardTitle>

        <CardDescription>
          Detail RFM customer berdasarkan segment yang dipilih
        </CardDescription>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowCustomerTable(false)}
      >
        Close
      </Button>
    </CardHeader>

    <CardContent>
      <div className="w-full max-h-[330px] overflow-auto rounded-lg border border-border">
        <table className="w-full min-w-[1200px] text-sm border-collapse">
          <thead className="bg-secondary/40 sticky top-0 z-10">
            <tr className="border-b">
              <th className="text-left px-5 py-4 font-medium whitespace-nowrap">
                Customer Name
              </th>
              <th className="text-left px-5 py-4 font-medium whitespace-nowrap">
                Email
              </th>
              <th className="text-left px-5 py-4 font-medium whitespace-nowrap">
                Phone
              </th>
              <th className="text-left px-5 py-4 font-medium whitespace-nowrap">
                Frequency
              </th>
              <th className="text-left px-5 py-4 font-medium whitespace-nowrap">
                Recency
              </th>
              <th className="text-left px-5 py-4 font-medium whitespace-nowrap">
                Monetary
              </th>
              <th className="text-left px-5 py-4 font-medium whitespace-nowrap">
                Segment
              </th>
            </tr>
          </thead>

          <tbody>
            {selectedCustomerTable.length > 0 ? (
              selectedCustomerTable.map((customer, index) => (
                <tr
                  key={`${customer.email}-${index}`}
                  className="border-b hover:bg-secondary/30 transition-colors"
                >
                  <td className="px-5 py-4 font-medium whitespace-nowrap">
                    {customer.name}
                  </td>

                  <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                    {customer.email}
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap">
                    {customer.phone}
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap">
                    {customer.frequency}
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap">
                    {customer.recency}
                  </td>

                  <td className="px-5 py-4 font-medium whitespace-nowrap">
                    IDR {customer.monetary.toLocaleString("id-ID")}
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap">
                    <Badge variant="secondary">
                      {customer.segment}
                    </Badge>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-10 text-center text-muted-foreground"
                >
                  No customer data found for this segment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
)}
        </div>
      </div>
    </TooltipProvider>
  )
}
