"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Eye,
  GitGraph,
  Heart,
  MessageCircle,
  Share2,
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
    latestSuccessfulSync: {
      status: string
      startedAt: string
      finishedAt?: string | null
    } | null
    setupMessage: string | null
    suggestion: string | null
    connectionError: string | null
  }
}

interface CampaignInsight {
  internalKey: string
  promoName: string
  startDate: string | null
  endDate: string | null
  contentCount: number
  uniqueCustomerCount: number
  totalBookingCount: number
  revenue: number
  customerSharePct: number | null
  totalCustomers: number
  insight: string | null
}
interface CampaignInsightsResponse {
  success: boolean
  data?: { campaigns: CampaignInsight[]; attribution: string }
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
    latestSyncStatus: string | null
    summary: {
  totalViews: number | null
  viewsChangePct: number | null
viewsFromFollowers: number | null
viewsFromFollowersPct: number | null
viewsFromFollowersChangePct: number

viewsFromNonFollowers: number | null
viewsFromNonFollowersPct: number | null
viewsFromNonFollowersChangePct: number

  totalReach: number | null
  totalProfileViews: number | null
  profileViewsChangePct: number | null
  totalInteractions: number | null
  totalLikes: number
  totalComments: number
  totalShares: number
  totalSaved: number
 engagementRate: number | null
 engagementRateChangePct: number | null

shareRate: number
saveRate: number

profileVisitRate: number | null
profileVisitRateChangePct: number | null
 averageInteractionsPerContent: number

interactionsChangePct: number | null

interactionsFromFollowers: number
interactionsFromFollowersChangePct: number

interactionsFromNonFollowers: number
interactionsFromNonFollowersChangePct: number

interactionsFromFollowersPct: number
interactionsFromNonFollowersPct: number

  contentCount: number
  topContentType: string

  reachChangePct: number | null
reachFromFollowers: number | null
reachFromFollowersPct: number | null
reachFromFollowersChangePct: number

reachFromNonFollowers: number | null
reachFromNonFollowersPct: number | null
reachFromNonFollowersChangePct: number

  followersCount: number | null
  followersChangePct: number
  followerSnapshotDate: string | null
  followerSnapshotSource: "selected_period" | "latest_fallback" | "unavailable"
  hasSelectedPeriodFollowerSnapshot: boolean

newFollowsCount: number | null
newFollowsChangePct: number | null

  unfollowsCount: number | null
  unfollowsChangePct: number | null
  followsCount: number
  instagramMediaCount: number
  instagramUsername: string | null
  availability: {
    views: boolean
    viewsBreakdown: boolean
    reach: boolean
    reachBreakdown: boolean
    profileViews: boolean
    follows: boolean
    unfollows: boolean
    followersSnapshot: boolean
  }
  metricCoverage: Record<string, {
    source: string
    attemptedMonths: number
    availableMonths: number
    totalMonths: number
    complete: boolean
    availability: "available" | "partial" | "unavailable"
    aggregation: string
  }>
}
    trend: Array<{
      date: string
      reach: number | null
      views: number | null
      interactions: number | null
      profileViews: number | null
      engagementRate?: number | null
    }>
    monthlyViewsTrend: Array<{
  month: string

  views: number | null
  viewsFromFollowers: number
  viewsFromNonFollowers: number

  reach: number | null
  reachFromFollowers: number
  reachFromNonFollowers: number

  interactions: number | null
  interactionsFromFollowers: number
  interactionsFromNonFollowers: number

  profileViews: number | null

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
  thumbnailUrl: string | null
  permalink: string | null
  postedAt: string | null
  views: number | null
  reach: number | null
  likes: number
  comments: number
  interactions: number
  shares: number | null
  saved: number | null
  engagementRate: number | null
  shareRate: number | null
  saveRate: number | null
}>
contentList: Array<{
  id: string
  caption: string | null
  contentLabel: string
  mediaType: string | null
  mediaProductType: string | null
  mediaUrl: string | null
  thumbnailUrl: string | null
  permalink: string | null
  postedAt: string | null
  views: number | null
  reach: number | null
  likes: number
  comments: number
  interactions: number
  shares: number | null
  saved: number | null
  engagementRate: number | null
  shareRate: number | null
  saveRate: number | null
}>

contentListTotal: number
contentInsightsAvailability: {
  totalMedia: number
  mediaWithInsights: number
  mediaWithoutInsights: number
  outsideInsightRetention: number
}
  }
}

