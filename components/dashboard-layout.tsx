"use client"

import { useState } from "react"

import { DashboardSidebar, type PageId } from "./dashboard-sidebar"
import { AnalyticsDashboard } from "./analytics-dashboard"
import { SegmentVisualization } from "./segment-visualization"
import { DataManagement } from "./data-management"
import { GenAIWorkspace } from "./genai-workspace"
import { InstaSightHub } from "./instasight-hub"
import { ActivityLogs } from "./activity-logs"
import { Notifications } from "./notifications"
import { SystemSettings } from "./system-settings"
import { ManagementReport } from "./management-report"
import { AccessDenied } from "./access-denied"
import { MetaAudience } from "./meta.audiance"
import { PAGE_PERMISSIONS, UserRole } from "@/lib/roles"

interface DashboardLayoutProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
  onLogout: () => void
  userRole: UserRole
}

export function DashboardLayout({
  currentPage,
  onNavigate,
  onLogout,
  userRole,
}: DashboardLayoutProps) {
  const permittedPages = PAGE_PERMISSIONS[userRole] ?? ["dashboard"]

  const [performanceView, setPerformanceView] = useState<
    "performance" | "audience"
  >("performance")

  const renderPage = () => {
    if (!permittedPages.includes(currentPage)) {
      return (
        <AccessDenied
          title="Access Denied"
          message="You do not have permission to access this section."
          feature={currentPage}
          requiredRole="Check with IT Support"
          onGoBack={() => onNavigate("dashboard")}
          showButton={true}
        />
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

      case "instasight":
        return performanceView === "audience" ? (
          <MetaAudience onBack={() => setPerformanceView("performance")} />
        ) : (
          <InstaSightHub
            onViewAudience={() => setPerformanceView("audience")}
          />
        )

      case "reports":
        return <ManagementReport />

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
        <div className="p-6 lg:p-8">{renderPage()}</div>
      </main>
    </div>
  )
}
