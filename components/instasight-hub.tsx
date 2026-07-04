"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ExternalLink,
  GitGraph,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react"
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

import { BusinessErrorAlert } from "@/components/business-error-alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageSkeleton } from "@/components/page-skeleton"
import { getApiUrl } from "@/lib/api"
import { getAuthHeaders, getStoredRole, USER_ROLES } from "@/lib/roles"

interface InstaSightHubProps {
  onViewAudience: () => void
}

interface MetaStatusResponse {
  success: boolean
  errorCode?: string
  message?: string
  suggestion?: string
  data?: {
    configured: boolean
    connectionState: "not_configured" | "ready" | "connected" | "syncing" | "error"
    latestSync: {
      status: string
      message: string | null
      startedAt: string
      finishedAt?: string | null
    } | null
    setupMessage: string | null
    suggestion: string | null
  }
}

interface MetaDashboardResponse {
  success: boolean
  errorCode?: string
  message?: string
  suggestion?: string
  data?: {
    configured: boolean
    hasData: boolean
    lastSyncedAt: string | null
    summary: {
      totalViews: number
      totalReach: number
      totalProfileViews: number
      totalInteractions: number
      totalLikes: number
      totalComments: number
      totalShares: number
      totalSaved: number
      engagementRate: number
      shareRate: number
      saveRate: number
      profileVisitRate: number
      averageInteractionsPerContent: number
      contentCount: number
      topContentType: string
    }
    trend: Array<{
      date: string
      reach: number
      views: number
      interactions: number
      profileViews: number
      engagementRate?: number
    }>
    contentMix: Array<{
      type: string
      count: number
      views: number
      reach: number
      interactions: number
      engagementRate: number
    }>
    topContent: Array<{
      id: string
      caption: string | null
      mediaType: string | null
      mediaProductType: string | null
      mediaUrl: string | null
      permalink: string | null
      postedAt: string | null
      views: number
      reach: number
      likes: number
      comments: number
      interactions: number
      shares: number
      saved: number
      engagementRate: number
      shareRate: number
      saveRate: number
    }>
  }
}

const formatNumber = (value: number) => value.toLocaleString("en-US")
const formatPercent = (value: number) => `${value.toFixed(1)}%`
const formatDateTime = (value?: string | null) => {
  if (!value) return "No sync yet"
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return "No sync yet"

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp)
}

