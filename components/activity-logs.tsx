"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Search, 
  Filter,
  Download,
  User,
  Database,
  Sparkles,
  Settings,
  TrendingUp,
  Upload,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle
} from "lucide-react"

type ActivityType = "auth" | "data" | "ai" | "config" | "report"

interface Activity {
  id: string
  type: ActivityType
  action: string
  user: string
  role: string
  details: string
  timestamp: string
  status: "success" | "warning" | "error"
}

const activities: Activity[] = [
  { id: "1", type: "auth", action: "Login", user: "Sabri Kurniadi", role: "Admin", details: "Logged in from 192.168.1.100", timestamp: "2 min ago", status: "success" },
  { id: "2", type: "data", action: "Data Sync", user: "System", role: "System", details: "Gemini API synchronized 4,520 records", timestamp: "5 min ago", status: "success" },
  { id: "3", type: "ai", action: "Strategy Generated", user: "Arrief Hardian", role: "Admin", details: "Created Weekend Flash Sale campaign", timestamp: "15 min ago", status: "success" },
  { id: "4", type: "config", action: "Settings Updated", user: "Sabri Kurniadi", role: "it_support", details: "Updated API token for CRM integration", timestamp: "30 min ago", status: "success" },
  { id: "5", type: "data", action: "CSV Import", user: "Jane Smith", role: "Marketing", details: "Imported customer_data_may.csv (2,340 rows)", timestamp: "1 hour ago", status: "success" },
  { id: "6", type: "report", action: "Report Generated", user: "John Doe", role: "Admin", details: "Monthly performance report exported", timestamp: "2 hours ago", status: "success" },
  { id: "7", type: "data", action: "Data Sync", user: "System", role: "System", details: "Inventory API sync failed - connection timeout", timestamp: "3 hours ago", status: "error" },
  { id: "8", type: "ai", action: "Strategy Approved", user: "Admin User", role: "Admin", details: "Approved Re-engagement Campaign for deployment", timestamp: "4 hours ago", status: "success" },
  { id: "9", type: "auth", action: "Login Failed", user: "Unknown", role: "N/A", details: "Failed login attempt from 10.0.0.55", timestamp: "5 hours ago", status: "warning" },
  { id: "10", type: "config", action: "User Created", user: "Admin User", role: "Admin", details: "Created new Marketing user: sarah@maiin.com", timestamp: "6 hours ago", status: "success" },
]

const typeConfig = {
  auth: { icon: User, label: "Authentication", color: "text-chart-2" },
  data: { icon: Database, label: "Data", color: "text-chart-1" },
  ai: { icon: Sparkles, label: "AI", color: "text-chart-4" },
  config: { icon: Settings, label: "Configuration", color: "text-chart-3" },
  report: { icon: TrendingUp, label: "Reports", color: "text-chart-5" },
}

const actionIcons: Record<string, typeof User> = {
  "Login": LogIn,
  "Login Failed": AlertCircle,
  "Logout": LogOut,
  "Data Sync": Database,
  "CSV Import": Upload,
  "Strategy Generated": Sparkles,
  "Strategy Approved": CheckCircle2,
  "Settings Updated": Edit,
  "User Created": User,
  "Report Generated": Download,
}

export function ActivityLogs() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<ActivityType | "all">("all")

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = 
      activity.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.details.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFilter = filterType === "all" || activity.type === filterType
    
    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">History</h1>
          <p className="text-muted-foreground">Task history and system activity monitoring</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/30"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterType === "all" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setFilterType("all")}
              >
                All
              </Button>
              {(Object.keys(typeConfig) as ActivityType[]).map((type) => {
                const config = typeConfig[type]
                return (
                  <Button
                    key={type}
                    variant={filterType === type ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setFilterType(type)}
                    className="gap-2"
                  >
                    <config.icon className={`h-4 w-4 ${config.color}`} />
                    {config.label}
                  </Button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Showing {filteredActivities.length} of {activities.length} activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredActivities.map((activity, idx) => {
              const typeConf = typeConfig[activity.type]
              const ActionIcon = actionIcons[activity.action] || typeConf.icon
              
              return (
                <div 
                  key={activity.id}
                  className="flex gap-4 p-4 rounded-xl border border-border bg-secondary/50 hover:bg-secondary/80 transition-colors"
                >
                  {/* Icon */}
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                    activity.status === "error" ? "bg-destructive/10" :
                    activity.status === "warning" ? "bg-chart-3/10" :
                    "bg-secondary"
                  }`}>
                    <ActionIcon className={`h-5 w-5 ${
                      activity.status === "error" ? "text-destructive" :
                      activity.status === "warning" ? "text-chart-3" :
                      typeConf.color
                    }`} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-medium">{activity.action}</h4>
                      <Badge variant="outline" className="text-xs">
                        {typeConf.label}
                      </Badge>
                      {activity.status !== "success" && (
                        <Badge 
                          variant={activity.status === "error" ? "destructive" : "secondary"}
                          className={activity.status === "warning" ? "bg-chart-3/10 text-chart-3 border-0" : ""}
                        >
                          {activity.status === "error" ? "Failed" : "Warning"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{activity.details}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {activity.user}
                      </span>
                      <span>({activity.role})</span>
                      <span>{activity.timestamp}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {filteredActivities.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activities found matching your search criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
