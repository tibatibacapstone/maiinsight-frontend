"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { BusinessErrorAlert } from "@/components/business-error-alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageSkeleton } from "@/components/page-skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardTitleTooltip, StateCard } from "@/components/ui/card"
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
    connectionError: string | null
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
  viewsChangePct: number
  viewsFromFollowers: number
viewsFromFollowersPct: number
viewsFromFollowersChangePct: number

viewsFromNonFollowers: number
viewsFromNonFollowersPct: number
viewsFromNonFollowersChangePct: number

  totalReach: number
  totalProfileViews: number
  profileViewsChangePct: number
  totalInteractions: number
  totalLikes: number
  totalComments: number
  totalShares: number
  totalSaved: number
 engagementRate: number
 engagementRateChangePct: number

shareRate: number
saveRate: number

profileVisitRate: number
profileVisitRateChangePct: number
 averageInteractionsPerContent: number

interactionsChangePct: number

interactionsFromFollowers: number
interactionsFromFollowersChangePct: number

interactionsFromNonFollowers: number
interactionsFromNonFollowersChangePct: number

interactionsFromFollowersPct: number
interactionsFromNonFollowersPct: number

  contentCount: number
  topContentType: string

  reachChangePct: number
reachFromFollowers: number
reachFromFollowersPct: number
reachFromFollowersChangePct: number

reachFromNonFollowers: number
reachFromNonFollowersPct: number
reachFromNonFollowersChangePct: number

  followersCount: number | null
  followersChangePct: number

newFollowsCount: number
newFollowsChangePct: number

  unfollowsCount: number
  unfollowsChangePct: number
  followsCount: number
  instagramMediaCount: number
  instagramUsername: string | null
}
    trend: Array<{
      date: string
      reach: number
      views: number
      interactions: number
      profileViews: number
      engagementRate?: number
    }>
    monthlyViewsTrend: Array<{
  month: string

  views: number
  viewsFromFollowers: number
  viewsFromNonFollowers: number

  reach: number
  reachFromFollowers: number
  reachFromNonFollowers: number

  interactions: number
  interactionsFromFollowers: number
  interactionsFromNonFollowers: number

  profileViews: number

  contentCount: number
}>
    followersTrend: Array<{
  month: string
  followersCount: number
  followsCount: number
  mediaCount: number
  followersChange: number
  followersChangePct: number
  snapshotDate: string
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
  contentLabel: string
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
contentList: Array<{
  id: string
  caption: string | null
  contentLabel: string
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

contentListTotal: number
  }
}

const formatNumber = (value: number) => value.toLocaleString("en-US")
const formatPercent = (value: number) => `${value.toFixed(1)}%`
const formatDistributionPercent = (value: number, total: number) => {
  if (!total || total <= 0) return "0.0%"

  return `${((value / total) * 100).toFixed(1)}%`
}

const DistributionPercent = ({
  value,
  total,
}: {
  value: number
  total: number
}) => {
  return (
    <span className="text-xs font-medium text-muted-foreground">
      {formatDistributionPercent(value, total)}
    </span>
  )
}
const formatContentLabel = (label?: string | null) => {
  if (label === "content_promotion") return "Content Promotion"
  if (label === "content_advertisement") return "Content Advertisement"

  return "Content Advertisement"
}

const getContentLabelClass = (label?: string | null) => {
  if (label === "content_promotion") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (label === "content_advertisement") {
    return "border-amber-200 bg-amber-50 text-amber-700"
  }

  return "border-muted bg-secondary text-muted-foreground"
}

const formatSignedPercent = (value: number) => `${Math.abs(value).toFixed(1)}%`

const getChangeToneClass = (value: number, isNegativeGood = false) => {
  if (value === 0) return "text-muted-foreground"

  const isGood = isNegativeGood ? value < 0 : value > 0

  return isGood ? "text-emerald-600" : "text-red-600"
}

