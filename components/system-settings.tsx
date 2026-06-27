"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Info,
  Key,
  Loader2,
  Plus,
  Save,
  Shield,
  Users,
} from "lucide-react"

import { AccessDenied } from "@/components/access-denied"
import { BusinessErrorAlert } from "@/components/business-error-alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getApiUrl } from "@/lib/api"
import { canAccessFeature, getAuthHeaders, getStoredRole, USER_ROLES } from "@/lib/roles"

interface SystemSummaryResponse {
  success: boolean
  message?: string
  data?: {
    currentUser: {
      userId: number
      email: string
      role: string
    }
    api: {
      connected: boolean
      baseUrl: string
    }
    integrations: {
      metaConfigured: boolean
      aiConfigured: boolean
      aiProvider: string
      aiProviderLabel: string
      aiModel: string | null
    }
    latestImport: {
      fileName: string
      updatedAt: string
      status: string
      rowCount: number
    } | null
    latestMlRun: {
      createdAt: string
      status: string
      totalSessions: number
    } | null
    latestSegmentationRun: {
      runDate: string
      status: string
      totalCustomers: number
    } | null
    latestMetaSync: {
      startedAt: string
      status: string
      message: string
    } | null
    tokenManagementMode: string
    users: UserRow[]
  }
}

interface UserRow {
  id: number
  name: string
  email: string
  role: "operational" | "management" | "it_support"
  createdAt: string
  updatedAt: string
}

