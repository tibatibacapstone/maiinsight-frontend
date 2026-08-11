"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Copy, Eye, EyeOff, Key, Link as LinkIcon, Loader2, Save, Shield, Users,
  Check, CircleDashed, Pencil, Trash2, ChevronLeft, ChevronRight, X, CheckCircle,
} from "lucide-react"

import { AccessDenied } from "@/components/access-denied"
import { BusinessErrorAlert } from "@/components/business-error-alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitleTooltip, KpiCard } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { getApiUrl } from "@/lib/api"
import { getAuthHeaders, getStoredRole, USER_ROLES } from "@/lib/roles"

type Role = "operational" | "management" | "it_support"

type UserRow = { id: number; name: string; email: string; role: Role; updatedAt: string }

const USERS_PER_PAGE = 4

const ROLE_LABELS: Record<Role, string> = {
  operational: "Marketing Operational",
  management: "Management",
  it_support: "IT Support",
}

interface SummaryResponse {
  success: boolean
  message?: string
  data?: {
    currentUser: { userId: number; email: string; role: string }
    database: { name: string; status: string; lastUpdated: string | null }
    latestSegmentationRun: { id: number; status: string; runDate: string; totalCustomers: number } | null
    latestImport: { id: number; fileName: string; status: string; updatedAt: string; rowCount: number } | null
    latestMetaSync: { id: number; status: string; startedAt: string; message: string } | null
    integrations: {
      metaConfigured: boolean
      metaEnabled: boolean
      aiConfigured: boolean
      aiEnabled: boolean
      aiProvider: string
      aiProviderLabel: string
      aiModel: string | null
      geminiApiKeyConfigured: boolean
      geminiModel: string
      metaAccessTokenConfigured: boolean
      metaGraphVersion: string
    }
  }
}

interface UsersResponse {
  success: boolean
  message?: string
  data?: UserRow[]
}