const ChangeIndicator = ({
  value,
  isNegativeGood = false,
}: {
  value: number
  isNegativeGood?: boolean
}) => {
  const className = getChangeToneClass(value, isNegativeGood)
  const Icon = value >= 0 ? ArrowUp : ArrowDown

  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${className}`}>
      <Icon className="h-4 w-4" />
      {formatSignedPercent(value)}
    </span>
  )
}
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
const MONTH_OPTIONS = [
  { value: "all", label: "All Month" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
]

const getLocalDateInputValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

const getMonthDateRange = (year: string, month: string) => {
  const selectedYear = Number(year)

  if (month === "all") {
    return {
      startDate: `${selectedYear}-01-01`,
      endDate: `${selectedYear}-12-31`,
    }
  }

  const selectedMonthIndex = Number(month) - 1
  const start = new Date(selectedYear, selectedMonthIndex, 1)
  const end = new Date(selectedYear, selectedMonthIndex + 1, 0)

  return {
    startDate: getLocalDateInputValue(start),
    endDate: getLocalDateInputValue(end),
  }
}

export function InstaSightHub({ onViewAudience }: InstaSightHubProps) {
  
const currentDate = new Date()

const [selectedMonth, setSelectedMonth] = useState(
  String(currentDate.getMonth() + 1)
)
const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()))
const [contentLabelFilter, setContentLabelFilter] = useState("all")

const YEAR_OPTIONS = Array.from({ length: 5 }, (_, index) =>
  String(currentDate.getFullYear() - index)
)
  const userRole = getStoredRole()
  const canViewTechnicalDetails = userRole === USER_ROLES.IT_SUPPORT
  const [status, setStatus] = useState<MetaStatusResponse["data"] | null>(null)
  const [dashboard, setDashboard] = useState<MetaDashboardResponse["data"] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<{ message: string; suggestion?: string | null; technical?: string | null } | null>(null)

const [contentPage, setContentPage] = useState(1)
const [contentSortBy, setContentSortBy] = useState("latest")
const [contentSearchKeyword, setContentSearchKeyword] = useState("")
const CONTENT_PAGE_SIZE = 10

const loadMetaDashboard = useCallback(async () => {
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

    const query = new URLSearchParams()
const monthRange = getMonthDateRange(selectedYear, selectedMonth)

query.set("since", monthRange.startDate)
query.set("until", monthRange.endDate)

if (contentLabelFilter && contentLabelFilter !== "all") {
  query.set("contentLabel", contentLabelFilter)
}

    const dashboardResponse = await fetch(
      getApiUrl(`/meta/dashboard?${query.toString()}`),
      {
        method: "GET",
        cache: "no-store",
        headers: getAuthHeaders(),
      }
    )

    const dashboardResult: MetaDashboardResponse | null = await dashboardResponse.json().catch(() => null)

    if (!dashboardResponse.ok || !dashboardResult?.success || !dashboardResult.data) {
      setDashboard(null)
      const isMetaConfigured = statusResult?.data?.configured
      setError({
        message: dashboardResult?.message || "InstaSight data could not be loaded.",
        suggestion: dashboardResult?.suggestion || (
          isMetaConfigured
            ? "The Meta API credentials are configured but data could not be loaded. Please try syncing again or contact IT Support."
            : "Please check the Meta connection and try again."
        ),
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
}, [selectedMonth, selectedYear, contentLabelFilter])

useEffect(() => {
  void loadMetaDashboard()
}, [loadMetaDashboard])

  const handleSync = async () => {
    try {
      setIsSyncing(true)
      setError(null)

      const today = new Date()
const syncUntil = getLocalDateInputValue(today)

const response = await fetch(getApiUrl("/meta/sync"), {
  method: "POST",
  headers: {
    ...getAuthHeaders(),
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    since: "2025-01-01",
    until: syncUntil,
  }),
})

      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.success) {
        const isMetaConfigured = status?.configured
        setError({
          message: result?.message || "InstaSight could not sync Meta data.",
          suggestion: result?.suggestion || (
            isMetaConfigured
              ? "The Meta API returned an error. Please verify the access token is valid and not expired, then try again."
              : "Please check the Meta connection and try again."
          ),
          technical: result?.technicalMessage || null,
        })
        await loadMetaDashboard()
        return
      }

      await loadMetaDashboard()
    } catch (syncError) {
      const isMetaConfigured = status?.configured
      setError({
        message: "InstaSight could not sync Meta data.",
        suggestion: isMetaConfigured
          ? "An unexpected error occurred while syncing. The Meta API access token may be invalid or expired. Please try again."
          : "Please check the Meta connection and try again.",
        technical: syncError instanceof Error ? syncError.message : null,
      })
      await loadMetaDashboard()
    } finally {
      setIsSyncing(false)
    }
  }

  const topContent = useMemo(() => dashboard?.topContent || [], [dashboard])
  const contentMix = useMemo(() => dashboard?.contentMix || [], [dashboard])
  const contentList = useMemo(
  () => dashboard?.contentList || [],
  [dashboard]
)
const contentLabelDistribution = useMemo(() => {
  const promotionCount = contentList.filter(
    (item) => item.contentLabel === "content_promotion"
  ).length

  const advertisementCount = contentList.filter(
    (item) => item.contentLabel === "content_advertisement"
  ).length

  const totalContent = promotionCount + advertisementCount

  return {
    promotionCount,
    advertisementCount,
    totalContent,
  }
}, [contentList])

const sortedContentList = useMemo(() => {
  const keyword = contentSearchKeyword.trim().toLowerCase()

  const rows = contentList.filter((item) => {
    if (!keyword) return true

    const caption = String(item.caption || "").toLowerCase()
    return caption.includes(keyword)
  })

  if (contentSortBy === "top_views") {
    return rows.sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
  }

  if (contentSortBy === "top_reach") {
    return rows.sort((a, b) => Number(b.reach || 0) - Number(a.reach || 0))
  }

  if (contentSortBy === "top_interactions") {
    return rows.sort(
      (a, b) => Number(b.interactions || 0) - Number(a.interactions || 0)
    )
  }

  if (contentSortBy === "top_engagement") {
    return rows.sort(
      (a, b) => Number(b.engagementRate || 0) - Number(a.engagementRate || 0)
    )
  }

  return rows.sort(
    (a, b) =>
      new Date(b.postedAt || 0).getTime() -
      new Date(a.postedAt || 0).getTime()
  )
}, [contentList, contentSortBy, contentSearchKeyword])

const totalContentPages = Math.max(
  1,
  Math.ceil(sortedContentList.length / CONTENT_PAGE_SIZE)
)

const paginatedContent = useMemo(() => {
  const startIndex = (contentPage - 1) * CONTENT_PAGE_SIZE
  const endIndex = startIndex + CONTENT_PAGE_SIZE

  return sortedContentList.slice(startIndex, endIndex)
}, [sortedContentList, contentPage])

  const hasRealData = Boolean(
  dashboard?.hasData &&
    (
      (dashboard?.monthlyViewsTrend?.length || 0) ||
      (dashboard?.trend?.length || 0) ||
      (dashboard?.topContent?.length || 0) ||
      dashboard?.summary?.followersCount !== null
    )
)
useEffect(() => {
  setContentPage(1)
}, [
  selectedMonth,
  selectedYear,
  contentLabelFilter,
  contentSortBy,
  contentSearchKeyword,
])

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
     <Card className="border-border bg-card shadow-sm">
  <CardContent className="flex min-h-0 flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
    <div className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
      Page Filters
    </div>

    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="w-[190px]">
  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
    <SelectTrigger className="h-10 w-full rounded-xl border bg-secondary/60 px-4 shadow-sm">
      <div className="flex w-full items-center gap-3">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Month
        </span>
        <SelectValue placeholder="Select month" />
      </div>
    </SelectTrigger>

    <SelectContent className="w-[190px] rounded-xl border bg-background shadow-lg">
      {MONTH_OPTIONS.map((month) => (
        <SelectItem key={month.value} value={month.value}>
          {month.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

      <div className="w-[150px]">
  <Select value={selectedYear} onValueChange={setSelectedYear}>
    <SelectTrigger className="h-10 w-full rounded-xl border bg-secondary/60 px-4 shadow-sm">
      <div className="flex w-full items-center gap-3">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Year
        </span>
        <SelectValue placeholder="Select year" />
      </div>
    </SelectTrigger>

    <SelectContent className="w-[150px] rounded-xl border bg-background shadow-lg">
      {YEAR_OPTIONS.map((year) => (
        <SelectItem key={year} value={year}>
          {year}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

      <div className="w-[260px]">
  <Select value={contentLabelFilter} onValueChange={setContentLabelFilter}>
    <SelectTrigger className="h-10 w-full rounded-xl border bg-secondary/60 px-4 shadow-sm">
      <div className="flex w-full items-center gap-3">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Content Type
        </span>
        <SelectValue placeholder="Select content type" />
      </div>
    </SelectTrigger>

    <SelectContent className="w-[260px] rounded-xl border bg-background shadow-lg">
      <SelectItem value="all">All Type</SelectItem>
      <SelectItem value="content_promotion">Promotion</SelectItem>
      <SelectItem value="content_advertisement">Advertisement</SelectItem>
    </SelectContent>
  </Select>
</div>
    </div>
  </CardContent>
</Card>
      {isLoading ? (
        <StateCard state="loading" title="Loading InstaSight data..." minHeight="min-h-[240px]" />
      ) : !status?.configured ? (
        <StateCard
          state="warning"
          title="Meta API is not connected yet."
          description={status?.suggestion || "Please ask IT Support to configure Meta credentials in Settings or environment variables."}
          minHeight="min-h-[220px]"
        />
      ) : status?.connectionState === "error" && status?.connectionError ? (
        <StateCard
          state="error"
          title="Meta connection error"
          description={status.connectionError}
          minHeight="min-h-[220px]"
        />
      ) : error ? (
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
            <CardTitleTooltip
              title="InstaSight Ready to Sync"
              tooltip={
                status?.connectionState === "connected"
                  ? "Meta is connected, but no Instagram data yet."
                  : status?.connectionState === "error"
                    ? "Meta credentials are configured but the connection has issues."
                    : "Meta is connected, but no Instagram data yet."
              }
            />
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {status?.connectionState === "error" && status?.connectionError ? (
              <p className="text-red-600">{status.connectionError}</p>
            ) : null}
            <p>Use <span className="font-medium text-foreground">Sync Meta Data</span> to get the latest Instagram performance data.</p>
            <p>Last sync status: <span className="font-medium text-foreground">{status?.latestSync?.status || "Not synced"}</span></p>
          </CardContent>
        </Card>
      ) : (
        <>
         
  <div className="grid gap-4 xl:grid-cols-4">
  {/* KPI Cards: Total Content - Followers - Total Views - Total Reach - Interactions */}

  <Card className="border-border bg-card shadow-sm">
  <CardHeader>
    <CardTitleTooltip title="Total Content" tooltip="Synced Instagram content analyzed" className="text-sm font-medium text-muted-foreground" />
  </CardHeader>

  <CardContent className="space-y-3">
    <div>
      <div className="mb-1 text-sm font-medium text-muted-foreground">
        Content
      </div>

      <p className="text-[1.75rem] font-semibold leading-none tracking-tight">
        {formatNumber(dashboard?.summary.contentCount || 0)}
      </p>
    </div>

    <div className="grid grid-cols-2 gap-3 pt-1">
      <div className="border-r pr-3">
        <div className="mb-1 text-[0.68rem] font-medium leading-none text-muted-foreground">
          Promotion
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold leading-none">
            {formatNumber(contentLabelDistribution.promotionCount)}
          </span>

          <DistributionPercent
            value={contentLabelDistribution.promotionCount}
            total={dashboard?.summary.contentCount || 0}
          />
        </div>
      </div>

      <div>
        <div className="mb-1 text-[0.68rem] font-medium leading-none text-muted-foreground">
          Advertisement
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold leading-none">
            {formatNumber(contentLabelDistribution.advertisementCount)}
          </span>

          <DistributionPercent
            value={contentLabelDistribution.advertisementCount}
            total={dashboard?.summary.contentCount || 0}
          />
        </div>
      </div>
    </div>
  </CardContent>
</Card>

  <Card className="border-border bg-card shadow-sm">
  <CardHeader>
    <CardTitleTooltip title="Total Followers" tooltip="Followers and unfollows from Meta" className="text-sm font-medium text-muted-foreground" />
  </CardHeader>

  <CardContent className="space-y-3">
    <div>
      <div className="mb-1 flex items-center gap-1 text-sm font-medium text-muted-foreground">
        <span>Followers</span>
      </div>

      <div className="flex items-end gap-3">
  <p className="text-[1.75rem] font-semibold leading-none tracking-tight">
    {dashboard?.summary.followersCount !== null &&
    dashboard?.summary.followersCount !== undefined
      ? formatNumber(dashboard.summary.followersCount)
      : "-"}
  </p>
</div>
    </div>

    <div className="grid grid-cols-2 gap-3 pt-1">
  <div className="border-r pr-3">
    <div className="mb-1 text-[0.68rem] font-medium leading-none text-muted-foreground">
      Follow
    </div>

    <div className="flex items-center gap-1.5">
      <span className="text-sm font-semibold leading-none">
        {formatNumber(dashboard?.summary.newFollowsCount || 0)}
      </span>

      <ChangeIndicator
        value={dashboard?.summary.newFollowsChangePct || 0}
      />
    </div>
  </div>

  <div>
    <div className="mb-1 text-[0.68rem] font-medium leading-none text-muted-foreground">
      Unfollow
    </div>

    <div className="flex items-center gap-1.5">
      <span className="text-sm font-semibold leading-none">
        {formatNumber(dashboard?.summary.unfollowsCount || 0)}
      </span>

      <ChangeIndicator
        value={dashboard?.summary.unfollowsChangePct || 0}
        isNegativeGood
      />
    </div>
  </div>
</div>
  </CardContent>
</Card>

  <Card className="border-border bg-card shadow-sm">
  <CardHeader>
    <CardTitleTooltip title="Total Views" tooltip="Views breakdown from Meta" className="text-sm font-medium text-muted-foreground" />
  </CardHeader>

  <CardContent className="space-y-3">
    <div>
      <div className="mb-1 text-sm font-medium text-muted-foreground">
        Views
      </div>

      <div className="flex items-end gap-3">
        <p className="text-[1.75rem] font-semibold leading-none tracking-tight">
          {formatNumber(dashboard?.summary.totalViews || 0)}
        </p>

        <ChangeIndicator value={dashboard?.summary.viewsChangePct || 0} />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3 pt-1">
  <div className="border-r pr-3">
    <div className="mb-1 text-[0.68rem] font-medium leading-none text-muted-foreground">
      From followers
    </div>

    <div className="flex items-center gap-1.5">
      <span className="text-sm font-semibold leading-none">
        {formatNumber(dashboard?.summary.viewsFromFollowers || 0)}
      </span>

      <DistributionPercent
  value={dashboard?.summary.viewsFromFollowers || 0}
  total={dashboard?.summary.totalViews || 0}
/>
    </div>
  </div>

  <div>
    <div className="mb-1 text-[0.68rem] font-medium leading-none text-muted-foreground">
      From non-followers
    </div>

    <div className="flex items-center gap-1.5">
      <span className="text-sm font-semibold leading-none">
        {formatNumber(dashboard?.summary.viewsFromNonFollowers || 0)}
      </span>

      <DistributionPercent
  value={dashboard?.summary.viewsFromNonFollowers || 0}
  total={dashboard?.summary.totalViews || 0}
/>
    </div>
  </div>
</div>
  </CardContent>
</Card>

  <Card className="border-border bg-card shadow-sm">
  <CardHeader>
    <CardTitleTooltip title="Total Reach" tooltip="Reach breakdown from Meta" className="text-sm font-medium text-muted-foreground" />
  </CardHeader>

  <CardContent className="space-y-3">
    <div>
      <div className="mb-1 text-sm font-medium text-muted-foreground">
        Reach
      </div>

      <div className="flex items-end gap-3">
        <p className="text-[1.75rem] font-semibold leading-none tracking-tight">
          {formatNumber(dashboard?.summary.totalReach || 0)}
        </p>

        <ChangeIndicator value={dashboard?.summary.reachChangePct || 0} />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3 pt-1">
      <div className="border-r pr-3">
        <div className="mb-1 text-[0.68rem] font-medium leading-none text-muted-foreground">
          From followers
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold leading-none">
             {formatNumber(dashboard?.summary.reachFromFollowers || 0)}
</span>

          <DistributionPercent
  value={dashboard?.summary.reachFromFollowers || 0}
  total={dashboard?.summary.totalReach || 0}
/>
        </div>
      </div>

      <div>
        <div className="mb-1 text-[0.68rem] font-medium leading-none text-muted-foreground">
          From non-followers
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold leading-none">
            {formatNumber(dashboard?.summary.reachFromNonFollowers || 0)}
          </span>

          <DistributionPercent
  value={dashboard?.summary.reachFromNonFollowers || 0}
  total={dashboard?.summary.totalReach || 0}
/>
        </div>
      </div>
    </div>
  </CardContent>
</Card>
<Card className="border-border bg-card shadow-sm">
  <CardHeader>
    <CardTitleTooltip title="Interactions" tooltip="Total interaction breakdown from Meta" className="text-sm font-medium text-muted-foreground" />
  </CardHeader>

  <CardContent className="space-y-3">
    <div>
  
      <div className="flex items-end gap-3">
        <p className="text-[1.75rem] font-semibold leading-none tracking-tight">
          {formatNumber(dashboard?.summary.totalInteractions || 0)}
        </p>

        <ChangeIndicator value={dashboard?.summary.interactionsChangePct || 0} />
      </div>
    </div>
  </CardContent>
</Card>

<Card className="border-border bg-card shadow-sm">
  <CardHeader>
    <CardTitleTooltip title="Profile Views" tooltip="Visits to Instagram profile" className="text-sm font-medium text-muted-foreground" />
  </CardHeader>

  <CardContent>
    <div className="flex items-end gap-3">
      <p className="text-[1.75rem] font-semibold leading-none tracking-tight">
        {formatNumber(dashboard?.summary.totalProfileViews || 0)}
      </p>

      <ChangeIndicator
        value={dashboard?.summary.profileViewsChangePct || 0}
      />
    </div>
  </CardContent>
</Card>
  {/* Row 2: Avg Interactions - Engagement Rate - Conversion Rate - Save Rate */}
  
 <Card className="border-border bg-card shadow-sm">
  <CardHeader>
    <CardTitleTooltip title="Engagement Rate" tooltip="Interaction rate based on synced reach" className="text-sm font-medium text-muted-foreground" />
  </CardHeader>

  <CardContent>
    <div className="flex items-end gap-3">
      <p className="text-[1.75rem] font-semibold leading-none tracking-tight">
        {formatPercent(dashboard?.summary.engagementRate || 0)}
      </p>

      <ChangeIndicator
        value={dashboard?.summary.engagementRateChangePct || 0}
      />
    </div>
  </CardContent>
</Card>

  <Card className="border-border bg-card shadow-sm">
  <CardHeader>
    <CardTitleTooltip title="Conversion Rate" tooltip="Profile views divided by reach" className="text-sm font-medium text-muted-foreground" />
  </CardHeader>

  <CardContent>
    <div className="flex items-end gap-3">
      <p className="text-[1.75rem] font-semibold leading-none tracking-tight">
        {formatPercent(dashboard?.summary.profileVisitRate || 0)}
      </p>

      <ChangeIndicator
        value={dashboard?.summary.profileVisitRateChangePct || 0}
      />
    </div>
  </CardContent>
</Card>


</div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitleTooltip title="Meta Metrics Trend" tooltip="Reach, views, and interactions from synced Meta insight data." />
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dashboard?.monthlyViewsTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="month" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
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
                <CardTitleTooltip title="Top Content by Views" tooltip="Content ranking from the latest Meta sync." />
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
                <CardTitleTooltip title="Content Mix by Format" tooltip="Which Instagram format is carrying views and interactions." />
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
                <CardTitleTooltip title="Marketing Signals" tooltip="Quick reads that normally require checking Meta graphs manually." />
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
  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
    <div>
      <CardTitleTooltip title="Instagram Content Performance" tooltip="Real content performance from Meta API. Revenue and offline conversion are intentionally not shown until a connected source is available." />
    </div>

    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex h-10 items-center gap-3 rounded-xl border bg-secondary/60 px-4 shadow-sm">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Search
        </span>

        <input
          value={contentSearchKeyword}
          onChange={(event) => setContentSearchKeyword(event.target.value)}
          placeholder="Search caption..."
          className="w-[180px] bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex h-10 items-center gap-3 rounded-xl border bg-secondary/60 px-4 shadow-sm">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Sort By
        </span>

        <select
          value={contentSortBy}
          onChange={(event) => setContentSortBy(event.target.value)}
          className="bg-transparent text-sm font-medium outline-none"
        >
          <option value="latest">Latest Content</option>
          <option value="top_views">Top Views</option>
          <option value="top_reach">Top Reach</option>
          <option value="top_interactions">Top Interactions</option>
          <option value="top_engagement">Top Engagement</option>
        </select>
      </div>
    </div>
  </div>
</CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[1040px] text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-left text-muted-foreground">
                      <th className="px-4 py-3">Content</th>
                      <th className="px-4 py-3 text-left">Label</th>
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
  {paginatedContent.length === 0 ? (
    <tr>
      <td
        colSpan={10}
        className="px-4 py-8 text-center text-sm text-muted-foreground"
      >
        No content found for the selected keyword.
      </td>
    </tr>
  ) : (
    paginatedContent.map((item) => (
      <tr
        key={item.id}
        className="border-b border-border/30 align-top text-sm last:border-b-0"
      >
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
                        <td className="px-4 py-4 align-top">
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getContentLabelClass(
        item.contentLabel
      )}`}
    >
      {formatContentLabel(item.contentLabel)}
    </span>
  </td>

  <td className="px-4 py-4 align-top">
    {item.mediaProductType || item.mediaType || "-"}
  </td>

  <td className="px-4 py-4 text-right align-top">
    {formatNumber(item.views)}
  </td>

  <td className="px-4 py-4 text-right align-top">
    {formatNumber(item.reach)}
  </td>

  <td className="px-4 py-4 text-right align-top">
    {formatNumber(item.likes)}
  </td>

  <td className="px-4 py-4 text-right align-top">
    {formatNumber(item.comments)}
  </td>

  <td className="px-4 py-4 text-right align-top">
    {formatNumber(item.saved)}
  </td>

  <td className="px-4 py-4 text-right align-top">
    {formatNumber(item.shares)}
  </td>

  <td className="px-4 py-4 text-right align-top">
    {formatPercent(item.engagementRate)}
  </td>
</tr>
    ))
  )}
                  </tbody>
                </table>
                <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
  <p className="text-sm text-muted-foreground">
    Showing{" "}
    <span className="font-medium text-foreground">
      {sortedContentList.length === 0
  ? 0
  : (contentPage - 1) * CONTENT_PAGE_SIZE + 1}
    </span>
    {" - "}
    <span className="font-medium text-foreground">
      {Math.min(contentPage * CONTENT_PAGE_SIZE, sortedContentList.length)}
    </span>
    {" of "}
    <span className="font-medium text-foreground">
      {formatNumber(sortedContentList.length)}
    </span>
    {" content(s)"}
  </p>

  <div className="flex items-center gap-2">
    <Button
      variant="outline"
      size="sm"
      disabled={contentPage <= 1}
      onClick={() => setContentPage((page) => Math.max(1, page - 1))}
    >
      Previous
    </Button>

    <span className="text-sm text-muted-foreground">
      Page {contentPage} of {totalContentPages}
    </span>

    <Button
      variant="outline"
      size="sm"
      disabled={contentPage >= totalContentPages}
      onClick={() =>
        setContentPage((page) => Math.min(totalContentPages, page + 1))
      }
    >
      Next
    </Button>
  </div>
</div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
