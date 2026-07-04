"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bell,
  Check,
  Copy,
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react"

import { BusinessErrorAlert } from "@/components/business-error-alert"
import { PageSkeleton } from "@/components/page-skeleton"
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
import { getApiUrl } from "@/lib/api"
import {
  LOW_OCCUPANCY_OUTREACH_EVENT,
  readLowOccupancyOutreachContext,
  type LowOccupancyOutreachContext,
} from "@/lib/low-occupancy-outreach"
import { canAccessFeature, getAuthHeaders, getStoredRole, normalizeRole, type UserRole } from "@/lib/roles"

interface NotificationItem {
  id: string
  title: string
  message: string
  createdAt?: string
  relativeTime: string
}

interface AiStatusResponse {
  success: boolean
  data?: {
    configured: boolean
    provider: string
    providerLabel: string
    model: string | null
    latestGenerationAt: string | null
    setupMessage: string | null
    suggestion: string | null
  }
  message?: string
}

interface StrategyPayload {
  campaignObjective: string
  targetCustomerGroup: string
  customerReasoning: string
  suggestedOffer: string
  whatsappMessage: string
  followUpPlan: string
  expectedBusinessImpact: string
  dataLimitation: string
}

interface NormalizedStrategyPayload {
  provider: string
  model: string
  generatedAt: string
  rawText?: string | null
  technicalMessage?: string | null
  strategy: StrategyPayload
}

interface StrategyResponse {
  success: boolean
  errorCode?: string
  message?: string
  suggestion?: string
  technicalMessage?: string
  provider?: string
  model?: string
  generatedAt?: string
  rawText?: string | null
  strategy?: StrategyPayload
  data?: NormalizedStrategyPayload
}

interface StrategyFieldCardProps {
  label: string
  value: string
  accent?: "blue" | "emerald" | "amber" | "rose" | "slate"
}

interface GenAIWorkspaceProps {
  userRole?: string | null
}

const venueTypes = ["All Venue", "Mini Soccer", "Basketball"] as const
const targetSegments = ["Prime Players", "Routine Players", "Growth Players", "Re-Engagement Players"]
const campaignObjectives = [
  "Maximize Off-Peak Occupancy",
  "Drive Revenue Growth",
  "Boost Social Media Conversion",
  "Customer Reactivation & Retention",
]
const incentiveFrameworks = [
  "Time-Based Discount",
  "Value-Added Services",
  "Loyalty Points Multiplier",
  "Fixed-Rate Bundling",
]
const copywritingTones = [
  "Casual & Community Hook",
  "Urgent Promo Tone",
  "Professional Tone",
]

const getRelativeTime = (value?: string | null) => {
  if (!value) return "Not generated yet"
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return "Not generated yet"
  const diffMinutes = Math.floor((Date.now() - timestamp.getTime()) / 60000)
  if (diffMinutes < 1) return "just now"
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  const diffDays = Math.floor(diffHours / 24)
  return diffDays === 1 ? "yesterday" : `${diffDays} days ago`
}

const formatExactDateTime = (value?: string | null) => {
  if (!value) return "Not generated yet"
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return "Not generated yet"

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp)
}

const mapCourtTypeToVenue = (courtType: string) => {
  if (courtType === "mini_soccer") return "Mini Soccer"
  if (courtType === "basketball") return "Basketball"
  return "All Venue"
}

const accentStyles: Record<NonNullable<StrategyFieldCardProps["accent"]>, string> = {
  blue: "border-sky-200 bg-sky-50/80 text-sky-800",
  emerald: "border-emerald-200 bg-emerald-50/80 text-emerald-800",
  amber: "border-amber-200 bg-amber-50/80 text-amber-800",
  rose: "border-rose-200 bg-rose-50/80 text-rose-800",
  slate: "border-slate-200 bg-slate-50/80 text-slate-800",
}

