"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Copy, Eye, EyeOff, Key, Link as LinkIcon, Loader2, Save, Shield, Users, Check, CircleDashed } from "lucide-react"

import { AccessDenied } from "@/components/access-denied"
import { BusinessErrorAlert } from "@/components/business-error-alert"
import { PageSkeleton } from "@/components/page-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getApiUrl } from "@/lib/api"
import { getAuthHeaders, getStoredRole, USER_ROLES } from "@/lib/roles"

type Role = "operational" | "management" | "it_support"

type UserRow = { id: number; name: string; email: string; role: Role; updatedAt: string }

interface SummaryResponse {
  success: boolean
  message?: string
  data?: {
    currentUser: { userId: number; email: string; role: string }
    database: { name: string; status: string; subtitle: string } | null
    latestMlRun: { id: number; status: string; createdAt: string; totalSessions: number; lastRunningAt?: string | null; lastRunningLabel?: string | null } | null
    latestSegmentationRun: { id: number; status: string; runDate: string; totalCustomers: number } | null
    latestImport: { id: number; fileName: string; status: string; updatedAt: string; rowCount: number } | null
    integrations: {
      metaConfigured: boolean
      aiConfigured: boolean
      aiProvider: string
      aiProviderLabel: string
      aiModel: string | null
      geminiApiKey: string
      geminiModel: string
      metaIgUserId: string
      metaAccessToken: string
      metaGraphVersion: string
    }
    users: UserRow[]
  }
}

