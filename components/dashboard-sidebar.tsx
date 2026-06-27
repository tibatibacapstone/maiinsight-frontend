"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { canAccessPage, getAuthHeaders, getRoleDisplayName, UserRole } from "@/lib/roles"
import { getApiUrl } from "@/lib/api"
import {
  BarChart3,
  LayoutDashboard,
  Users,
  Database,
  Sparkles,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  GitGraph,
  FileText,
  Target,
} from "lucide-react"

export type PageId =
  | "dashboard"
  | "segments"
  | "data"
  | "targeting"
  | "genai"
  | "instasight"
  | "history"
  | "notifications"
  | "settings"
  | "reports"

interface SidebarProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
  onLogout: () => void
  userRole?: UserRole
}

const navItems = [
  { id: "dashboard" as PageId, label: "Overview", icon: LayoutDashboard },
  { id: "reports" as PageId, label: "Management Reports", icon: FileText },
  { id: "segments" as PageId, label: "Segments", icon: Users },
  { id: "data" as PageId, label: "Data Center", icon: Database },
  { id: "targeting" as PageId, label: "Fill Empty Sessions", icon: Target },
  { id: "genai" as PageId, label: "GenAI Workspace", icon: Sparkles },
  { id: "instasight" as PageId, label: "InstaSight", icon: GitGraph },
  { id: "history" as PageId, label: "History", icon: History },
  { id: "notifications" as PageId, label: "Notifications", icon: Bell },
  { id: "settings" as PageId, label: "Settings", icon: Settings },
]

export function DashboardSidebar({
  currentPage,
  onNavigate,
  onLogout,
  userRole,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [notifications, setNotifications] = useState(0)

  const visibleNavItems = navItems.filter((item) =>
    userRole ? canAccessPage(userRole, item.id) : true
  )

  useEffect(() => {
    const loadUnreadCount = async () => {
      if (!userRole || !canAccessPage(userRole, "notifications")) {
        setNotifications(0)
        return
      }

      try {
        const response = await fetch(getApiUrl("/operations/notifications/unread-count"), {
          method: "GET",
          cache: "no-store",
          headers: getAuthHeaders(),
        })

        const result = await response.json().catch(() => null)
        if (!response.ok || !result?.success) {
          setNotifications(0)
          return
        }

        setNotifications(Number(result.data?.unreadCount || 0))
      } catch {
        setNotifications(0)
      }
    }

    void loadUnreadCount()
    window.addEventListener("focus", loadUnreadCount)
    return () => window.removeEventListener("focus", loadUnreadCount)
  }, [userRole])

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "sticky top-0 z-40 flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <div className="flex h-16 items-center border-b border-sidebar-border bg-gradient-to-r from-primary/5 to-transparent px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 min-w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
              <BarChart3 className="h-6 w-6 text-primary-foreground" />
            </div>

            {!collapsed && (
              <div className="overflow-hidden">
                <h1 className="truncate text-lg font-bold">MaiinSight</h1>
                <p className="truncate text-xs capitalize text-muted-foreground">
                  {userRole ? getRoleDisplayName(userRole) : "User"}
                </p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            const badgeCount = item.id === "notifications" ? notifications : 0

            const content = (
              <>
                <Icon className="h-5 w-5" />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {badgeCount > 0 ? (
                  <span
                    className={cn(
                      "flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground",
                      collapsed ? "absolute right-2 top-2" : "ml-auto"
                    )}
                  >
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                ) : null}
              </>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "relative h-11 w-full justify-center",
                        isActive &&
                          "rounded-l-none border-l-2 border-primary bg-primary/15 text-primary"
                      )}
                      onClick={() => onNavigate(item.id)}
                    >
                      {content}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              )
            }

            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "relative h-11 w-full justify-start gap-3",
                  isActive &&
                    "rounded-l-none border-l-2 border-primary bg-primary/15 font-semibold text-primary"
                )}
                onClick={() => onNavigate(item.id)}
              >
                {content}
              </Button>
            )
          })}
        </nav>

        <div className="space-y-2 border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            className={cn("h-11 w-full", collapsed ? "justify-center" : "justify-start gap-3")}
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

          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-11 w-full justify-center text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={onLogout}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Logout</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              className="h-11 w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onLogout}
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
