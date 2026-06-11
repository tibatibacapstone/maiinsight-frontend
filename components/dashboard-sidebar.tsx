"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { UserRole } from "@/lib/roles"

import {
  BarChart3,
  LayoutDashboard,
  Users,
  Database,
  Sparkles,
  TrendingUp,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  GitGraph,
  FileText
} from "lucide-react"

export type PageId =
  | "dashboard"
  | "segments"
  | "data"
  | "genai"
  | "performance"
  | "history"
  | "notifications"
  | "settings"
  | "reports"

interface SidebarProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
  onLogout: () => void

  // Optional karena sekarang role bisa saja belum ada
  userRole?: UserRole
}

const navItems = [
  {
    id: "dashboard" as PageId,
    label: "Overview",
    icon: LayoutDashboard
  },
  {
    id: "segments" as PageId,
    label: "Segments",
    icon: Users
  },
  {
    id: "data" as PageId,
    label: "Data Center",
    icon: Database
  },
  {
    id: "genai" as PageId,
    label: "GenAI Workspace",
    icon: Sparkles
  },
  {
    id: "performance" as PageId,
    label: "InstaSight",
    icon: GitGraph
  },
  {
    id: "history" as PageId,
    label: "History",
    icon: History
  },
  {
    id: "notifications" as PageId,
    label: "Notifications",
    icon: Bell
  },
  {
    id: "settings" as PageId,
    label: "Settings",
    icon: Settings
  },
  {
    id: "reports" as PageId,
    label: "Management Reports",
    icon: FileText,
  },
]

const allowedPagesByRole: Record<UserRole, PageId[]> = {
  admin: ["dashboard", "data", "history", "notifications", "settings"],
  marketing: ["dashboard", "segments", "performance", "genai", "notifications"],
  management: ["dashboard", "segments", "performance", "genai", "notifications", "reports"],
  it_support: ["dashboard", "data", "history", "notifications"],
}

export function DashboardSidebar({
  currentPage,
  onNavigate,
  onLogout,
  userRole
}: SidebarProps) {

  const visibleNavItems = navItems.filter((item) => {
    if (!userRole) return true
    return allowedPagesByRole[userRole]?.includes(item.id)
  })

  const [collapsed, setCollapsed] = useState(false)
  const [notifications] = useState(3)

  return (
    <TooltipProvider delayDuration={0}>

      <aside
        className={cn(
          "sticky top-0 z-40 h-screen shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
          collapsed ? "w-20" : "w-64"
        )}
      >

        {/* Logo Header */}
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border bg-gradient-to-r from-primary/5 to-transparent">

          <div className="flex items-center gap-3 overflow-hidden">

            <div className="h-10 w-10 min-w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <BarChart3 className="h-6 w-6 text-primary-foreground" />
            </div>

            {!collapsed && (
              <div className="overflow-hidden">

                <h1 className="font-bold text-lg truncate">
                  MaiinSight
                </h1>

                {/* FIXED USER ROLE */}
                <p className="text-xs text-muted-foreground truncate capitalize">
                  {userRole?.replace("_", " ") || "User"}
                </p>

              </div>
            )}

          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">

          {navItems.map((item) => {

            const Icon = item.icon
            const isActive = currentPage === item.id

            return collapsed ? (

              <Tooltip key={item.id}>

                <TooltipTrigger asChild>

                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-center h-11",
                      isActive &&
                        "bg-primary/15 text-primary border-l-2 border-primary rounded-l-none"
                    )}
                    onClick={() => onNavigate(item.id)}
                  >
                    <Icon className="h-5 w-5" />
                  </Button>

                </TooltipTrigger>

                <TooltipContent side="right">
                  {item.label}
                </TooltipContent>

              </Tooltip>

            ) : (

              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start h-11 gap-3",
                  isActive &&
                    "bg-primary/15 text-primary border-l-2 border-primary rounded-l-none font-semibold"
                )}
                onClick={() => onNavigate(item.id)}
              >

                <Icon className="h-5 w-5" />

                <span className="truncate">
                  {item.label}
                </span>

              </Button>

            )
          })}

        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-sidebar-border space-y-2">

          {/* Notifications */}
          {collapsed ? (

            <Tooltip>

              <TooltipTrigger asChild>

                <Button
                  variant="ghost"
                  className="w-full justify-center h-11 relative"
                  onClick={() => onNavigate("notifications")}
                >

                  <Bell className="h-5 w-5" />

                  {notifications > 0 && (
                    <span className="absolute top-2 right-3 h-4 w-4 rounded-full bg-destructive text-[10px] flex items-center justify-center text-destructive-foreground">
                      {notifications}
                    </span>
                  )}

                </Button>

              </TooltipTrigger>

              <TooltipContent side="right">
                Notifications
              </TooltipContent>

            </Tooltip>

          ) : (

            <Button
              variant="ghost"
              className="w-full justify-start h-11 gap-3 relative"
              onClick={() => onNavigate("notifications")}
            >

              <Bell className="h-5 w-5" />

              <span>
                Notifications
              </span>

              {notifications > 0 && (
                <span className="ml-auto h-5 w-5 rounded-full bg-destructive text-[10px] flex items-center justify-center text-destructive-foreground">
                  {notifications}
                </span>
              )}

            </Button>

          )}

          {/* Collapse Toggle */}
          <Button
            variant="ghost"
            className={cn(
              "w-full h-11",
              collapsed
                ? "justify-center"
                : "justify-start gap-3"
            )}
            onClick={() => setCollapsed(!collapsed)}
          >

            {collapsed ? (

              <ChevronRight className="h-5 w-5" />

            ) : (

              <>
                <ChevronLeft className="h-5 w-5" />
                <span>Collapse</span>
              </>

            )}

          </Button>

          {/* Logout */}
          {collapsed ? (

            <Tooltip>

              <TooltipTrigger asChild>

                <Button
                  variant="ghost"
                  className="w-full justify-center h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={onLogout}
                >

                  <LogOut className="h-5 w-5" />

                </Button>

              </TooltipTrigger>

              <TooltipContent side="right">
                Logout
              </TooltipContent>

            </Tooltip>

          ) : (

            <Button
              variant="ghost"
              className="w-full justify-start h-11 gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onLogout}
            >

              <LogOut className="h-5 w-5" />

              <span>
                Logout
              </span>

            </Button>

          )}

        </div>
      </aside>
    </TooltipProvider>
  )
}