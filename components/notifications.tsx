"use client"

import { useEffect, useState } from "react"
import { Bell, CheckCheck, Loader2 } from "lucide-react"

import { BusinessErrorAlert } from "@/components/business-error-alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getApiUrl } from "@/lib/api"
import { getAuthHeaders } from "@/lib/roles"

interface NotificationItem {
  id: string
  title: string
  message: string
  read: boolean
  createdAt: string
  relativeTime: string
  category: string
  derived?: boolean
}

export function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(getApiUrl("/operations/notifications"), {
        method: "GET",
        cache: "no-store",
        headers: getAuthHeaders(),
      })

      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.success || !Array.isArray(result.data)) {
        throw new Error(result?.message || "Notifications could not be loaded.")
      }

      setNotifications(result.data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Notifications could not be loaded.")
      setNotifications([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadNotifications()
  }, [])

  const handleMarkRead = async (notification: NotificationItem) => {
    if (notification.read || notification.derived) return

    try {
      const response = await fetch(
        getApiUrl(`/operations/notifications/${notification.id}/read`),
        {
          method: "PATCH",
          headers: getAuthHeaders(),
        }
      )

      if (!response.ok) {
        throw new Error("Notification could not be updated.")
      }

      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item
        )
      )
    } catch {
      setError("Notification status could not be updated.")
    }
  }

  const handleMarkAllRead = async () => {
    try {
      setIsMarkingAll(true)
      const response = await fetch(getApiUrl("/operations/notifications/read-all"), {
        method: "POST",
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error("Notifications could not be updated.")
      }

      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
    } catch {
      setError("Notifications could not be updated.")
    } finally {
      setIsMarkingAll(false)
    }
  }

  const unreadCount = notifications.filter((item) => !item.read).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Notifications</p>
          <h1 className="text-3xl font-semibold">System updates and alerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track imports, machine learning runs, InstaSight sync updates, and other important activity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline">{unreadCount} unread</Badge>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleMarkAllRead}
            disabled={isMarkingAll || unreadCount === 0}
          >
            {isMarkingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            Mark all as read
          </Button>
        </div>
      </div>

      {error ? (
        <BusinessErrorAlert
          title="Notifications Unavailable"
          message="Notifications could not be loaded."
          suggestion="Please try again or contact IT Support if the issue continues."
          technicalDetails={error}
        />
      ) : null}

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Recent notifications
          </CardTitle>
          <CardDescription>Business-friendly updates from the latest MaiinSight activity.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-secondary/20 p-8 text-center">
              <Bell className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">No notifications yet.</p>
                <p className="text-sm text-muted-foreground">
                  System updates and important activity will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void handleMarkRead(notification)}
                  className={`rounded-2xl border p-5 text-left transition-colors ${
                    notification.read
                      ? "border-border/60 bg-card"
                      : "border-primary/20 bg-primary/5"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold">{notification.title}</h2>
                        {!notification.read ? <Badge>New</Badge> : null}
                        {notification.derived ? <Badge variant="outline">Live</Badge> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{notification.relativeTime}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