// Hidden per business decision: the extraction backing this card is bottlenecked
// by the Gemini API free-tier daily quota, so it's not ready for users yet. The
// backend service, routes, and data are untouched — flip this back to re-enable.
const SHOW_PROMOTION_ATTRIBUTION = false

const formatNumber = (value: number) => value.toLocaleString("en-US")
const formatPercent = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(1)}%`
    : "Not available"
const formatAvailableNumber = (value: number | null | undefined) =>
  value == null ? "Not available" : formatNumber(value)
const formatAvailablePercent = (value: number | null | undefined) =>
  formatPercent(value)
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

const CoverageNote = ({
  coverage,
}: {
  coverage?: { availableMonths: number; totalMonths: number; complete: boolean }
}) => {
  if (!coverage || coverage.complete || coverage.totalMonths <= 1) return null
  return (
    <p className="mt-2 text-xs text-amber-700">
      Partial history: {coverage.availableMonths} of {coverage.totalMonths} months available.
    </p>
  )
}
const formatUploadDate = (value?: string | null) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}
const formatSnapshotDate = (value?: string | null) => {
  if (!value) return "Not available"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not available"
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
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

// Instagram's own mediaUrl/thumbnailUrl are temporary, signed CDN links that
// expire, so the backend caches the image bytes and serves them from
// /meta/media/:id/image instead. That endpoint requires auth, so a plain
// <img src> can't be used directly — fetch with the auth header and render
// the result as a blob URL.
function InstagramContentImage({
  mediaId,
  alt,
  className,
  fallbackIconClassName = "h-6 w-6",
}: {
  mediaId: string
  alt: string
  className?: string
  fallbackIconClassName?: string
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    let currentUrl: string | null = null
    setObjectUrl(null)
    setFailed(false)

    fetch(getApiUrl(`/meta/media/${mediaId}/image`), {
      headers: getAuthHeaders(),
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) throw new Error("Image not available")
        return response.blob()
      })
      .then((blob) => {
        if (cancelled) return
        currentUrl = URL.createObjectURL(blob)
        setObjectUrl(currentUrl)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      if (currentUrl) URL.revokeObjectURL(currentUrl)
    }
  }, [mediaId])

  if (!objectUrl || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <GitGraph className={`${fallbackIconClassName} text-muted-foreground`} />
      </div>
    )
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={objectUrl} alt={alt} className={className} />
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
  const [campaignInsights, setCampaignInsights] = useState<CampaignInsight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<{ message: string; suggestion?: string | null; technical?: string | null } | null>(null)

const [contentPage, setContentPage] = useState(1)
const [contentSortBy, setContentSortBy] = useState("latest")
const [contentSearchKeyword, setContentSearchKeyword] = useState("")
const CONTENT_PAGE_SIZE = 10

const loadMetaStatus = useCallback(async () => {
  try {
    const response = await fetch(getApiUrl("/meta/status"), {
      method: "GET",
      cache: "no-store",
      headers: getAuthHeaders(),
    })
    const result: MetaStatusResponse | null = await response.json().catch(() => null)

    if (!response.ok || !result?.success || !result.data) {
      throw new Error(result?.message || "InstaSight status could not be loaded.")
    }

    setStatus(result.data)
  } catch {
    setStatus(null)
  }
}, [])

const loadMetaDashboard = useCallback(async () => {
  try {
    setIsLoading(true)
    setError(null)

    const query = new URLSearchParams()
const monthRange = getMonthDateRange(selectedYear, selectedMonth)

query.set("since", monthRange.startDate)
query.set("until", monthRange.endDate)

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
      setError({
        message: dashboardResult?.message || "InstaSight data could not be loaded.",
        suggestion: dashboardResult?.suggestion || "Stored InstaSight data could not be loaded. Please try again or contact IT Support.",
      })
      return
    }

    setDashboard(dashboardResult.data)

    const campaignResponse = await fetch(getApiUrl(`/meta/campaign-attribution?${query.toString()}`), { method: "GET", cache: "no-store", headers: getAuthHeaders() })
    const campaignResult: CampaignInsightsResponse | null = await campaignResponse.json().catch(() => null)
    setCampaignInsights(campaignResult?.success ? campaignResult.data?.campaigns || [] : [])
  } catch (loadError) {
    setDashboard(null)
    setError({
      message: loadError instanceof Error ? loadError.message : "InstaSight could not be loaded.",
      suggestion: "Please try again or contact IT Support if the issue continues.",
    })
  } finally {
    setIsLoading(false)
  }
}, [selectedMonth, selectedYear])

useEffect(() => {
  void loadMetaDashboard()
}, [loadMetaDashboard])

useEffect(() => {
  void loadMetaStatus()
}, [loadMetaStatus])

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
    if (
      contentLabelFilter !== "all" &&
      item.contentLabel !== contentLabelFilter
    ) {
      return false
    }

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
}, [contentList, contentLabelFilter, contentSortBy, contentSearchKeyword])

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
          <p className="text-sm text-muted-foreground">Instagram performance from synchronized MaiinSight data.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={onViewAudience}>
            <Users className="h-4 w-4" />
            View Audience Demographic
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

    </div>
  </CardContent>
</Card>
      {dashboard?.contentInsightsAvailability &&
      dashboard.contentInsightsAvailability.mediaWithoutInsights > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <div className="space-y-1">
              <p className="font-semibold">Data tidak lengkap untuk periode ini</p>
              {dashboard.contentInsightsAvailability.outsideInsightRetention > 0 ? (
                <p>
                  Dari {dashboard.contentInsightsAvailability.totalMedia} konten di periode ini,
                  hanya {dashboard.contentInsightsAvailability.mediaWithInsights} yang memiliki data
                  metrik. Meta (Instagram) hanya menyimpan metrik performa konten selama sekitar 24
                  bulan terakhir, sehingga {dashboard.contentInsightsAvailability.mediaWithoutInsights}{" "}
                  konten yang lebih lama tetap ditampilkan tetapi tanpa views, reach, likes, dan
                  metrik lainnya.
                </p>
              ) : (
                <p>
                  {dashboard.contentInsightsAvailability.mediaWithoutInsights} dari{" "}
                  {dashboard.contentInsightsAvailability.totalMedia} konten di periode ini belum
                  memiliki data metrik. Jalankan sync Meta agar data terbaru tersimpan.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {hasRealData && (status?.connectionState === "error" || status?.configured === false) ? (
        <BusinessErrorAlert
          title="Meta synchronization warning"
          message="Meta synchronization is currently unavailable or not configured. Showing stored InstaSight data."
          suggestion={`Last successfully synced: ${dashboard?.lastSyncedAt ? new Date(dashboard.lastSyncedAt).toLocaleString() : "Not available"}`}
          technicalDetails={canViewTechnicalDetails ? status?.connectionError : null}
          showTechnicalDetails={canViewTechnicalDetails}
        />
      ) : null}
      {isLoading ? (
        <StateCard state="loading" title="Loading InstaSight data..." minHeight="min-h-[240px]" />
      ) : status && !status.configured && !hasRealData ? (
        <StateCard
          state="warning"
          title="Meta API is not connected yet."
          description={status?.suggestion || "Please ask IT Support to configure Meta credentials in Settings or environment variables."}
          minHeight="min-h-[220px]"
        />
      ) : status?.connectionState === "error" && status?.connectionError && !hasRealData ? (
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
            <p>Instagram data will appear here after the first Meta synchronization completes.</p>
            <p>Last sync status: <span className="font-medium text-foreground">{status?.latestSync?.status || "Not synced"}</span></p>
          </CardContent>
        </Card>
      ) : (
        <>
         
  <div className="grid gap-4 xl:grid-cols-4">

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
    <CardTitleTooltip title="Followers Snapshot" tooltip="A stored follower-count snapshot. This value is never estimated from follows and unfollows." className="text-sm font-medium text-muted-foreground" />
  </CardHeader>

  <CardContent className="space-y-3">
    <div>
      <div className="mb-1 flex items-center gap-1 text-sm font-medium text-muted-foreground">
        <span>Followers</span>
      </div>

      <div>
        <p className="text-[1.75rem] font-semibold leading-none tracking-tight">
          {formatAvailableNumber(dashboard?.summary.followersCount)}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {dashboard?.summary.followerSnapshotDate
            ? `Latest snapshot: ${formatSnapshotDate(dashboard.summary.followerSnapshotDate)}`
            : "No snapshot available"}
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
        {formatAvailableNumber(dashboard?.summary.newFollowsCount)}
      </span>

      {dashboard?.summary.newFollowsChangePct != null ? (
        <ChangeIndicator value={dashboard.summary.newFollowsChangePct} />
      ) : (
        <span className="text-xs text-muted-foreground">Not available</span>
      )}
    </div>
  </div>

  <div>
    <div className="mb-1 text-[0.68rem] font-medium leading-none text-muted-foreground">
      Unfollow
    </div>

    <div className="flex items-center gap-1.5">
      <span className="text-sm font-semibold leading-none">
        {formatAvailableNumber(dashboard?.summary.unfollowsCount)}
      </span>

      {dashboard?.summary.unfollowsChangePct != null ? (
        <ChangeIndicator value={dashboard.summary.unfollowsChangePct} isNegativeGood />
      ) : (
        <span className="text-xs text-muted-foreground">Not available</span>
      )}
    </div>
  </div>
</div>
  </CardContent>
</Card>

  <Card className="border-border bg-card shadow-sm">
  <CardHeader>
    <CardTitleTooltip title="Total Views" tooltip="Historical Instagram account views during the selected calendar period." className="text-sm font-medium text-muted-foreground" />
  </CardHeader>

  <CardContent className="space-y-3">
    <div>
      <div className="mb-1 text-sm font-medium text-muted-foreground">
        Views
      </div>

      <div className="flex items-end gap-3">
        <p className="text-[1.75rem] font-semibold leading-none tracking-tight">
          {formatAvailableNumber(dashboard?.summary.totalViews)}
        </p>

        {dashboard?.summary.viewsChangePct != null ? <ChangeIndicator value={dashboard.summary.viewsChangePct} /> : null}
      </div>
      <CoverageNote coverage={dashboard?.summary.metricCoverage?.views} />
    </div>

    <div className="grid grid-cols-2 gap-3 pt-1">
  <div className="border-r pr-3">
    <div className="mb-1 text-[0.68rem] font-medium leading-none text-muted-foreground">
      From followers
    </div>

    <div className="flex items-center gap-1.5">
      <span className="text-sm font-semibold leading-none">
        {formatAvailableNumber(dashboard?.summary.viewsFromFollowers)}
      </span>

      {dashboard?.summary.viewsFromFollowers != null && dashboard.summary.totalViews != null ? (
        <DistributionPercent value={dashboard.summary.viewsFromFollowers} total={dashboard.summary.totalViews} />
      ) : null}
    </div>
  </div>

  <div>
    <div className="mb-1 text-[0.68rem] font-medium leading-none text-muted-foreground">
      From non-followers
    </div>

    <div className="flex items-center gap-1.5">
      <span className="text-sm font-semibold leading-none">
        {formatAvailableNumber(dashboard?.summary.viewsFromNonFollowers)}
      </span>

      {dashboard?.summary.viewsFromNonFollowers != null && dashboard.summary.totalViews != null ? (
        <DistributionPercent value={dashboard.summary.viewsFromNonFollowers} total={dashboard.summary.totalViews} />
      ) : null}
    </div>
  </div>
</div>
  </CardContent>
</Card>

  <Card className="border-border bg-card shadow-sm">
  <CardHeader>
    <CardTitleTooltip title="Total Reach" tooltip="Historical Instagram account reach during the selected calendar period; yearly values sum monthly reach and are not annual unique reach." className="text-sm font-medium text-muted-foreground" />
  </CardHeader>

  <CardContent className="space-y-3">
    <div>
      <div className="mb-1 text-sm font-medium text-muted-foreground">
        Reach
      </div>

      <div className="flex items-end gap-3">
        <p className="text-[1.75rem] font-semibold leading-none tracking-tight">
          {formatAvailableNumber(dashboard?.summary.totalReach)}
        </p>

        {dashboard?.summary.reachChangePct != null ? <ChangeIndicator value={dashboard.summary.reachChangePct} /> : null}
      </div>
      <CoverageNote coverage={dashboard?.summary.metricCoverage?.reach} />
    </div>

    <div className="grid grid-cols-2 gap-3 pt-1">
      <div className="border-r pr-3">
        <div className="mb-1 text-[0.68rem] font-medium leading-none text-muted-foreground">
          From followers
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold leading-none">
             {formatAvailableNumber(dashboard?.summary.reachFromFollowers)}
</span>

          {dashboard?.summary.reachFromFollowers != null && dashboard.summary.totalReach != null ? (
            <DistributionPercent value={dashboard.summary.reachFromFollowers} total={dashboard.summary.totalReach} />
          ) : null}
        </div>
      </div>

      <div>
        <div className="mb-1 text-[0.68rem] font-medium leading-none text-muted-foreground">
          From non-followers
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold leading-none">
            {formatAvailableNumber(dashboard?.summary.reachFromNonFollowers)}
          </span>

          {dashboard?.summary.reachFromNonFollowers != null && dashboard.summary.totalReach != null ? (
            <DistributionPercent value={dashboard.summary.reachFromNonFollowers} total={dashboard.summary.totalReach} />
          ) : null}
        </div>
      </div>
    </div>
  </CardContent>
</Card>
<Card className="border-border bg-card shadow-sm">
  <CardHeader>
    <CardTitleTooltip title="Interactions" tooltip="Historical Instagram account interactions during the selected calendar period." className="text-sm font-medium text-muted-foreground" />
  </CardHeader>

  <CardContent className="space-y-3">
    <div>
  
      <div className="flex items-end gap-3">
        <p className="text-[1.75rem] font-semibold leading-none tracking-tight">
          {formatAvailableNumber(dashboard?.summary.totalInteractions)}
        </p>

        {dashboard?.summary.interactionsChangePct != null ? <ChangeIndicator value={dashboard.summary.interactionsChangePct} /> : null}
      </div>
      <CoverageNote coverage={dashboard?.summary.metricCoverage?.total_interactions} />
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
        {formatAvailableNumber(dashboard?.summary.totalProfileViews)}
      </p>

      {dashboard?.summary.profileViewsChangePct != null ? <ChangeIndicator value={dashboard.summary.profileViewsChangePct} /> : null}
    </div>
    <CoverageNote coverage={dashboard?.summary.metricCoverage?.profile_views} />
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
        {formatAvailablePercent(dashboard?.summary.engagementRate)}
      </p>

      {dashboard?.summary.engagementRateChangePct != null ? <ChangeIndicator value={dashboard.summary.engagementRateChangePct} /> : null}
    </div>
    <CoverageNote coverage={dashboard?.summary.metricCoverage?.engagement_rate} />
  </CardContent>
</Card>

  <Card className="border-border bg-card shadow-sm">
  <CardHeader>
    <CardTitleTooltip title="Profile Visit Rate" tooltip="Profile views divided by reach; this is not a booking or transaction conversion rate." className="text-sm font-medium text-muted-foreground" />
  </CardHeader>

  <CardContent>
    <div className="flex items-end gap-3">
      <p className="text-[1.75rem] font-semibold leading-none tracking-tight">
        {formatAvailablePercent(dashboard?.summary.profileVisitRate)}
      </p>

      {dashboard?.summary.profileVisitRateChangePct != null ? <ChangeIndicator value={dashboard.summary.profileVisitRateChangePct} /> : null}
    </div>
    <CoverageNote coverage={dashboard?.summary.metricCoverage?.profile_visit_rate} />
  </CardContent>
</Card>


</div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitleTooltip title="Meta Metrics Trend" tooltip="Historical Instagram account activity during the selected calendar period. Missing Meta metrics remain unavailable." />
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
                          return [value == null ? "Not available" : formatNumber(Number(value)), labels[String(name)] || String(name)]
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

             {SHOW_PROMOTION_ATTRIBUTION && (
             <Card className="border-border bg-card shadow-sm">
  <CardHeader>
    <div className="flex items-start justify-between gap-3">
      <div>
        <CardTitleTooltip title="Promotion Attribution" tooltip="Booking attribution uses normalized promotion tokens and valid play dates inside the extracted promotion period." />
        <CardDescription className="mt-2">Instagram promotion content matched to customer bookings.</CardDescription>
      </div>
      {campaignInsights[0] ? <Badge className="bg-primary text-primary-foreground">Top Promotion</Badge> : null}
    </div>
  </CardHeader>
  <CardContent className="space-y-4">
    {!campaignInsights.length ? (
      <StateCard state="empty" title="No promotion attribution yet" description="Run the scheduled campaign attribution extraction after syncing Instagram content." minHeight="min-h-[180px]" />
    ) : campaignInsights.map((campaign, index) => (
      <div key={campaign.internalKey} className={index === 0 ? "rounded-xl border border-primary/40 bg-primary/5 p-4" : "rounded-xl border border-border/60 bg-secondary/20 p-4"}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><p className="font-semibold text-foreground">{campaign.promoName}</p>{index === 0 ? <Badge variant="secondary">Top Promotion</Badge> : null}</div>
            <p className="mt-1 text-xs text-muted-foreground">{formatUploadDate(campaign.startDate)} – {formatUploadDate(campaign.endDate)} · {formatNumber(campaign.contentCount)} content</p>
          </div>
          <p className="text-sm font-semibold text-foreground">Rp {formatNumber(campaign.revenue)}</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-background/70 p-3"><p className="text-xs text-muted-foreground">Unique customers</p><p className="mt-1 text-lg font-semibold">{formatNumber(campaign.uniqueCustomerCount)}</p></div>
          <div className="rounded-lg border bg-background/70 p-3"><p className="text-xs text-muted-foreground">Total bookings</p><p className="mt-1 text-lg font-semibold">{formatNumber(campaign.totalBookingCount)}</p></div>
          <div className="rounded-lg border bg-background/70 p-3"><p className="text-xs text-muted-foreground">Customer share</p><p className="mt-1 text-lg font-semibold">{campaign.customerSharePct == null ? "Not available" : campaign.customerSharePct.toFixed(1) + "%"}</p></div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{campaign.insight || (campaign.customerSharePct == null ? "Customer share is unavailable for the selected period." : campaign.customerSharePct.toFixed(1) + "% pelanggan periode ini teridentifikasi booking lewat promo dari Instagram; ini adalah observasi korelasi, bukan klaim sebab-akibat.")}</p>
      </div>
    ))}
  </CardContent>
</Card>
             )}

                        <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitleTooltip title="Content Type Engagement" tooltip="Which Instagram format is carrying views and interactions." />
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
          </div>

            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitleTooltip title="Top Content by Views" tooltip="Selected-period content ranked by its latest stored view snapshot, not views earned only within the posting month." />
              </CardHeader>
              <CardContent>
                {!topContent.length ? (
                  <StateCard state="empty" title="Views not available" description="Meta did not return a supported view metric for content in this period." minHeight="min-h-[260px]" />
                ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {topContent.slice(0, 6).map((item) => (
                    <div key={item.id} className="group relative overflow-hidden rounded-lg border border-border/50 bg-card">
                      <div className="relative aspect-square overflow-hidden bg-secondary">
                        <InstagramContentImage
                          mediaId={item.id}
                          alt={item.caption || "Instagram content"}
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          fallbackIconClassName="h-6 w-6"
                        />
                        {item.permalink ? (
                          <a
                            href={item.permalink}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Open Instagram"
                            className="absolute inset-0"
                          />
                        ) : null}

                        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5">
                          <div className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 backdrop-blur-sm">
                            <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                            <span className="text-xs font-semibold text-white">{formatNumber(item.likes)}</span>
                          </div>
                          <div className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 backdrop-blur-sm">
                            <MessageCircle className="h-3 w-3 text-sky-400" />
                            <span className="text-xs font-semibold text-white">{formatNumber(item.comments)}</span>
                          </div>
                          <div className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 backdrop-blur-sm">
                            <Share2 className="h-3 w-3 text-emerald-400" />
                            <span className="text-xs font-semibold text-white">{formatAvailableNumber(item.shares)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2">
                        <p className="text-[0.68rem] text-muted-foreground">{formatUploadDate(item.postedAt)}</p>
                        <div className="flex items-center gap-1 text-[0.68rem] text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          <span>{formatNumber(item.views ?? 0)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </CardContent>
            </Card>

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

      <div className="w-[220px]">
        <Select value={contentLabelFilter} onValueChange={setContentLabelFilter}>
          <SelectTrigger className="h-10 w-full rounded-xl border bg-secondary/60 px-4 shadow-sm">
            <div className="flex w-full items-center gap-3">
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Content Type
              </span>
              <SelectValue placeholder="All Type" />
            </div>
          </SelectTrigger>

          <SelectContent className="w-[220px] rounded-xl border bg-background shadow-lg">
            <SelectItem value="all">All Type</SelectItem>
            <SelectItem value="content_promotion">Promotion</SelectItem>
            <SelectItem value="content_advertisement">Advertisement</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-[210px]">
        <Select value={contentSortBy} onValueChange={setContentSortBy}>
          <SelectTrigger className="h-10 w-full rounded-xl border bg-secondary/60 px-4 shadow-sm">
            <div className="flex w-full items-center gap-3">
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Sort By
              </span>
              <SelectValue placeholder="Latest Content" />
            </div>
          </SelectTrigger>

          <SelectContent className="w-[210px] rounded-xl border bg-background shadow-lg">
            <SelectItem value="latest">Latest Content</SelectItem>
            <SelectItem value="top_views">Top Views</SelectItem>
            <SelectItem value="top_reach">Top Reach</SelectItem>
            <SelectItem value="top_interactions">Top Interactions</SelectItem>
            <SelectItem value="top_engagement">Top Engagement</SelectItem>
          </SelectContent>
        </Select>
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
                      <th className="px-4 py-3 text-left">Upload Date</th>
                      <th className="px-4 py-3 text-left">Label</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-right">Views</th>
                      <th className="px-4 py-3 text-right">
                        Reach<sup className="ml-0.5 text-primary" aria-label="see note below">*</sup>
                      </th>
                      <th className="px-4 py-3 text-right">Likes</th>
                      <th className="px-4 py-3 text-right">Comments</th>
                      <th className="px-4 py-3 text-right">
                        Saves<sup className="ml-0.5 text-primary" aria-label="see note below">*</sup>
                      </th>
                      <th className="px-4 py-3 text-right">Shares</th>
                      <th className="px-4 py-3 text-right">Engagement</th>
                    </tr>
                  </thead>
                  <tbody>
  {paginatedContent.length === 0 ? (
    <tr>
      <td
        colSpan={11}
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
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                              <InstagramContentImage
                                mediaId={item.id}
                                alt={item.caption || "Instagram content"}
                                className="h-full w-full object-cover"
                                fallbackIconClassName="h-4 w-4"
                              />
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
                        <td className="whitespace-nowrap px-4 py-4 align-top">
                          {formatUploadDate(item.postedAt)}
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
    {formatAvailableNumber(item.views)}
  </td>

  <td className="px-4 py-4 text-right align-top">
    {formatAvailableNumber(item.reach)}
  </td>

  <td className="px-4 py-4 text-right align-top">
    {formatNumber(item.likes)}
  </td>

  <td className="px-4 py-4 text-right align-top">
    {formatNumber(item.comments)}
  </td>

  <td className="px-4 py-4 text-right align-top">
    {formatAvailableNumber(item.saved)}
  </td>

  <td className="px-4 py-4 text-right align-top">
    {formatAvailableNumber(item.shares)}
  </td>

  <td className="px-4 py-4 text-right align-top">
    {formatAvailablePercent(item.engagementRate)}
  </td>
</tr>
    ))
  )}
                  </tbody>
                </table>
                <div className="border-t px-4 py-2.5">
                  <p className="text-xs text-muted-foreground">
                    <sup className="text-primary">*</sup> Reach and saves are fetched directly from Instagram&apos;s per-post insights API and reflect the{" "}
                    <span className="font-medium text-foreground">finalized values recorded by Instagram</span> for
                    that content. These numbers can differ from the live counters shown in the Instagram app,
                    because the app keeps recalculating reach as more people discover a post (reels surfaced in
                    Explore, feed recommendations, and shares keep adding reach), and the API only publishes the
                    finalized snapshot with a processing delay of up to 48 hours. The values above are{" "}
                    <span className="font-medium text-foreground">still fully usable</span> for comparing content
                    performance against one another and tracking trends, since every post is measured the same way.
                  </p>
                </div>
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
