"use client"

import { DashboardSidebar, type PageId } from "./dashboard-sidebar"
import { AnalyticsDashboard } from "./analytics-dashboard"
import { SegmentVisualization } from "./segment-visualization"
import { DataManagement } from "./data-management"
import { GenAIWorkspace } from "./genai-workspace"
import { PerformanceHub } from "./performance-hub"
import { ActivityLogs } from "./activity-logs"
import { SystemSettings } from "./system-settings"

interface DashboardLayoutProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
  onLogout: () => void
  userRole: string
}

export function DashboardLayout({ currentPage, onNavigate, onLogout, userRole }: DashboardLayoutProps) {
  const renderPage = () => {
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
