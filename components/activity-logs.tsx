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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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

export function ActivityLogs() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<ActivityType | "all">("all")
  const [filterStatus, setFilterStatus] = useState<ActivityStatus | "all">("all")
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
            <div className="flex flex-wrap gap-2">
              {(["all", "success", "warning", "error"] as const).map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus(status)}
                  className="capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Showing {filteredActivities.length} of {activities.length} activity item(s)
          </CardDescription>
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
              {filteredActivities.map((activity) => {
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
                        <span>{activity.relativeTime}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