function StrategyFieldCard({ label, value, accent = "slate" }: StrategyFieldCardProps) {
  return (
    <div className={`group rounded-2xl border p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${accentStyles[accent]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-80">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-900">{value}</p>
    </div>
  )
}

export function GenAIWorkspace({ userRole: userRoleFromProps }: GenAIWorkspaceProps) {
  const [storedUserRole, setStoredUserRole] = useState<UserRole | null>(null)
  const [workspaceMode, setWorkspaceMode] = useState<"general" | "outreach">("general")
  const [outreachContext, setOutreachContext] = useState<LowOccupancyOutreachContext | null>(null)
  const [selectedVenueType, setSelectedVenueType] = useState<(typeof venueTypes)[number]>("All Venue")
  const [selectedSegment, setSelectedSegment] = useState("Re-Engagement Players")
  const [selectedObjective, setSelectedObjective] = useState("Maximize Off-Peak Occupancy")
  const [selectedIncentive, setSelectedIncentive] = useState("Value-Added Services")
  const [selectedTone, setSelectedTone] = useState("Casual & Community Hook")
  const [aiStatus, setAiStatus] = useState<AiStatusResponse["data"] | null>(null)
  const [strategy, setStrategy] = useState<NormalizedStrategyPayload | null>(null)
  const [alerts, setAlerts] = useState<NotificationItem[]>([])
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<{ message: string; suggestion?: string | null; technical?: string | null } | null>(null)

  useEffect(() => {
    setStoredUserRole(normalizeRole(userRoleFromProps) || getStoredRole())
  }, [userRoleFromProps])

  useEffect(() => {
    const applyContext = (context: LowOccupancyOutreachContext | null) => {
      if (!context) return
      setOutreachContext(context)
      setWorkspaceMode("outreach")
      setSelectedVenueType(mapCourtTypeToVenue(context.courtType))
      if (context.rfmSegmentName) {
        setSelectedSegment(context.rfmSegmentName)
      }
      setSelectedTone("Casual & Community Hook")
    }

    applyContext(readLowOccupancyOutreachContext())
    const handleContextEvent = (event: Event) => applyContext((event as CustomEvent<LowOccupancyOutreachContext>).detail)
    window.addEventListener(LOW_OCCUPANCY_OUTREACH_EVENT, handleContextEvent)
    return () => window.removeEventListener(LOW_OCCUPANCY_OUTREACH_EVENT, handleContextEvent)
  }, [])

  const activeRole = userRoleFromProps ? normalizeRole(userRoleFromProps) : storedUserRole
  const canViewPage = Boolean(activeRole && activeRole !== "management")
  const canGenerateAi = canAccessFeature(activeRole, "generateAiStrategy")
  const canViewTechnicalDetails = activeRole === "it_support"


  const loadWorkspaceStatus = async () => {
    try {
      setIsLoadingStatus(true)
      setError(null)

      const [statusResponse, alertsResponse] = await Promise.all([
        fetch(getApiUrl("/ai-strategy/status"), {
          method: "GET",
          headers: getAuthHeaders(),
          cache: "no-store",
        }),
        fetch(getApiUrl("/operations/notifications"), {
          method: "GET",
          headers: getAuthHeaders(),
          cache: "no-store",
        }),
      ])

      const statusResult: AiStatusResponse | null = await statusResponse.json().catch(() => null)
      const alertsResult = await alertsResponse.json().catch(() => null)

      if (!statusResponse.ok || !statusResult?.success || !statusResult.data) {
        throw new Error(statusResult?.message || "AI strategy status could not be loaded.")
      }

      setAiStatus(statusResult.data)

      const aiAlerts = Array.isArray(alertsResult?.data)
        ? (alertsResult.data as NotificationItem[])
            .filter((item) => `${item.title} ${item.message}`.toLowerCase().includes("ai"))
            .slice(0, 6)
        : []

      setAlerts(aiAlerts)
    } catch (loadError) {
      setAiStatus(null)
      setAlerts([])
      setError({
        message: loadError instanceof Error ? loadError.message : "AI strategy status could not be loaded.",
        suggestion: "Please try again or contact IT Support if the issue continues.",
      })
    } finally {
      setIsLoadingStatus(false)
    }
  }

  useEffect(() => {
    if (!canViewPage) return
    void loadWorkspaceStatus()
  }, [canViewPage])

  const requestPayload = useMemo(() => {
    if (workspaceMode === "outreach" && outreachContext) {
      return {
        selected_filters: {
          mode: "low_occupancy_outreach",
          venue: selectedVenueType,
          segmentName: outreachContext.rfmSegmentName || selectedSegment,
          campaignObjective: selectedObjective,
          copyTone: selectedTone,
          slotTimeLabel: outreachContext.slotTimeLabel || null,
        },
        customer_segment_summary: {
          targetPriorityLabel: outreachContext.targetPriorityLabel,
          targetPriorityScore: outreachContext.targetPriorityScore,
          customerTypeLabel: outreachContext.customerTypeLabel,
          selectedSessionBookingCount: outreachContext.selectedSessionBookingCount,
        },
        business_context: {
          date: outreachContext.date,
          sessionName: outreachContext.sessionName,
          sessionStartHour: outreachContext.sessionStartHour || null,
          sessionEndHour: outreachContext.sessionEndHour || null,
          slotTimeLabel: outreachContext.slotTimeLabel || null,
          courtType: outreachContext.courtType,
          suggestedAction: outreachContext.suggestedAction,
          lowOccupancyTargeting: true,
        },
        promotion_context: {
          incentiveFramework: selectedIncentive,
          copywritingTone: selectedTone,
        },
        recommended_customer_context: {
          customerLabel: outreachContext.customerTypeLabel,
          targetPriorityLabel: outreachContext.targetPriorityLabel,
        },
      }
    }

    return {
      selected_filters: {
        mode: "general_strategy",
        venue: selectedVenueType,
        segmentName: selectedSegment,
        campaignObjective: selectedObjective,
      },
      customer_segment_summary: {
        segmentName: selectedSegment,
      },
      business_context: {
        venueType: selectedVenueType,
        objective: selectedObjective,
      },
      promotion_context: {
        incentiveFramework: selectedIncentive,
        copywritingTone: selectedTone,
      },
    }
  }, [outreachContext, selectedIncentive, selectedObjective, selectedSegment, selectedTone, selectedVenueType, workspaceMode])

  const handleGenerateStrategy = async () => {
    if (!canGenerateAi) {
      setError({
        message: "AI strategy generation is available to Marketing Operational and IT Support only.",
        suggestion: "Please sign in with a Marketing Operational or IT Support account.",
      })
      return
    }

    try {
      setIsGenerating(true)
      setError(null)

      const response = await fetch(getApiUrl("/ai-strategy/generate"), {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      })

      const result: StrategyResponse | null = await response.json().catch(() => null)
      const normalizedResult = result?.data || (result?.strategy && result?.provider && result?.generatedAt
        ? {
            provider: result.provider,
            model: result.model || "",
            generatedAt: result.generatedAt,
            rawText: result.rawText || null,
            technicalMessage: result.technicalMessage || null,
            strategy: result.strategy,
          }
        : null)

      if (!response.ok || !result?.success || !normalizedResult?.strategy) {
        setStrategy(null)
        setError({
          message: result?.message || "AI strategy could not be generated.",
          suggestion: result?.suggestion || "Please try again or contact IT Support if the issue continues.",
          technical: result?.technicalMessage || null,
        })
        return
      }

      setStrategy(normalizedResult)
      await loadWorkspaceStatus()
    } catch (generationError) {
      setStrategy(null)
      setError({
        message: "AI strategy could not be generated.",
        suggestion: "Please try again or contact IT Support if the issue continues.",
        technical: generationError instanceof Error ? generationError.message : null,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(text)
      window.setTimeout(() => setCopiedField((current) => (current === text ? null : current)), 1400)
    } catch {
      setError({
        message: "The generated text could not be copied automatically.",
        suggestion: "Please copy the text manually and try again.",
      })
    }
  }

  if (!canViewPage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md border-red-200 bg-red-50">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <ShieldAlert className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-red-700">Access Denied</h2>
            <p className="text-sm text-red-600">GenAI Workspace is available to Marketing Operational and IT Support only.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Strategy Assistant</h1>
          <p className="text-sm text-muted-foreground">Generate business-ready campaign strategy, outreach copy, and follow-up actions from MaiinSight context.</p>
        </div>
        <Dialog open={alertsOpen} onOpenChange={setAlertsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Bell className="h-4 w-4" />
              Alerts
              {alerts.length > 0 ? <Badge>{alerts.length}</Badge> : null}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>AI Strategy Alerts</DialogTitle>
              <DialogDescription>Recent AI strategy generation notifications and assistant activity.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No AI alerts yet.
                </div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-border bg-secondary/20 p-4">
                    <p className="font-medium">{alert.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{alert.relativeTime}</p>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error ? (
        <BusinessErrorAlert
          title="AI Strategy Assistant"
          message={error.message}
          suggestion={error.suggestion}
          technicalDetails={error.technical}
          showTechnicalDetails={canViewTechnicalDetails}
        />
      ) : null}

      {isLoadingStatus ? (
        <PageSkeleton cards={2} lines={2} />
      ) : !aiStatus?.configured ? (
        <Card className="border-amber-200 bg-amber-50/70 shadow-sm">
          <CardHeader>
            <CardTitle>Setup Required</CardTitle>
            <CardDescription>{aiStatus?.providerLabel || "AI provider"} is not connected for MaiinSight strategy generation yet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <p>{aiStatus?.setupMessage || "AI strategy generation is not configured yet."}</p>
            <p className="text-muted-foreground">{aiStatus?.suggestion || "Please ask IT Support to configure AI provider credentials in the environment settings."}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Assistant Status</h3>
                    <p className="text-sm text-muted-foreground">
                      {strategy?.generatedAt
                        ? "Strategy draft is ready for review in this session."
                        : "No AI strategy generated yet."}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="w-fit border-primary/20 text-primary">
                  {strategy?.generatedAt
                    ? `Generated ${getRelativeTime(strategy.generatedAt)}`
                    : aiStatus.latestGenerationAt
                      ? `Last workspace activity ${getRelativeTime(aiStatus.latestGenerationAt)}`
                      : "Ready to generate"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {outreachContext ? (
            <Card className="border-sky-200 bg-sky-50/70 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4 text-sky-600" /> Low Occupancy Outreach Context</CardTitle>
                <CardDescription>Context passed from Fill Empty Sessions for outreach-focused AI strategy generation.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-white/80 bg-white/90 p-4 text-sm">
                  <p className="font-semibold text-slate-900">Customer Type</p>
                  <p>{outreachContext.customerTypeLabel}</p>
                  <p className="text-muted-foreground">{outreachContext.targetPriorityLabel}</p>
                </div>
                <div className="rounded-xl border border-white/80 bg-white/90 p-4 text-sm">
                  <p className="font-semibold text-slate-900">Session</p>
                  <p>{outreachContext.sessionName}</p>
                  <p className="text-muted-foreground">{outreachContext.slotTimeLabel || "Slot time not selected"}</p>
                  <p className="text-muted-foreground">{outreachContext.date}</p>
                </div>
                <div className="rounded-xl border border-white/80 bg-white/90 p-4 text-sm">
                  <p className="font-semibold text-slate-900">Priority Score</p>
                  <p>{outreachContext.targetPriorityScore}</p>
                  <p className="text-muted-foreground">{outreachContext.selectedSessionBookingCount} prior bookings</p>
                </div>
                <div className="rounded-xl border border-white/80 bg-white/90 p-4 text-sm">
                  <p className="font-semibold text-slate-900">Suggested Action</p>
                  <p>{outreachContext.suggestedAction}</p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle>Strategy Configuration</CardTitle>
              <CardDescription>Choose campaign parameters to generate a structured business recommendation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2 text-sm font-medium">
                  <span>Workspace Mode</span>
                  <select value={workspaceMode} onChange={(event) => setWorkspaceMode(event.target.value as "general" | "outreach")} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="general">General Strategy</option>
                    <option value="outreach">Low Occupancy Outreach</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium">
                  <span>Venue Type</span>
                  <select value={selectedVenueType} onChange={(event) => setSelectedVenueType(event.target.value as (typeof venueTypes)[number])} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {venueTypes.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium">
                  <span>Customer Segment</span>
                  <select value={selectedSegment} onChange={(event) => setSelectedSegment(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {targetSegments.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium">
                  <span>Campaign Objective</span>
                  <select value={selectedObjective} onChange={(event) => setSelectedObjective(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {campaignObjectives.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium">
                  <span>Offer Framework</span>
                  <select value={selectedIncentive} onChange={(event) => setSelectedIncentive(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {incentiveFrameworks.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium">
                  <span>Message Tone</span>
                  <select value={selectedTone} onChange={(event) => setSelectedTone(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {copywritingTones.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button className="gap-2" onClick={() => void handleGenerateStrategy()} disabled={!canGenerateAi || isGenerating || !aiStatus?.configured}>
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate Strategy
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setStrategy(null)} disabled={isGenerating}>
                  <RefreshCw className="h-4 w-4" />
                  Clear Result
                </Button>
              </div>
            </CardContent>
          </Card>

          {!strategy ? (
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <Sparkles className="h-10 w-10" />
                <div>
                  <p className="font-medium text-foreground">No AI strategy generated yet.</p>
                  <p className="text-sm">Generate a strategy to populate campaign objective, offer, channel, outreach copy, and follow-up actions.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle>Generated Strategy</CardTitle>
                    <CardDescription>
                      {formatExactDateTime(strategy.generatedAt)} ({getRelativeTime(strategy.generatedAt)})
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="w-fit border-primary/20 text-primary"
                  >
                    {strategy.provider === "azure"
                      ? "Generated with Azure OpenAI"
                      : "Generated with Gemini"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    Objective: {strategy.strategy.campaignObjective.slice(0, 42)}
                    {strategy.strategy.campaignObjective.length > 42 ? "..." : ""}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    Channel: WhatsApp
                  </Badge>
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    Tone: {selectedTone}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    Offer: {selectedIncentive}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <StrategyFieldCard label="Campaign Objective" value={strategy.strategy.campaignObjective} accent="blue" />
                  <StrategyFieldCard label="Target Customer Group" value={strategy.strategy.targetCustomerGroup} accent="emerald" />
                  <StrategyFieldCard label="Customer Behavior Reasoning" value={strategy.strategy.customerReasoning} accent="amber" />
                  <StrategyFieldCard label="Suggested Offer / Promo" value={strategy.strategy.suggestedOffer} accent="rose" />
                  <StrategyFieldCard label="Follow-Up Plan" value={strategy.strategy.followUpPlan} accent="slate" />
                  <StrategyFieldCard label="Expected Business Impact" value={strategy.strategy.expectedBusinessImpact} accent="blue" />
                </div>

                <div className="rounded-2xl border border-border bg-gradient-to-br from-background to-secondary/20 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Data Limitation / Caveat</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{strategy.strategy.dataLimitation}</p>
                </div>

                <div className="rounded-2xl border border-border bg-gradient-to-br from-slate-50 to-background p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">WhatsApp Message Draft</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleGenerateStrategy()}
                        disabled={!canGenerateAi || isGenerating || !aiStatus?.configured}
                        className="gap-2 rounded-full transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary hover:shadow-sm"
                      >
                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Regenerate Draft
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleCopy(strategy.strategy.whatsappMessage)}
                        className="gap-2 rounded-full transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary hover:shadow-sm"
                      >
                        {copiedField === strategy.strategy.whatsappMessage ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {copiedField === strategy.strategy.whatsappMessage ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-slate-700">{strategy.strategy.whatsappMessage}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
