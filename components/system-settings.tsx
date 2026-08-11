"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Copy, Eye, EyeOff, Key, Link as LinkIcon, Loader2, Save, Shield, Users,
  Check, CircleDashed, Pencil, Trash2, ChevronLeft, ChevronRight, X, CheckCircle,
  Activity, AlertTriangle, RefreshCw, Wifi, WifiOff,
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
      geminiApiKey: string
      geminiModel: string
      metaIgUserId: string
      metaAccessToken: string
      metaGraphVersion: string
    }
    metaTokenExpiry: string | null
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

  const [geminiUsage, setGeminiUsage] = useState<{
    logs: Array<{ id: number; userId: number | null; model: string; feature: string; promptTokens: number; candidatesTokens: number; totalTokens: number; createdAt: string; user: { name: string; email: string } | null }>
    today: { totalTokens: number; promptTokens: number; candidatesTokens: number; count: number }
    month: { totalTokens: number; promptTokens: number; candidatesTokens: number; count: number }
    allTime: { totalTokens: number; count: number }
  } | null>(null)
  const [geminiUsageLoading, setGeminiUsageLoading] = useState(false)

  const [tokenCheckResult, setTokenCheckResult] = useState<{
    meta: { status: string; expiresAt: string | null; daysRemaining: number | null; error?: string }
    gemini: { status: string; error?: string }
  } | null>(null)
  const [tokenCheckLoading, setTokenCheckLoading] = useState(false)
  const [lastTokenCheck, setLastTokenCheck] = useState<string | null>(null)

  const fetchGeminiUsage = async () => {
    try {
      setGeminiUsageLoading(true)
      const response = await fetch(getApiUrl("/system/gemini-usage?days=30&limit=50"), { headers: getAuthHeaders() })
      const result = await response.json().catch(() => null)
      if (result?.success && result.data) setGeminiUsage(result.data)
    } catch (_) { /* non-critical */ } finally { setGeminiUsageLoading(false) }
  }

  const checkTokensNow = async () => {
    try {
      setTokenCheckLoading(true)
      const response = await fetch(getApiUrl("/system/check-tokens"), {
        method: "POST",
        headers: getAuthHeaders(),
      })
      const result = await response.json().catch(() => null)
      if (result?.success && result.data) {
        setTokenCheckResult(result.data)
        setLastTokenCheck(new Date().toISOString())
        toast.success("Token and integration health check completed.")
      } else {
        toast.error(result?.message || "Token check failed.")
      }
    } catch (_) {
      toast.error("Token check failed.")
    } finally { setTokenCheckLoading(false) }
  }

  const geminiApiKeyValue = summary?.integrations.geminiApiKey || ""
  const metaAccessTokenValue = summary?.integrations.metaAccessToken || ""
  const hasGeminiSecret = Boolean(geminiApiKeyValue)
  const hasMetaSecret = Boolean(metaAccessTokenValue)
  const isDatabaseConnected = summary?.database?.status === "connected"

  const totalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE))
  const paginatedUsers = users.slice((userPage - 1) * USERS_PER_PAGE, userPage * USERS_PER_PAGE)

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
        geminiEnabled: result.data.integrations.aiEnabled,
        metaIgUserId: result.data.integrations.metaIgUserId || "",
        metaAccessToken: result.data.integrations.metaAccessToken || "",
        metaGraphVersion: result.data.integrations.metaGraphVersion || "",
        metaEnabled: result.data.integrations.metaEnabled,
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

  useEffect(() => {
    if (userPage > totalPages) setUserPage(totalPages)
  }, [userPage, totalPages])

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
            {summary?.metaTokenExpiry && integrationForm.metaEnabled && (
              <p className="text-xs text-muted-foreground -mt-2 px-1">
                Meta Token Access will be expired at{" "}
                {new Date(summary.metaTokenExpiry).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}

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

          {/* Gemini Usage */}
          <Card className="border-border/60 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitleTooltip title="Gemini API Usage" tooltip="Token consumption and call history for the AI provider. Logs are captured per Gemini response." />
            </CardHeader>
            <CardContent className="space-y-4">
              {geminiUsageLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : geminiUsage ? (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl border bg-secondary/20 p-3 text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Today</p>
                      <p className="text-lg font-bold">{geminiUsage.today.totalTokens.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{geminiUsage.today.count} call{geminiUsage.today.count !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="rounded-xl border bg-secondary/20 p-3 text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">This Month</p>
                      <p className="text-lg font-bold">{geminiUsage.month.totalTokens.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{geminiUsage.month.count} call{geminiUsage.month.count !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="rounded-xl border bg-secondary/20 p-3 text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">All Time</p>
                      <p className="text-lg font-bold">{geminiUsage.allTime.totalTokens.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{geminiUsage.allTime.count} call{geminiUsage.allTime.count !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  {/* Recent log table */}
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-muted-foreground border-b">
                          <th className="pb-1 pr-2">Time</th>
                          <th className="pb-1 pr-2">User</th>
                          <th className="pb-1 pr-2">Model</th>
                          <th className="pb-1 pr-2">Feature</th>
                          <th className="pb-1 pr-2 text-right">Tokens</th>
                        </tr>
                      </thead>
                      <tbody>
                        {geminiUsage.logs.length === 0 ? (
                          <tr><td colSpan={5} className="pt-3 text-center text-muted-foreground">No usage yet</td></tr>
                        ) : geminiUsage.logs.slice(0, 20).map((log) => (
                          <tr key={log.id} className="border-b border-border/40">
                            <td className="py-1.5 pr-2 whitespace-nowrap">{new Date(log.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                            <td className="py-1.5 pr-2 max-w-[100px] truncate">{log.user?.name || "—"}</td>
                            <td className="py-1.5 pr-2">{log.model}</td>
                            <td className="py-1.5 pr-2">{log.feature}</td>
                            <td className="py-1.5 text-right">{log.totalTokens.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => void fetchGeminiUsage()} disabled={geminiUsageLoading}>
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh
                  </Button>
                </>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => void fetchGeminiUsage()} disabled={geminiUsageLoading}>
                    {geminiUsageLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
                    Load Usage Data
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Integration Health */}
          <Card className="border-border/60 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitleTooltip title="Integration Health" tooltip="Real-time status of external integrations: Meta token validity, Gemini API connectivity, and SMTP configuration." />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {/* Meta status */}
                <div className="flex items-center justify-between rounded-xl border bg-secondary/20 p-3">
                  <div className="flex items-center gap-3">
                    {tokenCheckResult?.meta.status === "valid" ? <Wifi className="h-4 w-4 text-green-500" />
                      : tokenCheckResult?.meta.status === "warning" || tokenCheckResult?.meta.status === "critical" ? <AlertTriangle className="h-4 w-4 text-amber-500" />
                      : tokenCheckResult?.meta.status === "expired" || tokenCheckResult?.meta.status === "error" || tokenCheckResult?.meta.status === "invalid" ? <WifiOff className="h-4 w-4 text-red-500" />
                      : <CircleDashed className="h-4 w-4 text-muted-foreground" />}
                    <div>
                      <p className="text-sm font-medium">Meta Token</p>
                      {tokenCheckResult ? (
                        <p className="text-xs text-muted-foreground">
                          {tokenCheckResult.meta.status === "valid" ? `Valid (${tokenCheckResult.meta.daysRemaining} days remaining)`
                            : tokenCheckResult.meta.status === "warning" ? `Expires in ${tokenCheckResult.meta.daysRemaining} days`
                            : tokenCheckResult.meta.status === "critical" ? `Expires in ${tokenCheckResult.meta.daysRemaining} days — action required`
                            : tokenCheckResult.meta.status === "expired" ? "Expired — token needs renewal"
                            : tokenCheckResult.meta.status === "not_configured" ? "Not configured"
                            : tokenCheckResult.meta.error || "Error checking status"}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Not checked yet</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={
                    tokenCheckResult?.meta.status === "valid" ? "default"
                    : tokenCheckResult?.meta.status === "warning" ? "secondary"
                    : tokenCheckResult?.meta.status === "critical" || tokenCheckResult?.meta.status === "expired" ? "destructive"
                    : "outline"
                  } className="rounded-full px-3 shrink-0 ml-2">
                    {tokenCheckResult?.meta.status === "valid" ? "Healthy"
                      : tokenCheckResult?.meta.status === "warning" ? "Warning"
                      : tokenCheckResult?.meta.status === "critical" ? "Critical"
                      : tokenCheckResult?.meta.status === "expired" ? "Expired"
                      : tokenCheckResult?.meta.status === "error" || tokenCheckResult?.meta.status === "invalid" ? "Error"
                      : "Unknown"}
                  </Badge>
                </div>

                {/* Gemini status */}
                <div className="flex items-center justify-between rounded-xl border bg-secondary/20 p-3">
                  <div className="flex items-center gap-3">
                    {tokenCheckResult?.gemini.status === "valid" ? <Wifi className="h-4 w-4 text-green-500" />
                      : tokenCheckResult?.gemini.status === "not_configured" ? <CircleDashed className="h-4 w-4 text-muted-foreground" />
                      : <WifiOff className="h-4 w-4 text-red-500" />}
                    <div>
                      <p className="text-sm font-medium">Gemini API</p>
                      {tokenCheckResult ? (
                        <p className="text-xs text-muted-foreground">
                          {tokenCheckResult.gemini.status === "valid" ? "Responded successfully"
                            : tokenCheckResult.gemini.status === "not_configured" ? "Not configured"
                            : tokenCheckResult.gemini.error || "Error checking status"}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Not checked yet</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={
                    tokenCheckResult?.gemini.status === "valid" ? "default"
                    : "destructive"
                  } className="rounded-full px-3 shrink-0 ml-2">
                    {tokenCheckResult?.gemini.status === "valid" ? "Healthy"
                      : tokenCheckResult?.gemini.status === "not_configured" ? "N/A"
                      : "Error"}
                  </Badge>
                </div>

                {/* SMTP status */}
                <div className="flex items-center justify-between rounded-xl border bg-secondary/20 p-3">
                  <div className="flex items-center gap-3">
                    {summary?.integrations?.metaConfigured || summary?.integrations?.aiConfigured ? <Wifi className="h-4 w-4 text-green-500" />
                      : <CircleDashed className="h-4 w-4 text-muted-foreground" />}
                    <div>
                      <p className="text-sm font-medium">SMTP</p>
                      <p className="text-xs text-muted-foreground">Configured in environment</p>
                    </div>
                  </div>
                  <Badge variant="default" className="rounded-full px-3 shrink-0 ml-2">Active</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">
                  {lastTokenCheck
                    ? `Last checked: ${new Date(lastTokenCheck).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                    : "Automatic checks run twice daily"}
                </p>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => void checkTokensNow()} disabled={tokenCheckLoading}>
                  {tokenCheckLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Check Now
                </Button>
              </div>
            </CardContent>
          </Card>

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
                          placeholder="Paste Gemini API key"
                        />
                        <Button type="button" variant="outline" size="icon" onClick={() => setShowGeminiKey((v) => !v)}>
                          {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button type="button" variant="secondary" size="icon" onClick={() => void copyText(integrationForm.geminiApiKey, "Gemini API key")} disabled={!hasGeminiSecret}>
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
                          placeholder="Paste Meta access token"
                        />
                        <Button type="button" variant="outline" size="icon" onClick={() => setShowMetaToken((v) => !v)}>
                          {showMetaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button type="button" variant="secondary" size="icon" onClick={() => void copyText(integrationForm.metaAccessToken, "Meta access token")} disabled={!hasMetaSecret}>
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