export function SystemSettings() {
  const userRole = getStoredRole()
  const canViewSettings = canAccessFeature(userRole, "viewSettings")
  const canModifySettings = canAccessFeature(userRole, "modifySettings")
  const canManageUsers = canAccessFeature(userRole, "manageUsers")

  const [summary, setSummary] = useState<SystemSummaryResponse["data"] | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showGeneratedToken, setShowGeneratedToken] = useState(false)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [generatedTokenLabel, setGeneratedTokenLabel] = useState("MaiinSight Service Token")
  const [isGeneratingToken, setIsGeneratingToken] = useState(false)
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [isSavingUser, setIsSavingUser] = useState(false)
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    password: "",
    role: "operational",
  })

  const readOnlyNotice = useMemo(
    () => (userRole === USER_ROLES.OPERATIONAL ? "Settings are managed by IT Support." : null),
    [userRole]
  )

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(getApiUrl("/system/summary"), {
        method: "GET",
        cache: "no-store",
        headers: getAuthHeaders(),
      })

      const result: SystemSummaryResponse | null = await response.json().catch(() => null)
      if (!response.ok || !result?.success || !result.data) {
        throw new Error(result?.message || "Settings could not be loaded.")
      }

      setSummary(result.data)
      setUsers(result.data.users)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Settings could not be loaded.")
      setSummary(null)
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!canViewSettings) return
    void loadSettings()
  }, [canViewSettings])

  if (!canViewSettings) {
    return (
      <AccessDenied
        title="Access Denied"
        message="Settings are available to IT Support and read-only Marketing Operational users only."
        feature="settings"
        requiredRole="IT Support"
      />
    )
  }

  const handleCreateUser = async () => {
    try {
      setIsSavingUser(true)
      const response = await fetch(getApiUrl("/system/users"), {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      })

      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "User account could not be created.")
      }

      setFormState({ name: "", email: "", password: "", role: "operational" })
      setIsUserDialogOpen(false)
      await loadSettings()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "User account could not be created.")
    } finally {
      setIsSavingUser(false)
    }
  }

  const handleGenerateToken = async () => {
    try {
      setIsGeneratingToken(true)
      const response = await fetch(getApiUrl("/system/service-token"), {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ label: generatedTokenLabel }),
      })

      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.success || !result.data?.token) {
        throw new Error(result?.message || "Service token could not be generated.")
      }

      setGeneratedToken(result.data.token)
      setShowGeneratedToken(true)
    } catch (tokenError) {
      setError(tokenError instanceof Error ? tokenError.message : "Service token could not be generated.")
    } finally {
      setIsGeneratingToken(false)
    }
  }

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      setError("The generated token could not be copied automatically.")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">System Configuration</h1>
        <p className="text-muted-foreground">Manage system access, integration readiness, and operational setup.</p>
      </div>

      {readOnlyNotice ? (
        <BusinessErrorAlert
          title="Read-Only Access"
          message={readOnlyNotice}
          suggestion="Contact IT Support if you need a configuration change."
          variant="info"
        />
      ) : null}

      {error ? (
        <BusinessErrorAlert
          title="Action Failed"
          message="The request could not be completed."
          suggestion="Please try again or contact IT Support if the issue continues."
          technicalDetails={error}
          showTechnicalDetails={userRole === USER_ROLES.IT_SUPPORT}
        />
      ) : null}

      {isLoading ? (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading system settings...
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> System Status</CardTitle>
                <CardDescription>Current environment and integration readiness.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-secondary/20 p-4">
                  <p className="text-sm text-muted-foreground">API Connection</p>
                  <div className="mt-2 flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {summary?.api.connected ? "Connected" : "Unavailable"}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-secondary/20 p-4">
                  <p className="text-sm text-muted-foreground">Meta API</p>
                  <div className="mt-2 flex items-center gap-2 font-medium">
                    <CheckCircle2 className={`h-4 w-4 ${summary?.integrations.metaConfigured ? "text-primary" : "text-muted-foreground"}`} />
                    {summary?.integrations.metaConfigured ? "Configured" : "Not connected"}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-secondary/20 p-4">
                  <p className="text-sm text-muted-foreground">AI Provider</p>
                  <div className="mt-2 flex items-center gap-2 font-medium">
                    <CheckCircle2 className={`h-4 w-4 ${summary?.integrations.aiConfigured ? "text-primary" : "text-muted-foreground"}`} />
                    {summary?.integrations.aiConfigured
                      ? `${summary?.integrations.aiProviderLabel} configured`
                      : "Not configured"}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {summary?.integrations.aiConfigured
                      ? `Provider: ${summary.integrations.aiProviderLabel}${summary.integrations.aiModel ? ` (${summary.integrations.aiModel})` : ""}`
                      : "Configure Gemini for demo usage or set AI_PROVIDER=azure if Azure OpenAI is available."}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/20 p-4">
                  <p className="text-sm text-muted-foreground">Current User</p>
                  <p className="mt-2 font-medium">{summary?.currentUser.email}</p>
                  <p className="text-xs text-muted-foreground">{summary?.currentUser.role}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5" /> Latest System Activity</CardTitle>
                <CardDescription>Recent operational checkpoints used across Overview, Data Center, and InstaSight.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="rounded-lg border border-border bg-secondary/20 p-4">
                  <p className="font-medium">Latest import</p>
                  <p className="text-muted-foreground">{summary?.latestImport ? `${summary.latestImport.fileName} • ${summary.latestImport.status}` : "No import has been uploaded yet."}</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/20 p-4">
                  <p className="font-medium">Latest ML run</p>
                  <p className="text-muted-foreground">{summary?.latestMlRun ? `${summary.latestMlRun.status} • ${new Date(summary.latestMlRun.createdAt).toLocaleString()}` : "Machine learning has not been run yet."}</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/20 p-4">
                  <p className="font-medium">Latest segmentation update</p>
                  <p className="text-muted-foreground">{summary?.latestSegmentationRun ? `${summary.latestSegmentationRun.totalCustomers} customers • ${new Date(summary.latestSegmentationRun.runDate).toLocaleString()}` : "Segmentation has not been generated yet."}</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/20 p-4">
                  <p className="font-medium">Latest InstaSight sync</p>
                  <p className="text-muted-foreground">{summary?.latestMetaSync ? `${summary.latestMetaSync.status} • ${new Date(summary.latestMetaSync.startedAt).toLocaleString()}` : "InstaSight has not been synced yet."}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> Service Token</CardTitle>
                    <CardDescription>One-time generated service token for IT Support operations.</CardDescription>
                  </div>
                  {!canModifySettings ? <Badge variant="outline">Read only</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="service-token-label">Token label</Label>
                  <Input
                    id="service-token-label"
                    value={generatedTokenLabel}
                    onChange={(event) => setGeneratedTokenLabel(event.target.value)}
                    disabled={!canModifySettings}
                  />
                </div>
                <Button className="gap-2" onClick={() => void handleGenerateToken()} disabled={!canModifySettings || isGeneratingToken}>
                  {isGeneratingToken ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Generate Token
                </Button>
                <div className="rounded-lg border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                  Stored API token management is not configured in the database yet. MaiinSight currently supports one-time service token generation for IT Support.
                </div>
                {generatedToken ? (
                  <div className="space-y-2 rounded-lg border border-border bg-secondary/20 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">Generated token</p>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setShowGeneratedToken((value) => !value)}>
                          {showGeneratedToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => void copyToClipboard(generatedToken)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <code className="block overflow-x-auto rounded bg-background p-3 text-xs">
                      {showGeneratedToken ? generatedToken : "••••••••••••••••••••••••••••••••"}
                    </code>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> User Accounts</CardTitle>
                    <CardDescription>Current MaiinSight users and role assignments.</CardDescription>
                  </div>
                  <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2" disabled={!canManageUsers}>
                        <Plus className="h-4 w-4" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create user account</DialogTitle>
                        <DialogDescription>Add a new MaiinSight user account.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="user-name">Full name</Label>
                          <Input id="user-name" value={formState.name} onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="user-email">Email</Label>
                          <Input id="user-email" type="email" value={formState.email} onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="user-password">Password</Label>
                          <Input id="user-password" type="password" value={formState.password} onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="user-role">Role</Label>
                          <select id="user-role" value={formState.role} onChange={(event) => setFormState((prev) => ({ ...prev, role: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                            <option value="operational">Marketing Operational</option>
                            <option value="management">Management</option>
                            <option value="it_support">IT Support</option>
                          </select>
                        </div>
                        <Button className="w-full gap-2" onClick={() => void handleCreateUser()} disabled={isSavingUser}>
                          {isSavingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Create User
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="rounded-xl border border-border bg-secondary/20 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{user.role === "operational" ? "Marketing Operational" : user.role === "management" ? "Management" : "IT Support"}</Badge>
                        <Badge variant="secondary">Updated {new Date(user.updatedAt).toLocaleDateString()}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