export function InstaSightHub({ onViewAudience }: InstaSightHubProps) {
  const userRole = getStoredRole()
  const canViewTechnicalDetails = userRole === USER_ROLES.IT_SUPPORT
  const [status, setStatus] = useState<MetaStatusResponse["data"] | null>(null)
  const [dashboard, setDashboard] = useState<MetaDashboardResponse["data"] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<{ message: string; suggestion?: string | null; technical?: string | null } | null>(null)

  const loadMetaDashboard = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const statusResponse = await fetch(getApiUrl("/meta/status"), {
        method: "GET",
        cache: "no-store",
        headers: getAuthHeaders(),
      })

      const statusResult: MetaStatusResponse | null = await statusResponse.json().catch(() => null)
      if (!statusResponse.ok || !statusResult?.success || !statusResult.data) {
        throw new Error(statusResult?.message || "InstaSight status could not be loaded.")
      }

      setStatus(statusResult.data)

      if (!statusResult.data.configured) {
        setDashboard(null)
        return
      }

      const dashboardResponse = await fetch(getApiUrl("/meta/dashboard"), {
        method: "GET",
        cache: "no-store",
        headers: getAuthHeaders(),
      })

      const dashboardResult: MetaDashboardResponse | null = await dashboardResponse.json().catch(() => null)
      if (!dashboardResponse.ok || !dashboardResult?.success || !dashboardResult.data) {
        setDashboard(null)
        setError({
          message: dashboardResult?.message || "InstaSight data could not be loaded.",
          suggestion: dashboardResult?.suggestion || "Please check the Meta connection and try again.",
        })
        return
      }

      setDashboard(dashboardResult.data)
    } catch (loadError) {
      setStatus(null)
      setDashboard(null)
      setError({
        message: loadError instanceof Error ? loadError.message : "InstaSight could not be loaded.",
        suggestion: "Please try again or contact IT Support if the issue continues.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadMetaDashboard()
  }, [])

  const handleSync = async () => {
    try {
      setIsSyncing(true)
      setError(null)

      const response = await fetch(getApiUrl("/meta/sync"), {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })

      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.success) {
        setError({
          message: result?.message || "InstaSight could not sync Meta data.",
          suggestion: result?.suggestion || "Please check the Meta connection and try again.",
          technical: result?.technicalMessage || null,
        })
        return
      }

      await loadMetaDashboard()
    } catch (syncError) {
      setError({
        message: "InstaSight could not sync Meta data.",
        suggestion: "Please check the Meta connection and try again.",
        technical: syncError instanceof Error ? syncError.message : null,
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const topContent = useMemo(() => dashboard?.topContent || [], [dashboard])
  const contentMix = useMemo(() => dashboard?.contentMix || [], [dashboard])
  const hasRealData = Boolean(dashboard?.hasData && (dashboard?.trend.length || dashboard?.topContent.length))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">InstaSight</h1>
          <p className="text-sm text-muted-foreground">Instagram performance insights powered by live Meta Graph API data.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={onViewAudience}>
            <Users className="h-4 w-4" />
            View Audience Insight
          </Button>
          <Button className="gap-2" onClick={() => void handleSync()} disabled={isSyncing || !status?.configured}>
            {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync Meta Data
          </Button>
        </div>
      </div>

      {error ? (
        <BusinessErrorAlert
          title="InstaSight"
          message={error.message}
          suggestion={error.suggestion}
          technicalDetails={error.technical}
          showTechnicalDetails={canViewTechnicalDetails}
        />
      ) : null}

      {isLoading ? (
        <PageSkeleton cards={3} lines={2} />
      ) : !status?.configured ? (
        <Card className="border-amber-200 bg-amber-50/70 shadow-sm">
          <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-600" />
            <div>
              <p className="font-medium">Meta API is not connected yet.</p>
              <p className="text-sm text-muted-foreground">{status?.suggestion || "Please ask IT Support to configure Meta credentials in Settings or environment variables."}</p>
            </div>
          </CardContent>
        </Card>
      ) : !hasRealData ? (
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>InstaSight Ready to Sync</CardTitle>
            <CardDescription>Meta is connected, but no Instagram data yet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Use <span className="font-medium text-foreground">Sync Meta Data</span> to get the latest Instagram performance data.</p>
            <p>Last sync status: <span className="font-medium text-foreground">{status?.latestSync?.status || "Not synced"}</span></p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-4">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
                <CardDescription>Data from last sync</CardDescription>
              </CardHeader>
              <CardContent><p className="text-[1.75rem] font-semibold tracking-tight">{formatNumber(dashboard?.summary.totalViews || 0)}</p></CardContent>
            </Card>
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Reach</CardTitle>
                <CardDescription>Data from last sync</CardDescription>
              </CardHeader>
              <CardContent><p className="text-[1.75rem] font-semibold tracking-tight">{formatNumber(dashboard?.summary.totalReach || 0)}</p></CardContent>
            </Card>
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Engagement Rate</CardTitle>
                <CardDescription>Interaction rate based on synced reach</CardDescription>
              </CardHeader>
              <CardContent><p className="text-[1.75rem] font-semibold tracking-tight">{formatPercent(dashboard?.summary.engagementRate || 0)}</p></CardContent>
            </Card>
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Profile Views</CardTitle>
                <CardDescription>Visits to Instagram profile</CardDescription>
              </CardHeader>
              <CardContent><p className="text-[1.75rem] font-semibold tracking-tight">{formatNumber(dashboard?.summary.totalProfileViews || 0)}</p></CardContent>
            </Card>
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Profile Visit Rate</CardTitle>
                <CardDescription>Profile views divided by reach</CardDescription>
              </CardHeader>
              <CardContent><p className="text-[1.75rem] font-semibold tracking-tight">{formatPercent(dashboard?.summary.profileVisitRate || 0)}</p></CardContent>
            </Card>
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Save Rate</CardTitle>
                <CardDescription>Saves divided by reach</CardDescription>
              </CardHeader>
              <CardContent><p className="text-[1.75rem] font-semibold tracking-tight">{formatPercent(dashboard?.summary.saveRate || 0)}</p></CardContent>
            </Card>
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Interactions</CardTitle>
                <CardDescription>Average per synced content</CardDescription>
              </CardHeader>
              <CardContent><p className="text-[1.75rem] font-semibold tracking-tight">{formatNumber(dashboard?.summary.averageInteractionsPerContent || 0)}</p></CardContent>
            </Card>
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Sync Status</CardTitle>
                <CardDescription>Latest Meta connection activity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant={status.latestSync?.status?.toLowerCase() === "failed" ? "destructive" : "secondary"}>
                  {status.latestSync?.status || "READY"}
                </Badge>
                <p className="text-sm text-muted-foreground">{formatDateTime(dashboard?.lastSyncedAt || status.latestSync?.startedAt)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle>Meta Metrics Trend</CardTitle>
                <CardDescription>Reach, views, and interactions from synced Meta insight data.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dashboard?.trend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="date" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                      <Legend verticalAlign="top" height={28} />
                      <RechartsTooltip
                        formatter={(value: number | string, name: string) => {
                          const labels: Record<string, string> = {
                            reach: "Reach",
                            views: "Views",
                            interactions: "Interactions",
                            profileViews: "Profile Views",
                          }
                          return [formatNumber(Number(value || 0)), labels[String(name)] || String(name)]
                        }}
                      />
                      <Area type="monotone" dataKey="reach" name="Reach" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.14} />
                      <Area type="monotone" dataKey="views" name="Views" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.12} />
                      <Area type="monotone" dataKey="interactions" name="Interactions" stroke="var(--chart-3)" fill="var(--chart-3)" fillOpacity={0.1} />
                      <Area type="monotone" dataKey="profileViews" name="Profile Views" stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={0.08} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle>Top Content by Views</CardTitle>
                <CardDescription>Content ranking from the latest Meta sync.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topContent.slice(0, 6)} layout="vertical" margin={{ left: 12, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="caption" width={156} tickFormatter={(value) => String(value || "Untitled post").slice(0, 24)} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                      <RechartsTooltip formatter={(value: number) => [formatNumber(value), "Views"]} />
                      <Bar dataKey="views" name="Views" fill="var(--chart-1)" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle>Content Mix by Format</CardTitle>
                <CardDescription>Which Instagram format is carrying views and interactions.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={contentMix.slice(0, 5)} layout="vertical" margin={{ left: 12, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="type" width={120} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                      <Legend verticalAlign="top" height={28} />
                      <RechartsTooltip formatter={(value: number, name: string) => [formatNumber(value), name]} />
                      <Bar dataKey="views" name="Views" fill="var(--chart-1)" radius={[0, 6, 6, 0]} />
                      <Bar dataKey="interactions" name="Interactions" fill="var(--chart-3)" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle>Marketing Signals</CardTitle>
                <CardDescription>Quick reads that normally require checking Meta graphs manually.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-muted-foreground">Best performing format</span>
                  <span className="font-semibold text-foreground">{dashboard?.summary.topContentType || "-"}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-muted-foreground">Profile visits from reach</span>
                  <span className="font-semibold text-foreground">{formatPercent(dashboard?.summary.profileVisitRate || 0)}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-muted-foreground">Save intent rate</span>
                  <span className="font-semibold text-foreground">{formatPercent(dashboard?.summary.saveRate || 0)}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-muted-foreground">Share amplification rate</span>
                  <span className="font-semibold text-foreground">{formatPercent(dashboard?.summary.shareRate || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Synced content analyzed</span>
                  <span className="font-semibold text-foreground">{formatNumber(dashboard?.summary.contentCount || 0)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle>Instagram Content Performance</CardTitle>
              <CardDescription>Real content performance from Meta API. Revenue and offline conversion are intentionally not shown until a connected source is available.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[1040px] text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-left text-muted-foreground">
                      <th className="px-4 py-3">Content</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-right">Views</th>
                      <th className="px-4 py-3 text-right">Reach</th>
                      <th className="px-4 py-3 text-right">Likes</th>
                      <th className="px-4 py-3 text-right">Comments</th>
                      <th className="px-4 py-3 text-right">Saves</th>
                      <th className="px-4 py-3 text-right">Shares</th>
                      <th className="px-4 py-3 text-right">Engagement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topContent.map((item) => (
                      <tr key={item.id} className="border-b border-border/30 align-top text-sm last:border-b-0">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                              {item.mediaUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.mediaUrl} alt={item.caption || "Instagram content"} className="h-full w-full object-cover" />
                              ) : (
                                <GitGraph className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="max-w-[320px]">
                              <p className="font-medium">{item.caption || "Untitled content"}</p>
                              {item.permalink ? (
                                <a href={item.permalink} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary">
                                  Open Instagram <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">{item.mediaProductType || item.mediaType || "-"}</td>
                        <td className="px-4 py-4 text-right">{formatNumber(item.views)}</td>
                        <td className="px-4 py-4 text-right">{formatNumber(item.reach)}</td>
                        <td className="px-4 py-4 text-right">{formatNumber(item.likes)}</td>
                        <td className="px-4 py-4 text-right">{formatNumber(item.comments)}</td>
                        <td className="px-4 py-4 text-right">{formatNumber(item.saved)}</td>
                        <td className="px-4 py-4 text-right">{formatNumber(item.shares)}</td>
                        <td className="px-4 py-4 text-right">{formatPercent(item.engagementRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
