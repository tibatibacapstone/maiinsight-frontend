import { Bell } from "lucide-react"

export function Notifications() {
  const notifications = [
    {
      id: 1,
      title: "Campaign ready for review",
      description: "A new marketing campaign has been queued for approval.",
      time: "2 hours ago",
    },
    {
      id: 2,
      title: "System maintenance alert",
      description: "IT support will review scheduled maintenance for the data center.",
      time: "Yesterday",
    },
    {
      id: 3,
      title: "Weekly performance summary",
      description: "Your latest performance insights report is available.",
      time: "3 days ago",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Notifications</p>
          <h1 className="text-3xl font-semibold">Activity & alerts</h1>
        </div>
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-primary/10 text-primary">
          <Bell className="h-5 w-5" />
        </div>
      </div>

      <div className="grid gap-4">
        {notifications.map((notification) => (
          <div key={notification.id} className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{notification.title}</h2>
                <p className="text-sm text-muted-foreground">{notification.description}</p>
              </div>
              <span className="text-xs text-muted-foreground">{notification.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
