"use client"

import { useEffect, useMemo, useState } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts"
import { ArrowDownRight, ArrowUpRight, ChevronDown, Gift, Info, Target, TrendingUp, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getApiUrl } from "@/lib/api"
import { getAuthHeaders, getStoredToken } from "@/lib/roles"

type AnalyticsResponse = {
  success: boolean
  data?: {
    kpis: {
      revenue: number
      occupancyRate: number
      miniSoccerOccupancyRate: number
      basketballOccupancyRate: number
      lowSession: string
      atRiskCustomer: number
    }
    revenueGap: { actualRevenue: number; targetRevenue: number; achievementRate: number }
    revenueTrend: Array<{ month: string; revenue: number; target: number }>
    occupancyTrend: Array<{ month: string; occupancyRate: number; miniSoccer: number; basketball: number }>
    bookingTypeDistribution: Array<{ name: string; value: number }>
    courtTypeDistribution: Array<{ name: string; value: number }>
    hourlyOccupancy: Array<{ hour: string; occupiedCourtHours: number; occupancyRate: number }>
  }
}

const months = ["All Month", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const years = ["2022", "2023", "2024", "2025", "2026"]
const periodOptions = ["MTD", "YTD"] as const
const COURT_OPTIONS = ["All Court", "Mini Soccer", "Basketball"]
const BOOKING_OPTIONS = ["All Type", "Regular Booking", "Member/Internal Booking"]

const Dropdown = ({ options, selected, setSelected, open, setOpen }: any) => (
  <div className="relative">
    <button onClick={() => setOpen(!open)} className="flex min-w-[130px] items-center justify-between gap-2 rounded-xl border bg-background px-4 py-2 text-sm">
      <span>{selected}</span><ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && (
      <div className="absolute z-50 mt-2 max-h-48 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">
        {options.map((item: string) => <div key={item} onClick={() => { setSelected(item); setOpen(false) }} className="cursor-pointer px-4 py-2 text-sm hover:bg-muted">{item}</div>)}
      </div>
    )}
  </div>
)

const EmptyState = () => <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">No analytics data found for this filter.</div>

