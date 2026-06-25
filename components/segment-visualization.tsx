"use client"

import { useEffect, useMemo, useState } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip as RechartsTooltip, XAxis, YAxis, ZAxis } from "recharts"
import { ChevronDown, Clock, Info, TrendingUp, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getApiUrl } from "@/lib/api"
import { getAuthHeaders, getStoredToken } from "@/lib/roles"

const Dropdown = ({ options, selected, setSelected, open, setOpen }: any) => (
  <div className="relative">
    <button onClick={() => setOpen(!open)} className="flex min-w-[130px] items-center justify-between gap-2 rounded-xl border bg-background px-4 py-2 text-sm">
      <span>{selected}</span><ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div className="absolute z-50 mt-2 max-h-48 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">{options.map((item: string) => <div key={item} onClick={() => { setSelected(item); setOpen(false) }} className="cursor-pointer px-4 py-2 text-sm hover:bg-muted">{item}</div>)}</div>}
  </div>
)

type SegmentationPayload = {
  run: { id: number; k: number; analysisDate: string; totalCustomers: number } | null
  clusters: Array<{ clusterId: number; segmentName: string; size: number; centroidRecency: number; centroidFrequency: number; centroidMonetary: number }>
  summary: Array<{ clusterId: number; segmentName: string; size: number }>
  customers: Array<{ customerId: number; segmentName: string; recency: number; frequency: number; monetary: number; customer?: { name?: string | null; email?: string | null; customerKey?: string | null } }>
}

const EmptyState = () => <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">No segmentation result yet. Run segmentation from Data Center.</div>

