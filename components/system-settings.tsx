"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Key, 
  Users, 
  Shield, 
  Bell,
  Database,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  AlertCircle,
  Info,
  Save
} from "lucide-react"

interface APIToken {
  id: string
  name: string
  key: string
  status: "active" | "inactive" | "expired"
  lastUsed: string
  createdAt: string
}

interface UserAccount {
  id: string
  name: string
  email: string
  role: "operational" | "management" | "it_support"
  status: "active" | "inactive"
  lastLogin: string
}

const apiTokens: APIToken[] = [
  { id: "1", name: "Gemini System API", key: "pos_api_key_xxxx", status: "active", lastUsed: "2 min ago", createdAt: "Jan 15, 2024" },
  { id: "2", name: "Meta Graph API", key: "crm_api_key_yyyy", status: "active", lastUsed: "5 min ago", createdAt: "Feb 3, 2024" },
]

const userAccounts: UserAccount[] = [
  { id: "1", name: "Arrief Hardian", email: "arrief.Hardian@triaysa.co.id", role: "operational", status: "active", lastLogin: "2 hours ago" },
  { id: "2", name: "Nizar Muharram", email: "nizar.muharram@triyasa.co.id", role: "operational", status: "active", lastLogin: "5 min ago" },
  { id: "3", name: "Sabri Kurniadi", email: "sabri.kurniadi@triyasa.co.id", role: "it_support", status: "active", lastLogin: "1 day ago" },
  { id: "4", name: "Iqbal Utomo", email: "iqbal.utomo@triyasa.co.id", role: "management", status: "inactive", lastLogin: "2 weeks ago" },
]

const roleConfig = {
  operational: { color: "text-chart-5", bg: "bg-chart-5/10", label: "operational" },
  management: { color: "text-chart-1", bg: "bg-chart-1/10", label: "management" },
  it_support: { color: "text-chart-2", bg: "bg-chart-2/10", label: "IT Support" },
}

export function SystemSettings() {
  const [tokens, setTokens] = useState(apiTokens)
  const [users, setUsers] = useState(userAccounts)
  const [showKey, setShowKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [notifications, setNotifications] = useState({
    aiAlerts: true,
    syncAlerts: true,
    securityAlerts: true,
    weeklyReports: true,
    performanceAlerts: false,
  })

  const copyToClipboard = (key: string, tokenId: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(tokenId)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const toggleTokenStatus = (tokenId: string) => {
    setTokens(prev => prev.map(token => 
      token.id === tokenId 
        ? { ...token, status: token.status === "active" ? "inactive" as const : "active" as const }
        : token
    ))
  }

  const toggleUserStatus = (userId: string) => {
    setUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === "active" ? "inactive" as const : "active" as const }
        : user
    ))
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">System Configuration</h1>
          <p className="text-muted-foreground">Manage API tokens, users, and system settings</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* API Tokens */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    API Tokens
                  </CardTitle>
                  <CardDescription>Manage integration API keys</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Token
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New API Token</DialogTitle>
                      <DialogDescription>
                        Generate a new API token for integration
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="token-name">Token Name</Label>
                        <Input id="token-name" placeholder="e.g., Analytics API" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="token-desc">Description</Label>
                        <Input id="token-desc" placeholder="What this token is used for" />
                      </div>
                      <Button className="w-full">Generate Token</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {tokens.map((token) => (
                <div 
                  key={token.id}
                  className="flex items-center gap-4 p-3 rounded-xl border border-border bg-secondary/50">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    token.status === "active" ? "bg-primary/10" : 
                    token.status === "expired" ? "bg-destructive/10" : "bg-muted"
                  }`}>
                    <Key className={`h-5 w-5 ${
                      token.status === "active" ? "text-primary" : 
                      token.status === "expired" ? "text-destructive" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{token.name}</h4>
                      <Badge 
                        variant={token.status === "active" ? "default" : token.status === "expired" ? "destructive" : "secondary"}
                        className={token.status === "active" ? "bg-primary/10 text-primary border-0" : ""}
                      >
                        {token.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <code className="bg-secondary px-2 py-0.5 rounded">
                        {showKey === token.id ? token.key : "••••••••••••"}
                      </code>
                      <button
                        onClick={() => setShowKey(showKey === token.id ? null : token.id)}
                        className="hover:text-foreground"
                      >
                        {showKey === token.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(token.key, token.id)}
                        className="hover:text-foreground"
                      >
                        {copiedKey === token.id ? (
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={token.status === "active"}
                      onCheckedChange={() => toggleTokenStatus(token.id)}
                      disabled={token.status === "expired"}
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete Token</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* User Management */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Accounts
                  </CardTitle>
                  <CardDescription>Manage user access and roles</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Add a new user to the system
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="user-name">Full Name</Label>
                        <Input id="user-name" placeholder="John Doe" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="user-email">Email</Label>
                        <Input id="user-email" type="email" placeholder="john@maiin.com" />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <div className="flex gap-2">
                          {Object.entries(roleConfig).map(([role, config]) => (
                            <Button key={role} variant="outline" size="sm" className="flex-1">
                              {config.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <Button className="w-full">Create User</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {users.map((user) => {
                const roleConf = roleConfig[user.role]
                return (
                  <div 
                    key={user.id}
                    className="flex items-center gap-4 p-3 rounded-xl border border-border bg-secondary/50"
                  >
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${roleConf.bg}`}>
                      <span className={`text-sm font-semibold ${roleConf.color}`}>
                        {user.name.split(" ").map(n => n[0]).join("")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{user.name}</h4>
                        <Badge className={`${roleConf.bg} ${roleConf.color} border-0`}>
                          {roleConf.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={user.status === "active" ? "default" : "secondary"} className="text-xs">
                        {user.status}
                      </Badge>
                      <Switch
                        checked={user.status === "active"}
                        onCheckedChange={() => toggleUserStatus(user.id)}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit User</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Notification Settings */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Settings
            </CardTitle>
            <CardDescription>Configure system alerts and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { key: "aiAlerts", label: "AI Draft Alerts", description: "Get notified when new AI strategies are ready" },
                { key: "syncAlerts", label: "Sync Alerts", description: "Notifications for data sync completion" },
                { key: "securityAlerts", label: "Security Alerts", description: "Critical security and access notifications" },
                { key: "weeklyReports", label: "Weekly Reports", description: "Receive weekly performance summaries" },
                { key: "performanceAlerts", label: "Performance Alerts", description: "Alerts for KPI threshold breaches" },
              ].map((setting) => (
                <div 
                  key={setting.key}
                  className="flex items-start justify-between p-4 rounded-lg border border-border/50 bg-secondary/20"
                >
                  <div className="space-y-1">
                    <Label htmlFor={setting.key} className="font-medium">{setting.label}</Label>
                    <p className="text-xs text-muted-foreground">{setting.description}</p>
                  </div>
                  <Switch
                    id={setting.key}
                    checked={notifications[setting.key as keyof typeof notifications]}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, [setting.key]: checked }))}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Information
            </CardTitle>
            <CardDescription>Current system status and configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "System Version", value: "v2.4.1", status: "current" },
                { label: "Database Status", value: "Connected", status: "success" },
                { label: "API Uptime", value: "99.9%", status: "success" },
                { label: "Last Backup", value: "2 hours ago", status: "current" },
              ].map((info) => (
                <div key={info.label} className="p-4 rounded-lg border border-border/50 bg-secondary/20">
                  <p className="text-sm text-muted-foreground mb-1">{info.label}</p>
                  <div className="flex items-center gap-2">
                    {info.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Info className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{info.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
