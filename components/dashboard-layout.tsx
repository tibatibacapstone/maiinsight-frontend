"use client"

import { DashboardSidebar, type PageId } from "./dashboard-sidebar"
import { AnalyticsDashboard } from "./analytics-dashboard"
import { SegmentVisualization } from "./segment-visualization"
import { DataManagement } from "./data-management"
import { GenAIWorkspace } from "./genai-workspace"
import { PerformanceHub } from "./performance-hub"
import { ActivityLogs } from "./activity-logs"
import { Notifications } from "./notifications"
import { SystemSettings } from "./system-settings"

interface DashboardLayoutProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
  onLogout: () => void
  userRole: UserRole
}

export type UserRole = "admin" | "marketing" | "management" | "it_support"

const pagePermissions: Record<UserRole, PageId[]> = {
  admin: ["dashboard", "data", "history", "notifications"],
  marketing: ["dashboard", "segments", "performance", "genai", "notifications", "settings"],
  management: ["dashboard", "segments", "performance", "genai", "notifications", "settings"],
  it_support: ["dashboard", "data", "history", "notifications"],
}

export function DashboardLayout({ currentPage, onNavigate, onLogout, userRole }: DashboardLayoutProps) {
  const permittedPages = pagePermissions[userRole] ?? ["dashboard"]

  const renderPage = () => {
    if (!permittedPages.includes(currentPage)) {
      return (
        <div className="rounded-3xl border border-border/70 bg-card/80 p-10 text-center shadow-sm">
          <h2 className="text-2xl font-semibold">Access denied</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            You do not have access to this section for the current role.
          </p>
        </div>
      )
    }

    switch (currentPage) {
      case "dashboard":
        return <AnalyticsDashboard />
      case "segments":
        return <SegmentVisualization />
      case "data":
        return <DataManagement />
      case "genai":
        return <GenAIWorkspace />
      case "performance":
        return <PerformanceHub />
      case "history":
        return <ActivityLogs />
      case "notifications":
        return <Notifications />
      case "settings":
        return <SystemSettings />
      default:
        return <AnalyticsDashboard />
    }
  }

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        userRole={userRole}
      />
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8">
          {renderPage()}
        </div>
      </main>
    </div>
  )
}
