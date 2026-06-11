"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertTriangle, Calendar, Download, FileText, Info } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts"

const reportData = [
  { date: "2024-01-01", label: "Jan", revenue: 4.2, occupancyRate: 62 },
  { date: "2024-02-01", label: "Feb", revenue: 4.8, occupancyRate: 68 },
  { date: "2024-03-01", label: "Mar", revenue: 5.1, occupancyRate: 72 },
  { date: "2024-04-01", label: "Apr", revenue: 4.9, occupancyRate: 69 },
  { date: "2024-05-01", label: "May", revenue: 5.5, occupancyRate: 76 },
  { date: "2024-06-01", label: "Jun", revenue: 5.8, occupancyRate: 79 },
  { date: "2024-07-01", label: "Jul", revenue: 5.6, occupancyRate: 74 },
  { date: "2024-08-01", label: "Aug", revenue: 5.9, occupancyRate: 80 },
  { date: "2024-09-01", label: "Sep", revenue: 6.2, occupancyRate: 84 },
  { date: "2024-10-01", label: "Oct", revenue: 6.4, occupancyRate: 86 },
  { date: "2024-11-01", label: "Nov", revenue: 6.1, occupancyRate: 82 },
  { date: "2024-12-01", label: "Dec", revenue: 6.0, occupancyRate: 78 },
]

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const firstDataDate = reportData[0]?.date ?? "2024-01-01"
const lastDataDate = reportData[reportData.length - 1]?.date ?? "2024-12-31"

export function ManagementReport() {
  const [startDate, setStartDate] = useState<string>(firstDataDate)
  const [endDate, setEndDate] = useState<string>(lastDataDate)
  const [reportGenerated, setReportGenerated] = useState(false)

  const filteredData = useMemo(() => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return []
    }

    return reportData.filter((item) => {
      const itemDate = new Date(item.date)
      return itemDate >= start && itemDate <= end
    })
  }, [startDate, endDate])

  const summary = useMemo(() => {
    if (!filteredData.length) {
      return {
        totalRevenue: 0,
        avgOccupancy: 0,
        peakOccupancy: 0,
        periodLabel: `${formatDate(startDate)} – ${formatDate(endDate)}`,
      }
    }

    const totalRevenue = filteredData.reduce((sum, item) => sum + item.revenue, 0)
    const avgOccupancy =
      filteredData.reduce((sum, item) => sum + item.occupancyRate, 0) /
      filteredData.length
    const peakOccupancy = Math.max(...filteredData.map((item) => item.occupancyRate))

    return {
      totalRevenue,
      avgOccupancy,
      peakOccupancy,
      periodLabel: `${formatDate(startDate)} – ${formatDate(endDate)}`,
    }
  }, [filteredData, startDate, endDate])

  const handleGenerateReport = () => {
    setReportGenerated(true)
  }

  const handleDownloadPdf = () => {
    if (typeof window !== "undefined") {
      window.print()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Management Report</h1>
          <p className="text-base text-muted-foreground">
            Marketing revenue and occupancy performance for Maiin Gandaria.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="min-w-[170px] text-sm font-medium text-muted-foreground">
              Start date
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-2 w-full"
              />
            </label>
            <label className="min-w-[170px] text-sm font-medium text-muted-foreground">
              End date
              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-2 w-full"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" className="gap-2" onClick={handleGenerateReport}>
              <Calendar className="h-4 w-4" />
              Refresh Report
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadPdf}>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
            <CardDescription>Revenue in the selected reporting period</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">Rp {summary.totalRevenue.toFixed(2)}M</p>
            <p className="text-sm text-muted-foreground mt-2">
              Period: {summary.periodLabel}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle>Average Occupancy</CardTitle>
            <CardDescription>Average venue utilization for the date range</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.avgOccupancy.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground mt-2">
              Highest occupancy: {summary.peakOccupancy}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle>Report Status</CardTitle>
            <CardDescription>Saved as a printable management summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              {reportGenerated ? "Report ready for PDF export." : "Choose a date range and refresh."}
            </div>
            {(!filteredData.length || startDate > endDate) && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300/40 bg-amber-100/50 p-3 text-sm text-amber-900">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  Please select a valid date range that includes available data.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Revenue performance across the selected range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredData.length ? filteredData : reportData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}M`} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--foreground)",
                    }}
                    formatter={(value: number) => [`Rp ${value}M`, "Revenue"]}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" fill="url(#revenueGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle>Occupancy Rate</CardTitle>
            <CardDescription>Venue utilization by month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredData.length ? filteredData : reportData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--foreground)",
                    }}
                    formatter={(value: number) => [`${value}%`, "Occupancy"]}
                  />
                  <Legend />
                  <Bar dataKey="occupancyRate" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle>Report Notes</CardTitle>
          <CardDescription>
            This report is designed for management review and may be exported directly as a PDF.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              The report aggregates marketing revenue and occupancy rate performance across the selected date range. Use the print dialog to save a polished PDF file.
            </p>
            <p>
              If you need a more detailed export, use the calendar filters and refresh before downloading.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
