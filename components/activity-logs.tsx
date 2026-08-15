"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Download,
  Filter,
  Loader2,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react"

import { BusinessErrorAlert } from "@/components/business-error-alert"
import { PageSkeleton } from "@/components/page-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardTitleTooltip } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getApiUrl } from "@/lib/api"
import { getAuthHeaders } from "@/lib/roles"

const typeConfig = {
  auth: { icon: User, label: "Authentication", color: "text-chart-2" },
  data: { icon: Database, label: "Data", color: "text-chart-1" },
  ai: { icon: Sparkles, label: "AI", color: "text-chart-4" },
  config: { icon: Settings, label: "Configuration", color: "text-chart-3" },
  report: { icon: TrendingUp, label: "Reports", color: "text-chart-5" },
} as const

type ActivityType = keyof typeof typeConfig

type ActivityStatus = "success" | "warning" | "error"

interface ActivityItem {
  id: string
  type: ActivityType
  action: string
  user: string
  role: string
  details: string
  timestamp: string
  relativeTime: string
  status: ActivityStatus
}
const formatActivityDisplayTime = (
  timestamp?: string | null,
  relativeTime?: string | null
) => {
  if (!timestamp) return relativeTime || "-"

  const activityDate = new Date(timestamp)

  if (Number.isNaN(activityDate.getTime())) {
    return relativeTime || "-"
  }

  const today = new Date()

  const isSameDay =
    activityDate.getFullYear() === today.getFullYear() &&
    activityDate.getMonth() === today.getMonth() &&
    activityDate.getDate() === today.getDate()

  if (isSameDay) {
    return relativeTime || "-"
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(activityDate)
}

export function ActivityLogs() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<ActivityType | "all">("all")
  const [filterStatus, setFilterStatus] = useState<ActivityStatus | "all">("all")
  const [activityPage, setActivityPage] = useState(1)
const ACTIVITY_PAGE_SIZE = 10
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadActivities = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(getApiUrl("/operations/history"), {
        method: "GET",
        cache: "no-store",
        headers: getAuthHeaders(),
      })

      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.success || !Array.isArray(result.data)) {
        throw new Error(result?.message || "History could not be loaded.")
      }

      setActivities(result.data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "History could not be loaded.")
      setActivities([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadActivities()
  }, [])

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      const matchesSearch = [activity.action, activity.user, activity.details, activity.role]
        .join(" ")
        .toLowerCase()
        .includes(searchQuery.toLowerCase())

      const matchesType = filterType === "all" || activity.type === filterType
      const matchesStatus = filterStatus === "all" || activity.status === filterStatus
      return matchesSearch && matchesType && matchesStatus
    })
  }, [activities, filterStatus, filterType, searchQuery])

  const totalActivityPages = Math.max(
  1,
  Math.ceil(filteredActivities.length / ACTIVITY_PAGE_SIZE)
)

const paginatedActivities = useMemo(() => {
  const startIndex = (activityPage - 1) * ACTIVITY_PAGE_SIZE
  const endIndex = startIndex + ACTIVITY_PAGE_SIZE

  return filteredActivities.slice(startIndex, endIndex)
}, [activityPage, filteredActivities])

useEffect(() => {
  setActivityPage(1)
}, [searchQuery, filterType, filterStatus])

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const query = new URLSearchParams({
        search: searchQuery,
        type: filterType,
        status: filterStatus,
      })

      const response = await fetch(getApiUrl(`/operations/history/export?${query.toString()}`), {
        method: "GET",
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error("History export could not be prepared.")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `maiinsight-history-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "History export could not be prepared.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">History</h1>
          <p className="text-muted-foreground">Review important MaiinSight activity across data, AI, reports, and system actions.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport} disabled={isExporting}>
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export Logs
        </Button>
      </div>

      {error ? (
        <BusinessErrorAlert
          title="History Unavailable"
          message="Activity history could not be loaded."
          suggestion="Please try again or contact IT Support if the issue continues."
          technicalDetails={error}
        />
      ) : null}

      <Card className="bg-card border-border shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search activity, user, role, or details..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant={filterType === "all" ? "secondary" : "outline"} size="sm" onClick={() => setFilterType("all")}>All Types</Button>
              {(Object.keys(typeConfig) as ActivityType[]).map((type) => {
                const config = typeConfig[type]
                return (
                  <Button key={type} variant={filterType === type ? "secondary" : "outline"} size="sm" onClick={() => setFilterType(type)} className="gap-2">
                    <config.icon className={`h-4 w-4 ${config.color}`} />
                    {config.label}
                  </Button>
                )
              })}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="status-filter" className="whitespace-nowrap text-sm text-muted-foreground">
                Status
              </Label>
              <Select
                value={filterStatus}
                onValueChange={(value) => setFilterStatus(value as ActivityStatus | "all")}
              >
                <SelectTrigger id="status-filter" size="sm" className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitleTooltip title="Recent Activity" tooltip={`Chronological list of user actions, system events, and configuration changes. Showing ${filteredActivities.length} of ${activities.length} activity item(s)`} />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PageSkeleton cards={3} lines={2} />
          ) : filteredActivities.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <Filter className="h-10 w-10" />
              <div>
                <p className="font-medium text-foreground">No matching activity found.</p>
                <p className="text-sm">Try clearing a filter or perform a new action in MaiinSight.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedActivities.map((activity) => {
                const config = typeConfig[activity.type]
                const Icon = config.icon
                return (
                  <div key={activity.id} className="flex gap-4 rounded-xl border border-border bg-secondary/50 p-4 transition-colors hover:bg-secondary/80">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      activity.status === "error"
                        ? "bg-destructive/10"
                        : activity.status === "warning"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-secondary"
                    }`}>
                      {activity.status === "error" ? (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      ) : activity.status === "success" ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h4 className="font-medium">{activity.action}</h4>
                        <Badge variant="outline" className="text-xs">{config.label}</Badge>
                        <Badge variant={activity.status === "error" ? "destructive" : "secondary"} className="capitalize">
                          {activity.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{activity.details}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span>{activity.user}</span>
                        <span>{activity.role}</span>
                        <span>
  {formatActivityDisplayTime(activity.timestamp, activity.relativeTime)}
</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-sm text-muted-foreground">
      Showing{" "}
      <span className="font-medium text-foreground">
        {filteredActivities.length === 0
          ? 0
          : (activityPage - 1) * ACTIVITY_PAGE_SIZE + 1}
      </span>
      {" - "}
      <span className="font-medium text-foreground">
        {Math.min(activityPage * ACTIVITY_PAGE_SIZE, filteredActivities.length)}
      </span>
      {" of "}
      <span className="font-medium text-foreground">
        {filteredActivities.length}
      </span>
      {" activity item(s)"}
    </p>

    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={activityPage <= 1}
        onClick={() => setActivityPage((page) => Math.max(1, page - 1))}
      >
        Previous
      </Button>

      <span className="text-sm text-muted-foreground">
        Page {activityPage} of {totalActivityPages}
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={activityPage >= totalActivityPages}
        onClick={() =>
          setActivityPage((page) => Math.min(totalActivityPages, page + 1))
        }
      >
        Next
      </Button>
    </div>
  </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