export function AnalyticsDashboard() {
  const [selectedMonth, setSelectedMonth] = useState("All Month")
  const [selectedYear, setSelectedYear] = useState("2026")
  const [periodType, setPeriodType] = useState<(typeof periodOptions)[number]>("MTD")
  const [selectedCourt, setSelectedCourt] = useState("All Court")
  const [selectedBookingType, setSelectedBookingType] = useState("All Type")
  const [openMonth, setOpenMonth] = useState(false)
  const [openYear, setOpenYear] = useState(false)
  const [openCourt, setOpenCourt] = useState(false)
  const [openBooking, setOpenBooking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<NonNullable<AnalyticsResponse["data"]> | null>(null)

  useEffect(() => {
    const load = async () => {
      const token = getStoredToken()
      if (!token) return
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (selectedMonth !== "All Month") params.set("month", String(months.indexOf(selectedMonth)))
        if (selectedYear) params.set("year", selectedYear)
        params.set("periodType", periodType)
        if (selectedCourt !== "All Court") params.set("courtType", selectedCourt === "Mini Soccer" ? "mini_soccer" : "basketball")
        if (selectedBookingType !== "All Type") params.set("bookingType", selectedBookingType === "Regular Booking" ? "regular_booking" : "member_internal_booking")
        const response = await fetch(getApiUrl(`/dashboard/analytics?${params.toString()}`), { headers: getAuthHeaders(), cache: "no-store" })
        const result: AnalyticsResponse = await response.json()
        setData(result.success ? result.data ?? null : null)
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [selectedMonth, selectedYear, periodType, selectedCourt, selectedBookingType])

  const revenueGapData = useMemo(() => {
    const rate = data?.revenueGap.achievementRate ?? 0
    return [{ name: "Achieved", value: rate, color: "#C96ACF" }, { name: "Remaining", value: Math.max(0, 100 - rate), color: "#ECECEC" }]
  }, [data])

  const kpis = data?.kpis

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><h1 className="text-2xl font-bold">Analytics Dashboard</h1><p className="text-muted-foreground">Real-time insights for Maiin Gandaria</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <Dropdown options={months} selected={selectedMonth} setSelected={setSelectedMonth} open={openMonth} setOpen={setOpenMonth} />
            <Dropdown options={years} selected={selectedYear} setSelected={setSelectedYear} open={openYear} setOpen={setOpenYear} />
            <div className="flex overflow-hidden rounded-xl border">{periodOptions.map((p) => <button key={p} onClick={() => setPeriodType(p)} className={`px-3 py-2 text-sm ${periodType === p ? "bg-primary text-white" : "bg-background text-muted-foreground"}`}>{p}</button>)}</div>
            <Dropdown options={COURT_OPTIONS} selected={selectedCourt} setSelected={setSelectedCourt} open={openCourt} setOpen={setOpenCourt} />
            <Dropdown options={BOOKING_OPTIONS} selected={selectedBookingType} setSelected={setSelectedBookingType} open={openBooking} setOpen={setOpenBooking} />
          </div>
        </div>

        {loading && <div className="text-sm text-muted-foreground">Loading analytics...</div>}
        {!loading && !data ? <EmptyState /> : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: "Occupancy Rate", value: `${kpis?.occupancyRate.toFixed(1) ?? 0}%`, icon: Users, desc: "Current field occupancy rate" },
                { title: "Revenue", value: `Rp ${Math.round(kpis?.revenue ?? 0).toLocaleString("id-ID")}`, icon: Target, desc: "Revenue from valid bookings" },
                { title: "Low Session", value: kpis?.lowSession ?? "No data", icon: TrendingUp, desc: "Lowest occupied session" },
                { title: "At Risk Customer", value: String(kpis?.atRiskCustomer ?? 0), icon: Gift, desc: "Customers at risk" },
              ].map((m) => {
                const Icon = m.icon
                return <Card key={m.title}><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm">{m.title}</CardTitle><Tooltip><TooltipTrigger asChild><button><Info className="h-4 w-4 text-muted-foreground" /></button></TooltipTrigger><TooltipContent><p>{m.desc}</p></TooltipContent></Tooltip></CardHeader><CardContent><div className="flex items-center justify-between"><div className="font-bold">{m.value}</div><Icon className="h-6 w-6 text-primary" /></div></CardContent></Card>
              })}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card><CardHeader><CardTitle>Revenue Gap Performance</CardTitle><CardDescription>Revenue target achievement progress</CardDescription></CardHeader><CardContent><div className="relative h-[300px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={revenueGapData} dataKey="value" startAngle={90} endAngle={-270} innerRadius={90} outerRadius={115} stroke="none">{revenueGapData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><RechartsTooltip formatter={(v: any) => [`${Number(v).toFixed(0)}%`, "Revenue"]} /></PieChart></ResponsiveContainer><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-4xl font-bold text-[#C96ACF]">{Math.round(data?.revenueGap.achievementRate ?? 0)}%</span><span className="text-sm text-[#C96ACF]">Actual: Rp {(data?.revenueGap.actualRevenue ?? 0).toLocaleString("id-ID")}</span><span className="text-xs text-muted-foreground">Target: Rp {(data?.revenueGap.targetRevenue ?? 0).toLocaleString("id-ID")}</span></div></div></CardContent></Card>
              <Card><CardHeader><CardTitle>Occupancy Rate Trend</CardTitle><CardDescription>Hourly field occupancy percentage</CardDescription></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data?.hourlyOccupancy ?? []}><defs><linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} /><stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="hour" /><YAxis tickFormatter={(v) => `${v}%`} /><RechartsTooltip formatter={(v: any) => [`${v}%`, "Occupancy"]} /><Area type="monotone" dataKey="occupancyRate" stroke="var(--chart-1)" fill="url(#occupancyGradient)" /></AreaChart></ResponsiveContainer></div></CardContent></Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card><CardHeader><CardTitle>Trend Revenue vs Target</CardTitle><CardDescription>Bar revenue and line target</CardDescription></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data?.revenueTrend ?? []}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis tickFormatter={(v) => `Rp ${Math.round(v).toLocaleString("id-ID")}`} /><RechartsTooltip /><Legend /><Bar dataKey="revenue" fill="var(--chart-1)" radius={[6, 6, 0, 0]} /><Line type="monotone" dataKey="target" stroke="var(--chart-2)" strokeWidth={3} dot={{ r: 4 }} /></ComposedChart></ResponsiveContainer></div></CardContent></Card>
              <Card><CardHeader><CardTitle>Occupancy by Month</CardTitle><CardDescription>Overall, Mini Soccer, and Basketball occupancy</CardDescription></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data?.occupancyTrend ?? []}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis tickFormatter={(v) => `${v}%`} /><RechartsTooltip /><Legend /><Bar dataKey="occupancyRate" fill="var(--chart-1)" /><Bar dataKey="miniSoccer" fill="var(--chart-2)" /><Bar dataKey="basketball" fill="var(--chart-3)" /></BarChart></ResponsiveContainer></div></CardContent></Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card><CardHeader><CardTitle>Booking Type Distribution</CardTitle><CardDescription>Booking mix based on valid bookings</CardDescription></CardHeader><CardContent><div className="h-[320px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data?.bookingTypeDistribution ?? []} dataKey="value" cx="50%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={3}>{(data?.bookingTypeDistribution ?? []).map((_, index) => <Cell key={index} fill={`var(--chart-${index + 1})`} />)}</Pie><Legend /><RechartsTooltip /></PieChart></ResponsiveContainer></div></CardContent></Card>
              <Card><CardHeader><CardTitle>Court Type Distribution</CardTitle><CardDescription>Mini Soccer vs Basketball</CardDescription></CardHeader><CardContent><div className="h-[320px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data?.courtTypeDistribution ?? []} dataKey="value" cx="50%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={3}>{(data?.courtTypeDistribution ?? []).map((_, index) => <Cell key={index} fill={`var(--chart-${index + 2})`} />)}</Pie><Legend /><RechartsTooltip /></PieChart></ResponsiveContainer></div></CardContent></Card>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  )
}