export function SegmentVisualization() {
  const [selectedMonth, setSelectedMonth] = useState("All Month")
  const [selectedYear, setSelectedYear] = useState("2026")
  const [periodType, setPeriodType] = useState<"MTD" | "YTD">("MTD")
  const [selectedCourt, setSelectedCourt] = useState("All Court")
  const [selectedBookingType, setSelectedBookingType] = useState("All Type")
  const [openMonth, setOpenMonth] = useState(false)
  const [openYear, setOpenYear] = useState(false)
  const [openCourt, setOpenCourt] = useState(false)
  const [openBooking, setOpenBooking] = useState(false)
  const [payload, setPayload] = useState<SegmentationPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"cluster" | "profile" | "radar">("cluster")

  useEffect(() => {
    const load = async () => {
      const token = getStoredToken()
      if (!token) return
      setLoading(true)
      try {
        const [latestRes, summaryRes, customersRes] = await Promise.all([
          fetch(getApiUrl("/segmentation/latest"), { headers: getAuthHeaders(), cache: "no-store" }).then((r) => r.json()),
          fetch(getApiUrl("/segmentation/summary"), { headers: getAuthHeaders(), cache: "no-store" }).then((r) => r.json()),
          fetch(getApiUrl("/segmentation/customers"), { headers: getAuthHeaders(), cache: "no-store" }).then((r) => r.json()),
        ])
        setPayload(latestRes?.success ? { run: latestRes.data?.run ?? null, clusters: latestRes.data?.clusters ?? [], summary: summaryRes?.data ?? latestRes.data?.summary ?? [], customers: customersRes?.data ?? latestRes.data?.customers ?? [] } : null)
      } catch {
        setPayload(null)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [selectedMonth, selectedYear, periodType, selectedCourt, selectedBookingType])

  const clusterData = useMemo(() => payload?.clusters ?? [], [payload])
  const radarData = useMemo(() => (payload?.clusters ?? []).map((cluster) => ({ metric: cluster.segmentName, value: Math.max(10, 100 - cluster.centroidRecency * 10) })), [payload])
  const customerTable = payload?.customers.filter((c) => !selectedSegment || c.segmentName === selectedSegment) ?? []

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><h1 className="text-2xl font-bold">Customer Segmentation</h1><p className="text-muted-foreground">RFM analysis and customer clustering insights</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <Dropdown options={["All Month", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]} selected={selectedMonth} setSelected={setSelectedMonth} open={openMonth} setOpen={setOpenMonth} />
            <Dropdown options={["2022", "2023", "2024", "2025", "2026"]} selected={selectedYear} setSelected={setSelectedYear} open={openYear} setOpen={setOpenYear} />
            <div className="flex overflow-hidden rounded-xl border">{(["MTD", "YTD"] as const).map((p) => <button key={p} onClick={() => setPeriodType(p)} className={`px-3 py-2 text-sm ${periodType === p ? "bg-primary text-white" : "bg-background text-muted-foreground"}`}>{p}</button>)}</div>
            <Dropdown options={["All Court", "Mini Soccer", "Basketball"]} selected={selectedCourt} setSelected={setSelectedCourt} open={openCourt} setOpen={setOpenCourt} />
            <Dropdown options={["All Type", "Regular Booking", "Member/Internal Booking"]} selected={selectedBookingType} setSelected={setSelectedBookingType} open={openBooking} setOpen={setOpenBooking} />
          </div>
        </div>

        {loading && <div className="text-sm text-muted-foreground">Loading segmentation...</div>}
        {!loading && !payload ? <EmptyState /> : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total Customers", value: payload?.run?.totalCustomers ?? 0, icon: Users },
                { label: "Lowest Occupancy Rate", value: `${Math.max(0, 100 - (payload?.clusters[0]?.centroidRecency ?? 0) * 10).toFixed(0)}%`, icon: TrendingUp },
                { label: "Most Idle Time", value: "Morning", icon: Clock },
                { label: "Growth Rate", value: `${payload?.clusters.length ?? 0} clusters`, icon: TrendingUp },
              ].map((item) => {
                const Icon = item.icon
                return <Card key={item.label}><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{item.label}</p><p className="text-2xl font-bold">{item.value}</p></div><Icon className="h-6 w-6 text-primary" /></div></CardContent></Card>
              })}
            </div>

            <Card>
              <CardHeader><CardTitle>Segment Legend</CardTitle><CardDescription>Tap a segment to inspect details</CardDescription></CardHeader>
              <CardContent><div className="flex flex-wrap gap-3">{clusterData.map((cluster, index) => <button key={cluster.clusterId} onClick={() => setSelectedSegment(selectedSegment === cluster.segmentName ? null : cluster.segmentName)} className="flex items-center gap-2 rounded-xl border px-4 py-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: `var(--chart-${(index % 5) + 1})` }} /><span className="font-medium">{cluster.segmentName}</span><Badge variant="secondary">{cluster.size}</Badge></button>)}</div></CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>RFM Cluster Map</CardTitle><CardDescription>Recency vs Frequency with monetary bubble size</CardDescription></CardHeader>
                <CardContent><div className="h-[400px]"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" dataKey="centroidRecency" name="Recency" /><YAxis type="number" dataKey="centroidFrequency" name="Frequency" /><ZAxis type="number" dataKey="centroidMonetary" range={[100, 1000]} /><RechartsTooltip /><Scatter data={clusterData}><Cell fill="var(--chart-1)" /></Scatter></ScatterChart></ResponsiveContainer></div></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Segment Details</CardTitle><CardDescription>{selectedSegment ? `${selectedSegment} segment insights` : "Select a segment"}</CardDescription></CardHeader>
                <CardContent>{selectedSegment ? <div className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Customers</span><span>{customerTable.filter((c) => c.segmentName === selectedSegment).length}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Selected</span><span>{selectedSegment}</span></div><Button className="w-full" variant="outline" onClick={() => setSelectedSegment(null)}>Clear</Button></div> : <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Click on a segment to view detailed metrics and insights</div>}</CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card><CardHeader><CardTitle>Segment Profile Comparison</CardTitle></CardHeader><CardContent><div className="h-[320px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={payload?.summary ?? []}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="segmentName" /><YAxis /><RechartsTooltip /><Legend /><Bar dataKey="size" fill="var(--chart-1)" /></BarChart></ResponsiveContainer></div></CardContent></Card>
              <Card><CardHeader><CardTitle>Segment Radar Analysis</CardTitle></CardHeader><CardContent><div className="h-[320px]"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData}><PolarGrid /><PolarAngleAxis dataKey="metric" /><PolarRadiusAxis /><Radar dataKey="value" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.2} /></RadarChart></ResponsiveContainer></div></CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Customer List - {selectedSegment ?? "All Segments"}</CardTitle><CardDescription>Detail RFM customer berdasarkan segment yang dipilih</CardDescription></CardHeader>
              <CardContent>
                <div className="overflow-auto rounded-lg border"><table className="w-full min-w-[900px] text-sm"><thead className="bg-secondary/40"><tr><th className="px-5 py-4 text-left">Customer</th><th className="px-5 py-4 text-left">Email</th><th className="px-5 py-4 text-left">Frequency</th><th className="px-5 py-4 text-left">Recency</th><th className="px-5 py-4 text-left">Monetary</th><th className="px-5 py-4 text-left">Segment</th></tr></thead><tbody>{customerTable.length ? customerTable.map((c) => <tr key={c.customerId} className="border-t"><td className="px-5 py-4">{c.customer?.name ?? c.customer?.customerKey ?? "-"}</td><td className="px-5 py-4 text-muted-foreground">{c.customer?.email ?? "-"}</td><td className="px-5 py-4">{c.frequency}</td><td className="px-5 py-4">{c.recency}</td><td className="px-5 py-4">IDR {Math.round(c.monetary).toLocaleString("id-ID")}</td><td className="px-5 py-4"><Badge variant="secondary">{c.segmentName}</Badge></td></tr>) : <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No segmentation result yet. Run segmentation from Data Center.</td></tr>}</tbody></table></div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </TooltipProvider>
  )
}