export function SystemSettings() {
  const userRole = getStoredRole()
  const isItSupport = userRole === USER_ROLES.IT_SUPPORT

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<SummaryResponse["data"] | null>(null)
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [showMetaToken, setShowMetaToken] = useState(false)
  const [integrationForm, setIntegrationForm] = useState({
    geminiApiKey: "",
    geminiModel: "",
    metaIgUserId: "",
    metaAccessToken: "",
    metaGraphVersion: "",
  })
  const [isSavingIntegrations, setIsSavingIntegrations] = useState(false)
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "operational" as Role })
  const [isCreatingInvite, setIsCreatingInvite] = useState(false)
  const [activationUrl, setActivationUrl] = useState<string | null>(null)
  const [inviteStatus, setInviteStatus] = useState<string | null>(null)
  const [hasCopiedActivationUrl, setHasCopiedActivationUrl] = useState(false)
  const [isResendingInvite, setIsResendingInvite] = useState(false)
  const [users, setUsers] = useState<UserRow[]>([])

  const geminiApiKeyValue = summary?.integrations.geminiApiKey || ""
  const metaAccessTokenValue = summary?.integrations.metaAccessToken || ""
  const hasGeminiSecret = Boolean(geminiApiKeyValue)
  const hasMetaSecret = Boolean(metaAccessTokenValue)
  const isDatabaseConnected = summary?.database?.status === "connected"
  const latestMlLabel = summary?.latestMlRun?.lastRunningLabel || "No recent run"

  const readOnlyNotice = useMemo(
    () => (isItSupport ? null : "Settings are restricted to IT Support only."),
    [isItSupport],
  )

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(getApiUrl("/system/summary"), {
        headers: getAuthHeaders(),
        cache: "no-store",
      })
      const result: SummaryResponse = await response.json().catch(() => null)
      if (!response.ok || !result?.success || !result.data) {
        throw new Error(result?.message || "Settings could not be loaded.")
      }

      setSummary(result.data)
      setUsers(result.data.users || [])
      setIntegrationForm({
        geminiApiKey: result.data.integrations.geminiApiKey || "",
        geminiModel: result.data.integrations.geminiModel || "",
        metaIgUserId: result.data.integrations.metaIgUserId || "",
        metaAccessToken: result.data.integrations.metaAccessToken || "",
        metaGraphVersion: result.data.integrations.metaGraphVersion || "",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Settings could not be loaded.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isItSupport) void loadSettings()
  }, [isItSupport])

  if (!isItSupport) {
    return (
      <AccessDenied
        title="Forbidden"
        message="Settings page is only available to IT Support."
        feature="system-settings"
        requiredRole="IT Support"
        showButton={false}
      />
    )
  }

  const copyText = async (text: string, label: string) => {
    if (!text || typeof navigator === "undefined") return
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copied.`)
  }

  const saveIntegrations = async () => {
    try {
      setIsSavingIntegrations(true)
      const response = await fetch(getApiUrl("/system/integrations"), {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(integrationForm),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.success) throw new Error(result?.message || "Integration settings could not be saved.")
      await loadSettings()
      toast.success("Integration settings saved.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Integration settings could not be saved.")
    } finally {
      setIsSavingIntegrations(false)
    }
  }

  const createInvite = async () => {
    try {
      setIsCreatingInvite(true)
      const response = await fetch(getApiUrl("/system/user-invites"), {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.success || !result.data?.activationUrl) {
        throw new Error(result?.message || "Invite could not be created.")
      }
      setActivationUrl(result.data.activationUrl)
      setInviteStatus("Activation email sent")
      setHasCopiedActivationUrl(false)
      setInviteForm({ name: "", email: "", role: "operational" })
      await loadSettings()
      toast.success("Activation email sent.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite could not be created.")
    } finally {
      setIsCreatingInvite(false)
    }
  }

  const copyActivationUrl = async () => {
    if (!activationUrl || typeof navigator === "undefined") return
    await navigator.clipboard.writeText(activationUrl)
    setHasCopiedActivationUrl(true)
    window.setTimeout(() => setHasCopiedActivationUrl(false), 2000)
    toast.success("Activation link copied.")
  }

  const resendActivationEmail = async () => {
    if (!activationUrl) return

    try {
      setIsResendingInvite(true)
      const response = await fetch(getApiUrl("/system/user-invites/resend"), {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ activationUrl }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Activation email could not be sent again.")
      }
      setActivationUrl(result.data?.activationUrl || activationUrl)
      setInviteStatus("Activation email sent again")
      toast.success("Activation email sent again.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation email could not be sent again.")
    } finally {
      setIsResendingInvite(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">System Configuration</h1>
        <p className="text-muted-foreground">Manage Gemini, Meta, database, machine learning, and user access settings.</p>
      </div>

      {readOnlyNotice ? <BusinessErrorAlert title="Read-Only Access" message={readOnlyNotice} variant="info" /> : null}
      {error ? <BusinessErrorAlert title="Action Failed" message={error} suggestion="Please try again." /> : null}

      {isLoading ? (
        <PageSkeleton cards={4} lines={2} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border/60 bg-card/90 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Gemini</p>
                    <p className="mt-2 text-lg font-semibold">{summary?.integrations.aiConfigured ? "Connected" : "Offline"}</p>
                    <p className="text-sm text-muted-foreground">{summary?.integrations.geminiModel || "No model configured"}</p>
                  </div>
                  <Badge variant={summary?.integrations.aiConfigured ? "default" : "secondary"} className="rounded-full px-3">
                    AI
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/90 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Meta</p>
                    <p className="mt-2 text-lg font-semibold">{summary?.integrations.metaConfigured ? "Connected" : "Offline"}</p>
                    <p className="text-sm text-muted-foreground">{summary?.integrations.metaGraphVersion || "No graph version"}</p>
                  </div>
                  <Badge variant={summary?.integrations.metaConfigured ? "default" : "secondary"} className="rounded-full px-3">
                    API
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/90 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Database</p>
                    <p className="mt-2 text-lg font-semibold">{isDatabaseConnected ? "Connected" : "Error"}</p>
                    <p className="text-sm text-muted-foreground">{summary?.database?.subtitle || "Error establishing database connection"}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{summary?.database?.name || "Unknown database"}</p>
                  </div>
                  <Badge variant={isDatabaseConnected ? "default" : "secondary"} className="rounded-full px-3">
                    DB
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/90 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Machine Learning</p>
                    <p className="mt-2 text-lg font-semibold">{summary?.latestMlRun ? "Last running" : "Idle"}</p>
                    <p className="text-sm text-muted-foreground">{latestMlLabel}</p>
                  </div>
                  <Badge variant={summary?.latestMlRun ? "default" : "secondary"} className="rounded-full px-3">
                    ML
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-border/60 bg-card/90 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Integration Configuration
                </CardTitle>
                <CardDescription>Editable secrets for IT Support only.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Gemini API Key</p>
                      <p className="text-xs text-muted-foreground">Editable without env changes.</p>
                    </div>
                    <Badge variant={summary?.integrations.aiConfigured ? "default" : "secondary"} className="rounded-full px-3 py-1">
                      {summary?.integrations.aiConfigured ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm">
                    <div className="space-y-2">
                      <Label htmlFor="gemini-model">Model</Label>
                      <Input
                        id="gemini-model"
                        value={integrationForm.geminiModel}
                        onChange={(e) => setIntegrationForm((p) => ({ ...p, geminiModel: e.target.value }))}
                        placeholder="gemini-1.5-flash"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gemini-key">API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          id="gemini-key"
                          type={showGeminiKey ? "text" : "password"}
                          value={integrationForm.geminiApiKey}
                          onChange={(e) => setIntegrationForm((p) => ({ ...p, geminiApiKey: e.target.value }))}
                          placeholder="Paste Gemini API key"
                        />
                        <Button type="button" variant="outline" size="icon" onClick={() => setShowGeminiKey((v) => !v)} title={showGeminiKey ? "Hide Gemini API key" : "Show Gemini API key"}>
                          {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button type="button" variant="secondary" size="icon" onClick={() => void copyText(integrationForm.geminiApiKey, "Gemini API key")} disabled={!hasGeminiSecret} title="Copy Gemini API key">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Meta Credentials</p>
                      <p className="text-xs text-muted-foreground">IG user id and access token.</p>
                    </div>
                    <Badge variant={summary?.integrations.metaConfigured ? "default" : "secondary"} className="rounded-full px-3 py-1">
                      {summary?.integrations.metaConfigured ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm">
                    <div className="space-y-2">
                      <Label htmlFor="meta-user-id">IG User ID</Label>
                      <Input
                        id="meta-user-id"
                        value={integrationForm.metaIgUserId}
                        onChange={(e) => setIntegrationForm((p) => ({ ...p, metaIgUserId: e.target.value }))}
                        placeholder="Instagram business user id"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meta-token">Access Token</Label>
                      <div className="flex gap-2">
                        <Input
                          id="meta-token"
                          type={showMetaToken ? "text" : "password"}
                          value={integrationForm.metaAccessToken}
                          onChange={(e) => setIntegrationForm((p) => ({ ...p, metaAccessToken: e.target.value }))}
                          placeholder="Paste Meta access token"
                        />
                        <Button type="button" variant="outline" size="icon" onClick={() => setShowMetaToken((v) => !v)} title={showMetaToken ? "Hide Meta access token" : "Show Meta access token"}>
                          {showMetaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button type="button" variant="secondary" size="icon" onClick={() => void copyText(integrationForm.metaAccessToken, "Meta access token")} disabled={!hasMetaSecret} title="Copy Meta access token">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meta-version">Graph Version</Label>
                      <Input
                        id="meta-version"
                        value={integrationForm.metaGraphVersion}
                        onChange={(e) => setIntegrationForm((p) => ({ ...p, metaGraphVersion: e.target.value }))}
                        placeholder="v25.0"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button className="gap-2" onClick={() => void saveIntegrations()} disabled={isSavingIntegrations}>
                    {isSavingIntegrations ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Integration Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/90 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Accounts
                </CardTitle>
                <CardDescription>Invite users and let them set their own password.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="invite-name">Full name</Label>
                    <Input id="invite-name" value={inviteForm.name} onChange={(e) => setInviteForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input id="invite-email" type="email" value={inviteForm.email} onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <select
                    id="invite-role"
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value as Role }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="operational">Marketing Operational</option>
                    <option value="management">Management</option>
                    <option value="it_support">IT Support</option>
                  </select>
                </div>
                <Button className="gap-2" onClick={() => void createInvite()} disabled={isCreatingInvite}>
                  {isCreatingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                  Create Invite
                </Button>
                {activationUrl ? (
                  <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Invite Status</p>
                        <p className="mt-1 text-sm font-medium">{inviteStatus || "Activation email sent"}</p>
                      </div>
                      <Badge variant="secondary" className="rounded-full px-3 py-1">Sent</Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void copyActivationUrl()} title="Copy activation link">
                        {hasCopiedActivationUrl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {hasCopiedActivationUrl ? "Copied" : "Copy link"}
                      </Button>
                      <Button type="button" variant="secondary" size="sm" className="gap-2" onClick={() => void resendActivationEmail()} disabled={isResendingInvite} title="Send email again">
                        {isResendingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                        {isResendingInvite ? "Sending..." : "Resend email"}
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div className="space-y-2">
                  {users.map((user) => (
                    <div key={user.id} className="rounded-xl border bg-secondary/20 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <Badge variant="outline">{user.role}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
