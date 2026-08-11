"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bell, CheckCheck, Download, Loader2, X } from "lucide-react"

import { getApiUrl } from "@/lib/api"
import { getAuthHeaders } from "@/lib/roles"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import type { PageId } from "./dashboard-sidebar"

export interface NotificationItem {
  id: string
  title: string
  message: string
  read: boolean
  createdAt: string
  relativeTime: string
  category: string
  targetPage: string | null
  downloadRecordId: number | null
  derived?: boolean
}

const CATEGORY_STYLES: Record<string, string> = {
  auth: "bg-slate-400",
  config: "bg-amber-400",
  data: "bg-sky-500",
  ai: "bg-violet-500",
  report: "bg-emerald-500",
  default: "bg-slate-400",
}

interface NotificationBellProps {
  onNavigate: (page: PageId) => void
}

const DISMISSED_KEY = "maiinsight-dismissed-notifications"

const getStoredDismissed = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]")
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === "string") : []
  } catch {
    return []
  }
}

export function NotificationBell({ onNavigate }: NotificationBellProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [dismissingId, setDismissingId] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    fileName: string
    contentType: string
    fileData: string
  } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dismissedRef = useRef<Set<string>>(new Set(getStoredDismissed()))

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl("/operations/notifications/unread-count"), {
        method: "GET",
        cache: "no-store",
        headers: getAuthHeaders(),
      })
      const result = await response.json().catch(() => null)
      if (response.ok && result?.success) {
        setUnreadCount(Number(result.data?.unreadCount || 0))
      }
    } catch {
      /* non-critical */
    }
  }, [])

  const dismissNotification = async (item: NotificationItem) => {
    dismissedRef.current.add(item.id)
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(dismissedRef.current)))
    setItems((current) => current.filter((entry) => entry.id !== item.id))
    if (!item.derived && !item.read) setUnreadCount((count) => Math.max(0, count - 1))

    if (!item.derived) {
      setDismissingId(item.id)
      try {
        const response = await fetch(getApiUrl(`/operations/notifications/${item.id}`), {
          method: "DELETE",
          headers: getAuthHeaders(),
        })
        const result = await response.json().catch(() => null)
        if (!response.ok) {
          toast({ title: result?.message || "Could not remove the notification." })
        }
      } catch {
        toast({ title: "Could not remove the notification." })
      } finally {
        setDismissingId(null)
      }
    }
  }

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl("/operations/notifications"), {
        method: "GET",
        cache: "no-store",
        headers: getAuthHeaders(),
      })
      const result = await response.json().catch(() => null)
      if (response.ok && result?.success) {
        setItems(
          (Array.isArray(result.data) ? result.data : []).filter(
            (item: NotificationItem) => !dismissedRef.current.has(item.id)
          )
        )
      }
    } catch {
      /* non-critical */
    }
  }, [])

  useEffect(() => {
    loadUnreadCount()
    pollRef.current = setInterval(loadUnreadCount, 60000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [loadUnreadCount])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([loadNotifications(), loadUnreadCount()]).finally(() => setLoading(false))
  }, [open, loadNotifications, loadUnreadCount])

  const markAllRead = async () => {
    try {
      await fetch(getApiUrl("/operations/notifications/read-all"), {
        method: "POST",
        headers: getAuthHeaders(),
      })
      setItems((current) => current.map((item) => ({ ...item, read: true })))
      setUnreadCount(0)
    } catch {
      toast({ title: "Could not mark notifications as read." })
    }
  }

  const openNotification = async (item: NotificationItem) => {
    if (!item.derived && !item.read) {
      fetch(getApiUrl(`/operations/notifications/${item.id}/read`), {
        method: "PATCH",
        headers: getAuthHeaders(),
      }).catch(() => null)
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry))
      )
      setUnreadCount((count) => Math.max(0, count - 1))
    }

    setOpen(false)

    if (item.targetPage) {
      onNavigate(item.targetPage as PageId)
    }
  }

  const viewFile = async (item: NotificationItem) => {
    if (!item.downloadRecordId) return
    setPreviewLoading(true)
    try {
      const response = await fetch(getApiUrl(`/operations/downloads/${item.downloadRecordId}`), {
        method: "GET",
        cache: "no-store",
        headers: getAuthHeaders(),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "The file could not be opened.")
      }
      setPreview({
        fileName: result.data.fileName,
        contentType: result.data.contentType,
        fileData: result.data.fileData,
      })
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "The file could not be opened." })
    } finally {
      setPreviewLoading(false)
    }
  }

  const isPdfPreview = (contentType?: string) =>
    String(contentType || "").toLowerCase().includes("pdf")

  const downloadPreview = () => {
    if (!preview) return
    const isPdf = isPdfPreview(preview.contentType)
    const blob = isPdf
      ? new Blob(
          [Uint8Array.from(atob(preview.fileData), (character) => character.charCodeAt(0))],
          { type: "application/pdf" }
        )
      : new Blob([preview.fileData], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = preview.fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={10} className="w-[380px] p-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold">Notifications</h3>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
              </p>
            </div>
            {items.some((item) => !item.read) && (
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={markAllRead}>
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
          </div>

          <ScrollArea className="h-[360px]">
            {loading ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2 px-6 text-center">
                <Bell className="h-6 w-6 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No notifications yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li key={item.id} className="group/item relative">
                    <button
                      type="button"
                      onClick={() => openNotification(item)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                        !item.read && "bg-primary/[0.04]"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          CATEGORY_STYLES[item.category] || CATEGORY_STYLES.default
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "truncate text-sm font-medium",
                              !item.read ? "text-foreground" : "text-muted-foreground"
                            )}
                          >
                            {item.title}
                          </span>
                          {!item.read && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          )}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                          {item.message}
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground/70">
                          {item.relativeTime}
                        </span>
                        {item.downloadRecordId && (
                          <span className="mt-2 inline-flex">
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation()
                                void viewFile(item)
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  void viewFile(item)
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
                            >
                              {previewLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Download className="h-3 w-3" />
                              )}
                              View file
                            </span>
                          </span>
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove notification: ${item.title}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        void dismissNotification(item)
                      }}
                      disabled={dismissingId === item.id}
                      className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground/50 opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus:opacity-100 group-hover/item:opacity-100"
                    >
                      {dismissingId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <Dialog open={preview !== null} onOpenChange={(value) => !value && setPreview(null)}>
        <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileIcon />
              {preview?.fileName}
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <>
              {isPdfPreview(preview.contentType) ? (
                <div className="flex-1 overflow-hidden rounded-md border bg-muted/40">
                  <iframe
                    src={`data:application/pdf;base64,${preview.fileData}`}
                    title={preview.fileName}
                    className="h-[60vh] w-full"
                  />
                </div>
              ) : (
                <ScrollArea className="flex-1 rounded-md border bg-muted/40 p-3">
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground">
                    {preview.fileData.length > 50000
                      ? `${preview.fileData.slice(0, 50000)}\n\n… (truncated preview)`
                      : preview.fileData}
                  </pre>
                </ScrollArea>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setPreview(null)}>
                  <X className="mr-1 h-3.5 w-3.5" />
                  Close
                </Button>
                <Button size="sm" onClick={downloadPreview}>
                  <Download className="mr-1 h-3.5 w-3.5" />
                  Download file
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function FileIcon() {
  return (
    <svg
      className="h-4 w-4 text-muted-foreground"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}
