"use client"

import { useAuth } from "@/lib/auth-context"
import { getRoleDisplayName, UserRole } from "@/lib/roles"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { NotificationBell } from "./notification-bell"
import { ProfileMenu } from "./profile-menu"
import type { PageId } from "./dashboard-sidebar"

const PAGE_TITLES: Record<PageId, string> = {
  dashboard: "Overview",
  reports: "Management Reports",
  segments: "Segments",
  data: "Data Center",
  targeting: "Fill Sessions",
  genai: "GenAI Workspace",
  instasight: "InstaSight",
  history: "History",
  settings: "Settings",
}

const getInitials = (name: string, role: UserRole): string => {
  if (name.trim()) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("")
  }
  const roleName = getRoleDisplayName(role)
  return roleName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
}

interface DashboardHeaderProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
  onLogout: () => void
  userRole: UserRole
}

export function DashboardHeader({
  currentPage,
  onNavigate,
  onLogout,
  userRole,
}: DashboardHeaderProps) {
  const { user } = useAuth()
  const displayName = user?.name || ""
  const initials = getInitials(displayName, userRole)
  const hasAvatar = Boolean(user?.avatar)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-5 backdrop-blur-sm sm:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold tracking-tight">
          {PAGE_TITLES[currentPage] || "MaiinSight"}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <NotificationBell onNavigate={onNavigate} />

        <div className="h-6 w-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-10 gap-2 rounded-full px-2 hover:bg-muted sm:pr-3"
            >
              <Avatar className="h-8 w-8 border border-border">
                {hasAvatar && <AvatarImage src={user?.avatar || ""} alt={displayName} />}
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[160px] flex-col items-start leading-tight sm:flex">
                <span className="truncate text-sm font-medium">
                  {displayName || getRoleDisplayName(userRole)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {getRoleDisplayName(userRole)}
                </span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <ProfileMenu userRole={userRole} onLogout={onLogout} />
        </DropdownMenu>
      </div>
    </header>
  )
}