interface IntegrationConfigResponse {
  success: boolean
  message?: string
  data?: {
    geminiApiKeyConfigured: boolean
    geminiModel: string
    geminiEnabled: boolean
    metaAccessTokenConfigured: boolean
    metaIgUserId: string
    metaGraphVersion: string
    metaEnabled: boolean
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
    geminiEnabled: true,
    metaIgUserId: "",
    metaAccessToken: "",
    metaGraphVersion: "",
    metaEnabled: true,
  })
  const [isSavingIntegrations, setIsSavingIntegrations] = useState(false)
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "operational" as Role })
  const [isCreatingInvite, setIsCreatingInvite] = useState(false)
  const [activationUrl, setActivationUrl] = useState<string | null>(null)
  const [inviteStatus, setInviteStatus] = useState<string | null>(null)
  const [hasCopiedActivationUrl, setHasCopiedActivationUrl] = useState(false)
  const [isResendingInvite, setIsResendingInvite] = useState(false)
  const [users, setUsers] = useState<UserRow[]>([])
  const [userPage, setUserPage] = useState(1)

  // Edit user state
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [editForm, setEditForm] = useState({ name: "", role: "operational" as Role })
  const [isSavingUser, setIsSavingUser] = useState(false)

  // Delete user state
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null)
  const [isDeletingUser, setIsDeletingUser] = useState(false)

  const hasGeminiSecret = Boolean(summary?.integrations.geminiApiKeyConfigured)
  const hasMetaSecret = Boolean(summary?.integrations.metaAccessTokenConfigured)
  const isDatabaseConnected = summary?.database?.status === "connected"

  const totalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE))
  const paginatedUsers = users.slice((userPage - 1) * USERS_PER_PAGE, userPage * USERS_PER_PAGE)

  const readOnlyNotice = useMemo(
    () => (isItSupport ? null : "Settings are restricted to IT Support only."),
    [isItSupport],
  )

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [response, configResponse, usersResponse] = await Promise.all([
        fetch(getApiUrl("/system/summary"), {
          headers: getAuthHeaders(),
          cache: "no-store",
        }),
        isItSupport
          ? fetch(getApiUrl("/system/config"), {
              headers: getAuthHeaders(),
              cache: "no-store",
            })
          : Promise.resolve(null),
        isItSupport
          ? fetch(getApiUrl("/system/users"), {
              headers: getAuthHeaders(),
              cache: "no-store",
            })
          : Promise.resolve(null),
      ])
      const result: SummaryResponse = await response.json().catch(() => null)
      if (!response.ok || !result?.success || !result.data) {
        throw new Error(result?.message || "Settings could not be loaded.")
      }

      setSummary(result.data)
      const configResult: IntegrationConfigResponse | null = configResponse
        ? await configResponse.json().catch(() => null)
        : null
      const usersResult: UsersResponse | null = usersResponse
        ? await usersResponse.json().catch(() => null)
        : null
      if (configResponse && (!configResponse.ok || !configResult?.success || !configResult.data)) {
        throw new Error(configResult?.message || "Integration configuration could not be loaded.")
      }
      if (usersResponse && (!usersResponse.ok || !usersResult?.success || !usersResult.data)) {
        throw new Error(usersResult?.message || "User directory could not be loaded.")
      }
      setUsers(usersResult?.data || [])
      const editableConfig = configResult?.data
      setIntegrationForm({
        geminiApiKey: "",
        geminiModel: editableConfig?.geminiModel || result.data.integrations.geminiModel || "",
        geminiEnabled: editableConfig?.geminiEnabled ?? result.data.integrations.aiEnabled,
        metaIgUserId: editableConfig?.metaIgUserId || "",
        metaAccessToken: "",
        metaGraphVersion: editableConfig?.metaGraphVersion || result.data.integrations.metaGraphVersion || "",
        metaEnabled: editableConfig?.metaEnabled ?? result.data.integrations.metaEnabled,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Settings could not be loaded.")
    } finally {
      setIsLoading(false)
    }
  }, [isItSupport])

  useEffect(() => {
    if (userRole === USER_ROLES.OPERATIONAL || isItSupport) void loadSettings()
  }, [isItSupport, loadSettings, userRole])

  useEffect(() => {
    if (userPage > totalPages) setUserPage(totalPages)
  }, [userPage, totalPages])

  if (userRole !== USER_ROLES.OPERATIONAL && !isItSupport) {
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

  if (!isItSupport) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">System Configuration</h1>
          <p className="text-muted-foreground">Read-only integration and system status.</p>
        </div>
        <BusinessErrorAlert
          title="Read-Only Access"
          message="Marketing Operational can view safe connection status. Integration credentials remain restricted to IT Support."
          variant="info"
        />
        {error ? <BusinessErrorAlert title="Status Unavailable" message={error} /> : null}
        {isLoading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Gemini"
              value={summary?.integrations.aiConfigured ? "Configured" : "Not configured"}
              changeLabel={summary?.integrations.aiEnabled ? "Enabled" : "Disabled"}
              tooltip="Safe Gemini integration status. Credentials are not displayed."
            />
            <KpiCard
              label="Meta"
              value={summary?.integrations.metaConfigured ? "Configured" : "Not configured"}
              changeLabel={summary?.integrations.metaEnabled ? "Enabled" : "Disabled"}
              tooltip="Safe Meta integration status. Credentials are not displayed."
            />
            <KpiCard
              label="Database"
              value={isDatabaseConnected ? "Connected" : "Unavailable"}
              changeLabel={summary?.database?.lastUpdated ? `Last updated ${new Date(summary.database.lastUpdated).toLocaleString()}` : "No import recorded"}
              tooltip="Database connection status."
            />
            <KpiCard
              label="Segmentation"
              value={summary?.latestSegmentationRun ? "Ready" : "No runs yet"}
              changeLabel={summary?.latestSegmentationRun?.status || "Unavailable"}
              tooltip="Latest customer-segmentation status."
            />
          </div>
        )}
      </div>
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

  const toggleIntegration = async (field: "geminiEnabled" | "metaEnabled", value: boolean) => {
    setIntegrationForm((p) => ({ ...p, [field]: value }))
    try {
      const updatedForm = { ...integrationForm, [field]: value }
      const response = await fetch(getApiUrl("/system/integrations"), {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(updatedForm),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.success) throw new Error(result?.message || "Toggle could not be saved.")
      await loadSettings()
      toast.success(`${field === "geminiEnabled" ? "Gemini" : "Meta"} ${value ? "enabled" : "disabled"}.`)
    } catch (err) {
      setIntegrationForm((p) => ({ ...p, [field]: !value }))
      setError(err instanceof Error ? err.message : "Toggle could not be saved.")
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

  const saveUser = async () => {
    if (!editingUser) return
    try {
      setIsSavingUser(true)
      const response = await fetch(getApiUrl(`/system/users/${editingUser.id}`), {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: editForm.name, role: editForm.role }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "User could not be updated.")
      }
      setEditingUser(null)
      await loadSettings()
      toast.success("User updated successfully.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "User could not be updated.")
    } finally {
      setIsSavingUser(false)
    }
  }

  const deleteUser = async () => {
    if (!deletingUser) return
    try {
      setIsDeletingUser(true)
      const response = await fetch(getApiUrl(`/system/users/${deletingUser.id}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "User could not be deleted.")
      }
      setDeletingUser(null)
      await loadSettings()
      toast.success("User deleted successfully.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "User could not be deleted.")
    } finally {
      setIsDeletingUser(false)
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
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Gemini"
              value={integrationForm.geminiEnabled ? (summary?.integrations.aiConfigured ? "Connected" : "No API Key") : "Disabled"}
              changeLabel={summary?.integrations.geminiModel || "No model configured"}
              tooltip="Gemini AI integration status and configured model."
            >
              <Badge variant={summary?.integrations.aiConfigured && integrationForm.geminiEnabled ? "default" : "destructive"} className="rounded-full px-3">
                {summary?.integrations.aiConfigured && integrationForm.geminiEnabled ? "Active" : "Inactive"}
              </Badge>
            </KpiCard>

            <KpiCard
              label="Meta"
              value={integrationForm.metaEnabled ? (summary?.integrations.metaConfigured ? "Connected" : "No Credentials") : "Disabled"}
              changeLabel={summary?.latestMetaSync
                ? `Last sync: ${new Date(summary.latestMetaSync.startedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                : "No sync yet"}
              tooltip="Meta Graph API connection status and last sync time."
            >
              <Badge variant={summary?.integrations.metaConfigured && integrationForm.metaEnabled ? "default" : "destructive"} className="rounded-full px-3">
                {summary?.integrations.metaConfigured && integrationForm.metaEnabled ? "Active" : "Inactive"}
              </Badge>
            </KpiCard>

            <KpiCard
              label="Database"
              value={isDatabaseConnected ? summary?.database?.name || "Connected" : "Error"}
              changeLabel={summary?.database?.lastUpdated
                ? `Last updated: ${new Date(summary.database.lastUpdated).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                : "No data imported yet"}
              tooltip="MySQL database connection status and name."
            >
              <Badge variant={isDatabaseConnected ? "default" : "destructive"} className="rounded-full px-3">
                {isDatabaseConnected ? "Active" : "Inactive"}
              </Badge>
            </KpiCard>

            <KpiCard
              label="K-Means++ ML"
              value={summary?.latestSegmentationRun ? "Ready" : "No runs yet"}
              changeLabel={summary?.latestSegmentationRun
                ? `Last run: ${new Date(summary.latestSegmentationRun.runDate).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                : "Run segmentation from Data Center"}
              tooltip="K-Means++ ML Segmentation Engine status."
            >
              <Badge variant={summary?.latestSegmentationRun?.status === "success" ? "default" : "secondary"} className="rounded-full px-3">
                {summary?.latestSegmentationRun?.status === "success" ? "Active" : "No Runs"}
              </Badge>
            </KpiCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2 items-start">
            {/* Integration Configuration */}
            <Card className="border-border/60 bg-card/90 shadow-sm">
              <CardHeader>
                <CardTitleTooltip title="Integration Configuration" tooltip="Manage API keys and credentials for Gemini AI and Meta integrations. Editable secrets for IT Support only." />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Gemini API Key</p>
                      <p className="text-xs text-muted-foreground">Editable without env changes.</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Badge
                        variant={integrationForm.geminiEnabled ? "default" : "destructive"}
                        className="rounded-full px-3 py-1 transition-colors duration-200"
                      >
                        {integrationForm.geminiEnabled ? "Active" : "Inactive"}
                      </Badge>
                      <Switch
                        checked={integrationForm.geminiEnabled}
                        onCheckedChange={(checked) => void toggleIntegration("geminiEnabled", checked)}
                        disabled={!isItSupport}
                        className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-400 transition-colors duration-200 hover:ring-2 hover:ring-offset-2 hover:ring-green-300"
                      />
                    </div>
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
                          placeholder={hasGeminiSecret ? "Configured — enter a new key to replace" : "Enter Gemini API key"}
                        />
                        <Button type="button" variant="outline" size="icon" onClick={() => setShowGeminiKey((v) => !v)}>
                          {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button type="button" variant="secondary" size="icon" onClick={() => void copyText(integrationForm.geminiApiKey, "New Gemini API key")} disabled={!integrationForm.geminiApiKey}>
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
                    <div className="flex items-center gap-2.5">
                      <Badge
                        variant={integrationForm.metaEnabled ? "default" : "destructive"}
                        className="rounded-full px-3 py-1 transition-colors duration-200"
                      >
                        {integrationForm.metaEnabled ? "Active" : "Inactive"}
                      </Badge>
                      <Switch
                        checked={integrationForm.metaEnabled}
                        onCheckedChange={(checked) => void toggleIntegration("metaEnabled", checked)}
                        disabled={!isItSupport}
                        className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-400 transition-colors duration-200 hover:ring-2 hover:ring-offset-2 hover:ring-green-300"
                      />
                    </div>
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
                          placeholder={hasMetaSecret ? "Configured — enter a new token to replace" : "Enter Meta access token"}
                        />
                        <Button type="button" variant="outline" size="icon" onClick={() => setShowMetaToken((v) => !v)}>
                          {showMetaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button type="button" variant="secondary" size="icon" onClick={() => void copyText(integrationForm.metaAccessToken, "New Meta access token")} disabled={!integrationForm.metaAccessToken}>
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

            {/* User Accounts */}
            <Card className="border-border/60 bg-card/90 shadow-sm">
              <CardHeader>
                <CardTitleTooltip title="User Accounts" tooltip="Invite new users, edit roles/names, or delete accounts. Invited users set their own password." />
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
                      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void copyActivationUrl()}>
                        {hasCopiedActivationUrl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {hasCopiedActivationUrl ? "Copied" : "Copy link"}
                      </Button>
                      <Button type="button" variant="secondary" size="sm" className="gap-2" onClick={() => void resendActivationEmail()} disabled={isResendingInvite}>
                        {isResendingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                        {isResendingInvite ? "Sending..." : "Resend email"}
                      </Button>
                    </div>
                  </div>
                ) : null}

                {/* User List with Pagination */}
                <div className="space-y-2">
                  {paginatedUsers.map((user) => (
                    <div key={user.id} className="rounded-xl border bg-secondary/20 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{user.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="outline" className="text-xs">{ROLE_LABELS[user.role] || user.role}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Edit user"
                            onClick={() => {
                              setEditingUser(user)
                              setEditForm({ name: user.name, role: user.role })
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            title="Delete user"
                            onClick={() => setDeletingUser(user)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {users.length > USERS_PER_PAGE && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Showing {(userPage - 1) * USERS_PER_PAGE + 1}–{Math.min(userPage * USERS_PER_PAGE, users.length)} of {users.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={userPage <= 1}
                        onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={page === userPage ? "default" : "outline"}
                          size="icon"
                          className="h-8 w-8 text-xs"
                          onClick={() => setUserPage(page)}
                        >
                          {page}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={userPage >= totalPages}
                        onClick={() => setUserPage((p) => Math.min(totalPages, p + 1))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Edit User Dialog */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-semibold">Edit User</h3>
              <Button variant="ghost" size="icon" onClick={() => setEditingUser(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editingUser.email} disabled className="opacity-60" />
                <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <select
                  id="edit-role"
                  value={editForm.role}
                  onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as Role }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="operational">Marketing Operational</option>
                  <option value="management">Management</option>
                  <option value="it_support">IT Support</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
                <Button className="gap-2" onClick={() => void saveUser()} disabled={isSavingUser || !editForm.name.trim()}>
                  {isSavingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete User Dialog */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-semibold text-destructive">Delete User</h3>
              <Button variant="ghost" size="icon" onClick={() => setDeletingUser(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                Are you sure you want to delete <strong>{deletingUser.name}</strong> ({deletingUser.email})? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeletingUser(null)}>Cancel</Button>
                <Button variant="destructive" className="gap-2" onClick={() => void deleteUser()} disabled={isDeletingUser}>
                  {isDeletingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
