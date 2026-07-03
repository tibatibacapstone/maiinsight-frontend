"use client"

import { useState } from "react"

import { DashboardSidebar, type PageId } from "./dashboard-sidebar"
import { AnalyticsDashboard } from "./analytics-dashboard"
import { SegmentVisualization } from "./segment-visualization"
import { DataManagement } from "./data-management"
import { LowOccupancyTargeting } from "./low-occupancy-targeting"
import { GenAIWorkspace } from "./genai-workspace"
import { InstaSightHub } from "./instasight-hub"
import { ActivityLogs } from "./activity-logs"
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

  const [performanceView, setPerformanceView] = useState<"performance" | "audience">("performance")

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
      case "targeting":
        return <LowOccupancyTargeting onNavigate={onNavigate} />
      case "genai":
        return <GenAIWorkspace />
      case "instasight":
        return performanceView === "audience" ? (
          <MetaAudience onBack={() => setPerformanceView("performance")} />
        ) : (
          <InstaSightHub onViewAudience={() => setPerformanceView("audience")} />
        )
      case "reports":
        return <ManagementReport />
      case "history":
        return <ActivityLogs />
      case "settings":
        return <SystemSettings />
      default:
        return <AnalyticsDashboard />
    }
  }

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top,#ffffff_0%,#f4f7f6_46%,#eef2f1_100%)]">
      <DashboardSidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        userRole={userRole}
      />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-[1400px] px-0.5 py-3 sm:py-4 md:py-5 lg:py-6">{renderPage()}</div>
      </main>
    </div>
  )
}
