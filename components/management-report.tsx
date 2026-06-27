"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { BusinessErrorAlert } from "@/components/business-error-alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getApiUrl } from "@/lib/api"
import { getAuthHeaders } from "@/lib/roles"
import { AlertTriangle, Calendar, Download, FileText, Loader2 } from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"

interface ReportResponse {
  success: boolean
  data?: {
    generatedAt: string
    hasData: boolean
    filters: {
      startDate: string
      endDate: string
      courtType: string
      bookingType: string
      customerType: string
    }
    summary: {
      totalRevenue: number
      totalBookings: number
      courtHourCount: number
      availableSessions: number
      occupancyRate: number
      avgRevenuePerBooking: number
    }
    revenueTrend: Array<{
      key: string
      label: string
      revenue: number
      bookings: number
    }>
    bookingTypeBreakdown: Record<string, number>
    segmentationSummary: {
      runDate: string
      totalCustomers: number
    } | null
    insights: {
      executiveSummary: string
      occupancyInsight: string
      revenueInsight: string
      segmentationInsight: string
      recommendations: string[]
    }
  }
  message?: string
}

const today = new Date()
const defaultEndDate = today.toISOString().slice(0, 10)
const defaultStartDate = new Date(today.getFullYear(), today.getMonth(), 1)
  .toISOString()
  .slice(0, 10)

const formatCurrency = (value: number) => `IDR ${Math.round(value).toLocaleString("id-ID")}`

export function ManagementReport() {
  const [startDate, setStartDate] = useState(defaultStartDate)
  const [endDate, setEndDate] = useState(defaultEndDate)
  const [courtType, setCourtType] = useState("all")
  const [bookingType, setBookingType] = useState("all")
  const [report, setReport] = useState<ReportResponse["data"] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadConfirmOpen, setDownloadConfirmOpen] = useState(false)

  const loadReport = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        startDate,
        endDate,
        courtType,
        bookingType,
      })

      const response = await fetch(getApiUrl(`/operations/management-report?${params.toString()}`), {
        method: "GET",
        cache: "no-store",
        headers: getAuthHeaders(),
      })

      const result: ReportResponse | null = await response.json().catch(() => null)
      if (!response.ok || !result?.success || !result.data) {
        throw new Error(result?.message || "Management report could not be loaded.")
      }

      setReport(result.data)
    } catch (loadError) {
      setReport(null)
      setError(loadError instanceof Error ? loadError.message : "Management report could not be loaded.")
    } finally {
      setIsLoading(false)
    }
  }, [bookingType, courtType, endDate, startDate])

  useEffect(() => {
    void loadReport()
  }, [loadReport])

  const exportRows = useMemo(() => {
    return report?.revenueTrend || []
  }, [report])

  const handleConfirmDownload = () => {
    setDownloadConfirmOpen(false)

    const csvRows = [
      ["Label", "Revenue", "Bookings"],
      ...exportRows.map((row) => [row.label, row.revenue, row.bookings]),
    ]
    const csv = csvRows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `maiinsight-management-report-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)

    if (typeof window !== "undefined") {
      window.print()
    }
  }

  const breakdownRows = report
    ? Object.entries(report.bookingTypeBreakdown).map(([label, value]) => ({ label, value }))
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Management Report</h1>
          <p className="text-base text-muted-foreground">
            Executive summary, KPI highlights, occupancy insight, revenue insight, and segmentation context for MaiinSight.
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="text-sm font-medium text-muted-foreground">
            Start date
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2" />
          </label>
          <label className="text-sm font-medium text-muted-foreground">
            End date
            <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-2" />
          </label>
          <label className="text-sm font-medium text-muted-foreground">
            Court type
            <select value={courtType} onChange={(event) => setCourtType(event.target.value)} className="mt-2 h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">All courts</option>
              <option value="mini_soccer">Mini Soccer</option>
              <option value="basketball">Basketball</option>
            </select>
          </label>
          <label className="text-sm font-medium text-muted-foreground">
            Booking type
            <select value={bookingType} onChange={(event) => setBookingType(event.target.value)} className="mt-2 h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">All booking types</option>
              <option value="regular_booking">Regular booking</option>
              <option value="member_internal_booking">Member / internal</option>
              <option value="other">Other</option>
            </select>
          </label>
          <div className="flex gap-2">
            <Button variant="secondary" className="gap-2" onClick={() => void loadReport()} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              Refresh Report
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setDownloadConfirmOpen(true)} disabled={!report?.hasData}>
              <Download className="h-4 w-4" />
              Export CSV / Print
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={downloadConfirmOpen} onOpenChange={setDownloadConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export management report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will download the current trend data as CSV and open the printable report view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDownload}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error ? (
        <BusinessErrorAlert
          title="Report Unavailable"
          message="The management report could not be prepared."
          suggestion="Please review the selected date range and try again. Contact IT Support if the issue continues."
          technicalDetails={error}
        />
      ) : null}

      {isLoading ? (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex min-h-[260px] items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparing management report...
          </CardContent>
        </Card>
      ) : !report || !report.hasData ? (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-600" />
            <div>
              <p className="font-medium">No transaction data is available for this reporting period.</p>
              <p className="text-sm text-muted-foreground">
                Upload a transaction file from Data Center or choose a different date range.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-4">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle>Total Revenue</CardTitle>
                <CardDescription>Revenue in the selected reporting period</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{formatCurrency(report.summary.totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle>Total Bookings</CardTitle>
                <CardDescription>Booking records included in this report</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{report.summary.totalBookings.toLocaleString("en-US")}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle>Occupancy Rate</CardTitle>
                <CardDescription>Court-hour utilization for the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{report.summary.occupancyRate}%</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle>Average Booking Value</CardTitle>
                <CardDescription>Average revenue per booking</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{formatCurrency(report.summary.avgRevenuePerBooking)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Revenue progression across the selected reporting period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={report.revenueTrend}>
                      <defs>
                        <linearGradient id="reportRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}M`} />
                      <RechartsTooltip formatter={(value: number) => [formatCurrency(value), "Revenue"]} />
                      <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" fill="url(#reportRevenueGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle>Booking Mix</CardTitle>
                <CardDescription>Booking type distribution for the selected reporting period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={breakdownRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} allowDecimals={false} />
                      <RechartsTooltip formatter={(value: number) => [`${value} bookings`, "Bookings"]} />
                      <Legend />
                      <Bar dataKey="value" name="Bookings" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle>Executive Summary</CardTitle>
                <CardDescription>Presentation-ready summary for management review</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{report.insights.executiveSummary}</p>
                <p>{report.insights.occupancyInsight}</p>
                <p>{report.insights.revenueInsight}</p>
                <p>{report.insights.segmentationInsight}</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle>Recommendations / Notes</CardTitle>
                <CardDescription>Business-friendly follow-up suggestions based on the selected period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {report.insights.recommendations.map((recommendation) => (
                  <div key={recommendation} className="rounded-lg border border-border bg-secondary/20 p-3">
                    {recommendation}
                  </div>
                ))}
                <div className="rounded-lg border border-border bg-secondary/20 p-3 text-xs">
                  Generated at {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.generatedAt))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

