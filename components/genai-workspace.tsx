"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { BusinessErrorAlert } from "@/components/business-error-alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardTitleTooltip, StateCard } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
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
  targetCustomerGroup?: string
  targetSegmentKey?: string
  targetSegmentLabel?: string
  targetVenueLabel?: string | null
  targetSessionLabel?: string | null
  targetDayKey?: string | null
  targetDayLabel?: string | null
  recommendedOfferType?: string
  recommendedOfferKey?: string
  customerReasoning: string
  suggestedOffer: string
  offerReasoning?: string
  evidenceUsed?: string[]
  executionPlan?: Array<{ timing: string; action: string; successCondition: string }>
  kpis?: Array<{ name: string; definition: string; targetDirection: string }>
  whatsappMessage: string
  followUpPlan: string
  stopCondition?: string
  expectedBusinessImpact: string
  dataLimitation: string | null
}

interface StrategyContext {
  analysis_period: {
    key: string
    label: string
    lookbackMonths: number
    startDate: string
    endDateExclusive: string
    displayEndDate: string
    timezone: string
  } | null
  selected_scope: { segmentKey: string; segmentLabel: string; analysisPeriodKey?: string | null }
  selected_segment_history: {
    customerCount: number
    averageRecencyDays: number | null
    averageFrequency: number | null
    averageMonetary: number | null
    membershipSharePct: number | null
    nonMembershipSharePct: number | null
    preferredVenueLabel: string | null
    preferredSessionLabel: string | null
  }
  membership_opportunity: { eligible: boolean; reason: string }
  revenue_history: {
    available: boolean
    totalRevenue: number | null
    averageMonthlyRevenue: number | null
    validRevenueTransactionCount: number
    analysisMonths: number
    currency: string
  } | null
  revenue_target_context: {
    available: boolean
    revenueTarget: number | null
    revenueGap: number | null
    revenueAchievementPct: number | null
    reason?: string | null
  }
  occupancy_history: {
    available: boolean
    averageOccupancyRate: number | null
    occupiedCourtHours: number | null
    availableCourtHours: number | null
    emptyCourtHours: number | null
    analysisPeriodKey: string
    reason?: string
  } | null
  promotion_usage_context: {
    available: boolean
    validBookingCount: number | null
    promotionUsageCount: number | null
    promotionUsagePct: number | null
    mostUsedPromotion: string | null
    reason?: string
  }
  business_opportunity_summary: {
    primaryOpportunity: string
    supportingOpportunities: string[]
    opportunityLevel: string
    supportingReasons: string[]
  }
  off_peak_opportunity?: {
    available: boolean
    lookbackMonths: number
    analysisStartDate: string | null
    analysisEndDateExclusive: string | null
    venueKey: string
    historicalBaseline: string | null
    recommendedPrimaryWindow: {
      dayKey: string
      dayLabel: string
      sessionKey: string
      sessionLabel: string
      occupiedCourtHours: number
      availableCourtHours: number
      emptyCourtHours: number
      occupancyRate: number
    } | null
    lowestOccupancyWindows: Array<{
      rank: number
      dayKey: string
      dayLabel: string
      sessionKey: string
      sessionLabel: string
      emptyCourtHours: number
      occupancyRate: number
    }>
    reason?: string
  }
  social_media_performance?: {
    available: boolean
    analysisPeriodKey?: string | null
    reason?: string
    postCount?: number
    averageEngagementRate?: number | null
    rankingMetric?: "engagementRate" | "views"
    contentTypeBreakdown?: Array<{
      key: string
      postCount: number
      averageViews: number | null
      averageReach: number | null
      averageEngagementRate: number | null
    }>
    contentLabelBreakdown?: Array<{
      key: string
      postCount: number
      averageViews: number | null
      averageReach: number | null
      averageEngagementRate: number | null
    }>
    topPerformingContent?: Array<{
      postedAt: string | null
      mediaType: string | null
      contentLabel: string
      captionExcerpt: string | null
      views: number | null
      reach: number | null
      likes: number | null
      comments: number | null
      shares: number | null
      saved: number | null
      engagementRate: number | null
    }>
    lowestPerformingContent?: Array<{
      postedAt: string | null
      mediaType: string | null
      contentLabel: string
      captionExcerpt: string | null
      views: number | null
      reach: number | null
      likes: number | null
      comments: number | null
      shares: number | null
      saved: number | null
      engagementRate: number | null
    }>
  }
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

export type AnalysisPeriodKey =
  | "one_month"
  | "three_months"
  | "six_months"
  | "twelve_months"

type WorkspaceModeKey = "general_strategy" | "low_occupancy_outreach"
type CampaignObjectiveKey =
  | "maximize_off_peak_occupancy"
  | "drive_revenue_growth"
  | "boost_social_media_conversion"
  | "increase_customer_retention"
  | "customer_reactivation"
  | "customer_reactivation_and_retention"

const venueTypes = ["All Venue", "Mini Soccer", "Basketball"] as const
const targetSegments = ["Prime Players", "Routine Players", "Growth Players", "Re-Engagement Players"]
const campaignObjectives: ReadonlyArray<{ key: CampaignObjectiveKey; label: string }> = [
  { key: "maximize_off_peak_occupancy", label: "Maximize Off-Peak Occupancy" },
  { key: "drive_revenue_growth", label: "Drive Revenue Growth" },
  { key: "boost_social_media_conversion", label: "Boost Social Media Conversion" },
  { key: "increase_customer_retention", label: "Increase Customer Retention" },
  { key: "customer_reactivation", label: "Customer Reactivation" },
]
const DEFAULT_GENERAL_OBJECTIVE: CampaignObjectiveKey = "maximize_off_peak_occupancy"
const LOW_OCCUPANCY_OBJECTIVE: CampaignObjectiveKey = "maximize_off_peak_occupancy"
const incentiveFrameworks = [
  { key: "ai_recommended", label: "AI Recommended" },
  { key: "time_based_discount", label: "Discount Campaign" },
  { key: "value_added_services", label: "Value Added Experience" },
  { key: "recurring_bundle", label: "Bundle Promotion" },
  { key: "loyalty_benefit", label: "Loyalty Reward" },
]
const copywritingTones = [
  "Casual & Community Hook",
  "Urgent Promo Tone",
  "Professional Tone",
]
const selectTriggerClassName =
  "h-12 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm font-medium text-foreground shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:ring-2 focus:ring-primary/15"
const selectTriggerClassNameCompact =
  "h-12 w-full rounded-xl border border-border/70 bg-background px-4 shadow-sm transition hover:border-primary/35 focus:ring-2 focus:ring-primary/15"
export const analysisPeriods: ReadonlyArray<{
  key: AnalysisPeriodKey
  label: string
}> = [
  { key: "one_month", label: "1 Month" },
  { key: "three_months", label: "3 Months" },
  { key: "six_months", label: "6 Months" },
  { key: "twelve_months", label: "12 Months" },
]

const formatIdr = (value: number | null) =>
  value == null
    ? "Not available"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(value)

const formatMetric = (value: number | null, suffix = "") =>
  value == null ? "Not available" : `${value}${suffix}`

const formatDisplayDate = (value?: string | null) => {
  if (!value) return "Date not available"
  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value
  const date = new Date(normalizedValue)
  if (Number.isNaN(date.getTime())) return "Date not available"
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

const formatAnalysisPeriod = (period: StrategyContext["analysis_period"]) =>
  period
    ? `${formatDisplayDate(period.startDate)}–${formatDisplayDate(period.displayEndDate)} · ${period.label}`
    : "Analysis period not available"

function MetricTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-background p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 break-words text-lg font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  )
}

const formatOpportunityKey = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

const CONTENT_TYPE_LABELS: Record<string, string> = {
  REELS: "Reels",
  REEL: "Reels",
  FEED: "Feed",
  IMAGE: "Feed (Photo)",
  CAROUSEL_ALBUM: "Feed (Carousel)",
  VIDEO: "Video",
  Unknown: "Unknown",
}
const formatContentTypeLabel = (value?: string | null) =>
  (value && CONTENT_TYPE_LABELS[value]) || value || "Unknown"

const CONTENT_LABEL_LABELS: Record<string, string> = {
  content_promotion: "Promotion",
  content_advertisement: "General Content",
}
const formatContentLabelValue = (value?: string | null) =>
  (value && CONTENT_LABEL_LABELS[value]) || (value ? formatOpportunityKey(value) : "Unknown")

const formatTargetDirection = (value: string) => ({
  increase: "increase",
  decrease: "decrease",
  maintain: "maintain",
}[value] || value)

const segmentKeys: Record<string, string> = {
  "Prime Players": "prime",
  "Routine Players": "routine",
  "Growth Players": "growth",
  "Re-Engagement Players": "re_engagement",
}

const venueKeys: Record<string, string> = {
  "All Venue": "all",
  "Mini Soccer": "mini_soccer",
  Basketball: "basketball",
}

const normalizeLegacyStrategy = (strategy: StrategyPayload): StrategyPayload => ({
  ...strategy,
  targetSegmentLabel: strategy.targetSegmentLabel || strategy.targetCustomerGroup || "Not available",
  targetSegmentKey: strategy.targetSegmentKey || "",
  targetDayKey: strategy.targetDayKey || null,
  targetDayLabel: strategy.targetDayLabel || null,
  recommendedOfferType: strategy.recommendedOfferType || "Suggested Offer",
  offerReasoning: strategy.offerReasoning || strategy.customerReasoning || "Not available",
  evidenceUsed: Array.isArray(strategy.evidenceUsed) ? strategy.evidenceUsed : [],
  executionPlan: Array.isArray(strategy.executionPlan) ? strategy.executionPlan : [],
  kpis: Array.isArray(strategy.kpis) ? strategy.kpis : [],
  stopCondition: strategy.stopCondition || "Not available",
  dataLimitation: strategy.dataLimitation || null,
})

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
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceModeKey>("general_strategy")
  const [outreachContext, setOutreachContext] = useState<LowOccupancyOutreachContext | null>(null)
  const [selectedVenueType, setSelectedVenueType] = useState<(typeof venueTypes)[number]>("All Venue")
  const [selectedSegment, setSelectedSegment] = useState("Re-Engagement Players")
  const [selectedObjective, setSelectedObjective] = useState<CampaignObjectiveKey>(DEFAULT_GENERAL_OBJECTIVE)
  const [lastGeneralStrategyObjective, setLastGeneralStrategyObjective] = useState<CampaignObjectiveKey>(DEFAULT_GENERAL_OBJECTIVE)
  const [selectedIncentive, setSelectedIncentive] = useState("ai_recommended")
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false)
  const [selectedTone, setSelectedTone] = useState("Casual & Community Hook")
  const [analysisPeriodKey, setAnalysisPeriodKey] =
    useState<AnalysisPeriodKey>("three_months")
  const [aiStatus, setAiStatus] = useState<AiStatusResponse["data"] | null>(null)
  const [strategy, setStrategy] = useState<NormalizedStrategyPayload | null>(null)
  const [strategyContext, setStrategyContext] = useState<StrategyContext | null>(null)
  const [isLoadingContext, setIsLoadingContext] = useState(false)
  const [contextError, setContextError] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<NotificationItem[]>([])
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [refineNotes, setRefineNotes] = useState("")
  const [refineMessage, setRefineMessage] = useState<string | null>(null)
  const [showDetailedContext, setShowDetailedContext] = useState(false)
  const [askPrompt, setAskPrompt] = useState("")
  const [isAsking, setIsAsking] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)
  const [askResult, setAskResult] = useState<{
    provider: string
    model: string
    answer: string
    generatedAt: string
  } | null>(null)
  const [error, setError] = useState<{ message: string; suggestion?: string | null; technical?: string | null } | null>(null)

  useEffect(() => {
    setStoredUserRole(normalizeRole(userRoleFromProps) || getStoredRole())
  }, [userRoleFromProps])

  useEffect(() => {
    const applyContext = (context: LowOccupancyOutreachContext | null) => {
      if (!context) return
      setOutreachContext(context)
      setWorkspaceMode("low_occupancy_outreach")
      setSelectedObjective((currentObjective) => {
        setLastGeneralStrategyObjective(currentObjective)
        return LOW_OCCUPANCY_OBJECTIVE
      })
      setStrategy(null)
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
  const canViewPage = canAccessFeature(activeRole, "viewAiStrategy")
  const canGenerateAi = canAccessFeature(activeRole, "generateAiStrategy")
  const canViewTechnicalDetails = activeRole === "it_support"

  const handleWorkspaceModeChange = (nextMode: WorkspaceModeKey) => {
    if (nextMode === workspaceMode) return

    if (nextMode === "low_occupancy_outreach") {
      setLastGeneralStrategyObjective(selectedObjective)
      setSelectedObjective(LOW_OCCUPANCY_OBJECTIVE)
    } else {
      setSelectedObjective(lastGeneralStrategyObjective || DEFAULT_GENERAL_OBJECTIVE)
    }

    setWorkspaceMode(nextMode)
    setStrategy(null)
    setStrategyContext(null)
    setContextError(null)
  }

  const handleGeneralObjectiveChange = (objective: CampaignObjectiveKey) => {
    setSelectedObjective(objective)
    setLastGeneralStrategyObjective(objective)
    setStrategy(null)
  }

  const selectedObjectiveLabel = campaignObjectives.find((objective) => objective.key === selectedObjective)?.label || selectedObjective
  const resolvedOfferFramework = advancedSettingsOpen ? selectedIncentive : "ai_recommended"
  const resolvedOfferFrameworkLabel = incentiveFrameworks.find((item) => item.key === resolvedOfferFramework)?.label || "AI Recommended"


  const loadWorkspaceStatus = async () => {
    try {
      setIsLoadingStatus(true)
      setError(null)

      const [statusResponse, alertsResponse, latestResponse] = await Promise.all([
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
        fetch(getApiUrl("/ai-strategy/latest"), {
          method: "GET",
          headers: getAuthHeaders(),
          cache: "no-store",
        }),
      ])

      const statusResult: AiStatusResponse | null = await statusResponse.json().catch(() => null)
      const alertsResult = await alertsResponse.json().catch(() => null)
      const latestResult = await latestResponse.json().catch(() => null)

      if (!statusResponse.ok || !statusResult?.success || !statusResult.data) {
        throw new Error(statusResult?.message || "AI strategy status could not be loaded.")
      }

      setAiStatus(statusResult.data)
      if (latestResponse.ok && latestResult?.success && latestResult.data?.strategy) {
        setStrategy({
          ...latestResult.data,
          generatedAt: String(latestResult.data.generatedAt),
          strategy: normalizeLegacyStrategy(latestResult.data.strategy),
        })
      }

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
    if (workspaceMode === "low_occupancy_outreach") {
      return {
        selected_scope: {
          workspaceModeKey: "low_occupancy_outreach",
          venueKey: venueKeys[selectedVenueType],
          venueLabel: selectedVenueType,
          segmentKey: segmentKeys[outreachContext?.rfmSegmentName || selectedSegment],
          segmentLabel: outreachContext?.rfmSegmentName || selectedSegment,
          sessionKey: outreachContext?.sessionName.toLowerCase() || "all",
          sessionLabel: outreachContext?.sessionName || "All Sessions",
          campaignObjectiveKey: LOW_OCCUPANCY_OBJECTIVE,
          campaignObjectiveLabel: "Maximize Off-Peak Occupancy",
          offerFrameworkKey: resolvedOfferFramework,
          offerFrameworkLabel: resolvedOfferFrameworkLabel,
          messageToneKey: selectedTone.toLowerCase().replace(/[\s&-]+/g, "_"),
          messageToneLabel: selectedTone,
          channel: "WhatsApp",
          campaignDate: outreachContext?.date || null,
          analysisPeriodKey,
          slotTimeLabel: outreachContext?.slotTimeLabel || null,
        },
        customer_segment_summary: {
          ...(outreachContext ? {
            targetPriorityLabel: outreachContext.targetPriorityLabel,
            targetPriorityScore: outreachContext.targetPriorityScore,
            customerTypeLabel: outreachContext.customerTypeLabel,
            selectedSessionBookingCount: outreachContext.selectedSessionBookingCount,
          } : { segmentName: selectedSegment }),
        },
        business_context: {
          date: outreachContext?.date || null,
          sessionName: outreachContext?.sessionName || "All Sessions",
          sessionStartHour: outreachContext?.sessionStartHour || null,
          sessionEndHour: outreachContext?.sessionEndHour || null,
          slotTimeLabel: outreachContext?.slotTimeLabel || null,
          courtType: outreachContext?.courtType || venueKeys[selectedVenueType],
          suggestedAction: outreachContext?.suggestedAction || null,
          lowOccupancyTargeting: true,
        },
        promotion_context: {
          incentiveFramework: resolvedOfferFramework,
          copywritingTone: selectedTone,
        },
        recommended_customer_context: {
          customerLabel: outreachContext?.customerTypeLabel || null,
          targetPriorityLabel: outreachContext?.targetPriorityLabel || null,
        },
      }
    }

    return {
      selected_scope: {
        workspaceModeKey: "general_strategy",
        venueKey: venueKeys[selectedVenueType],
        venueLabel: selectedVenueType,
        segmentKey: segmentKeys[selectedSegment],
        segmentLabel: selectedSegment,
        sessionKey: "all",
        sessionLabel: "All Sessions",
        campaignObjectiveKey: selectedObjective,
        campaignObjectiveLabel: selectedObjectiveLabel,
        offerFrameworkKey: resolvedOfferFramework,
        offerFrameworkLabel: resolvedOfferFrameworkLabel,
        messageToneKey: selectedTone.toLowerCase().replace(/[\s&-]+/g, "_"),
        messageToneLabel: selectedTone,
        channel: "WhatsApp",
        analysisPeriodKey,
      },
      customer_segment_summary: {
        segmentName: selectedSegment,
      },
      business_context: {
        venueType: selectedVenueType,
        objective: selectedObjectiveLabel,
      },
      promotion_context: {
        incentiveFramework: resolvedOfferFramework,
        copywritingTone: selectedTone,
      },
    }
  }, [analysisPeriodKey, outreachContext, resolvedOfferFramework, resolvedOfferFrameworkLabel, selectedObjective, selectedObjectiveLabel, selectedSegment, selectedTone, selectedVenueType, workspaceMode])

  useEffect(() => {
    if (!canViewPage || !aiStatus?.configured) return
    const controller = new AbortController()
    const loadContext = async () => {
      setIsLoadingContext(true)
      setContextError(null)
      setStrategyContext(null)
      const response = await fetch(getApiUrl("/ai-strategy/context"), {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.success) {
        setStrategyContext(null)
        setContextError(result?.message || "Selected segment profile is not available.")
      } else {
        setStrategyContext(result.data)
      }
      setIsLoadingContext(false)
    }
    void loadContext().catch((loadError) => {
      if ((loadError as Error).name !== "AbortError") {
        setStrategyContext(null)
        setContextError("Selected segment profile could not be loaded.")
        setIsLoadingContext(false)
      }
    })
    return () => controller.abort()
  }, [aiStatus?.configured, canViewPage, requestPayload])

  const handleGenerateStrategy = async (userNotes?: string) => {
    if (!canGenerateAi) {
      setError({
        message: "AI strategy generation is available to Marketing Operational and IT Support only.",
        suggestion: "Please sign in with a Marketing Operational or IT Support account.",
      })
      return false
    }

    try {
      setIsGenerating(true)
      setError(null)
      setRefineMessage(null)

      const response = await fetch(getApiUrl("/ai-strategy/generate"), {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...requestPayload,
          ...(userNotes && userNotes.trim() ? { userNotes: userNotes.trim() } : {}),
        }),
      })

      const result: StrategyResponse | null = await response.json().catch(() => null)
      const normalizedResult = result?.data || (result?.strategy && result?.provider && result?.generatedAt
        ? {
            provider: result.provider,
            model: result.model || "",
            generatedAt: result.generatedAt,
            rawText: result.rawText || null,
            technicalMessage: result.technicalMessage || null,
            strategy: normalizeLegacyStrategy(result.strategy),
          }
        : null)

      if (!response.ok || !result?.success || !normalizedResult?.strategy) {
        setStrategy(null)
        setError({
          message: result?.message || "AI strategy could not be generated.",
          suggestion: result?.suggestion || "Please try again or contact IT Support if the issue continues.",
          technical: result?.technicalMessage || null,
        })
        return false
      }

      setStrategy({ ...normalizedResult, strategy: normalizeLegacyStrategy(normalizedResult.strategy) })
      await loadWorkspaceStatus()
      return true
    } catch (generationError) {
      setStrategy(null)
      setError({
        message: "AI strategy could not be generated.",
        suggestion: "Please try again or contact IT Support if the issue continues.",
        technical: generationError instanceof Error ? generationError.message : null,
      })
      return false
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAskAi = async () => {
    if (!canGenerateAi) {
      setAskError("Ask the AI is available to Marketing Operational and IT Support only.")
      return
    }
    if (!askPrompt.trim()) return
    if (!aiStatus?.configured || !strategyContext) {
      setAskError("AI assistant is not ready yet. Check AI configuration and selected segment profile.")
      return
    }

    try {
      setIsAsking(true)
      setAskError(null)
      setAskResult(null)

      const response = await fetch(getApiUrl("/ai-strategy/ask"), {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...requestPayload,
          prompt: askPrompt.trim(),
        }),
      })

      const result: {
        success: boolean
        message?: string
        suggestion?: string | null
        data?: { provider: string; model: string; answer: string; generatedAt: string }
      } | null = await response.json().catch(() => null)

      if (!response.ok || !result?.success || !result?.data?.answer) {
        setAskError(
          result?.message ||
            result?.suggestion ||
            "The AI assistant could not answer right now. Please try again."
        )
        return
      }

      setAskResult(result.data)
    } catch (askRequestError) {
      setAskError("The AI assistant could not answer right now. Please try again.")
    } finally {
      setIsAsking(false)
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
        <StateCard
          state="access-denied"
          title="Access Denied"
          description="GenAI Workspace is available to Marketing Operational and IT Support only."
          className="max-w-md"
        />
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
        <StateCard state="loading" title="Loading AI assistant status..." minHeight="min-h-[180px]" />
      ) : !aiStatus?.configured ? (
        <StateCard
          state="warning"
          title="Setup Required"
          description={`${aiStatus?.providerLabel || "AI provider"} is not connected for MaiinSight strategy generation yet.`}
        />
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

          {workspaceMode === "low_occupancy_outreach" && outreachContext ? (
            <Card className="border-sky-100 bg-sky-50/45 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitleTooltip
                  title={
                    outreachContext.intent === "campaign"
                      ? "Campaign Context"
                      : "Low Occupancy Outreach Context"
                  }
                  tooltip={
                    outreachContext.intent === "campaign"
                      ? "Context passed from Fill Empty Sessions to generate a session-level AI campaign strategy."
                      : "Context passed from Fill Empty Sessions for outreach-focused AI strategy generation."
                  }
                  className="text-base"
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="min-w-0 text-sm">
                    <p className="text-xs font-medium text-muted-foreground">Target Session</p>
                    <p className="mt-1 font-semibold text-slate-900">{outreachContext.sessionName}</p>
                    {outreachContext.slotTimeLabel ? <p className="text-muted-foreground">{outreachContext.slotTimeLabel}</p> : null}
                  </div>
                  <div className="min-w-0 text-sm">
                    <p className="text-xs font-medium text-muted-foreground">Priority</p>
                    <p className="mt-1 font-semibold text-slate-900">{outreachContext.targetPriorityLabel}</p>
                    <p className="text-muted-foreground">Score {outreachContext.targetPriorityScore}</p>
                  </div>
                  <div className="min-w-0 text-sm">
                    <p className="text-xs font-medium text-muted-foreground">Historical Activity</p>
                    <p className="mt-1 font-semibold text-slate-900">{outreachContext.selectedSessionBookingCount} prior bookings</p>
                  </div>
                  <div className="min-w-0 text-sm">
                    <p className="text-xs font-medium text-muted-foreground">Reference Date</p>
                    <p className="mt-1 font-semibold text-slate-900">{formatDisplayDate(outreachContext.date)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
          <Card className="border-border bg-card shadow-sm">
  <CardHeader>
    <CardTitleTooltip title="Strategy Configuration" tooltip="Choose campaign parameters to generate a structured business recommendation." />
    <p className="max-w-2xl text-sm text-muted-foreground">Tentukan tujuan bisnis Anda. MaiinSight AI akan menganalisis data dan memilih strategi serta penawaran yang paling sesuai.</p>
  </CardHeader>

  <CardContent className="space-y-5">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {/* Workspace Mode */}
      <label className="space-y-2 text-sm font-medium">
        <span>Workspace Mode</span>
        <Select value={workspaceMode} disabled={!canGenerateAi} onValueChange={(value) => handleWorkspaceModeChange(value as WorkspaceModeKey)}>
          <SelectTrigger className={selectTriggerClassNameCompact}><SelectValue placeholder="Select workspace mode" /></SelectTrigger>
          <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg">
            <SelectItem value="general_strategy">General Strategy</SelectItem>
            <SelectItem value="low_occupancy_outreach">Low Occupancy Outreach</SelectItem>
          </SelectContent>
        </Select>
      </label>

      <label className="space-y-2 text-sm font-medium">
          <span>Analysis Period</span>
          <Select
            value={analysisPeriodKey}
            disabled={!canGenerateAi}
            onValueChange={(value) =>
              setAnalysisPeriodKey(value as AnalysisPeriodKey)
            }
          >
            <SelectTrigger className={selectTriggerClassName}>
              <SelectValue placeholder="Select analysis period" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg"
            >
              {analysisPeriods.map((period) => (
                <SelectItem key={period.key} value={period.key}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
      </label>

      {/* Venue Type */}
      <label className="space-y-2 text-sm font-medium">
        <span>Venue Type</span>

        <Select
          value={selectedVenueType}
          disabled={!canGenerateAi}
          onValueChange={(value) =>
            setSelectedVenueType(value as (typeof venueTypes)[number])
          }
        >
          <SelectTrigger className={selectTriggerClassName}>
            <SelectValue placeholder="Select venue type" />
          </SelectTrigger>

          <SelectContent
            position="popper"
            className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg"
          >
            {venueTypes.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      {/* Customer Segment */}
      <label className="space-y-2 text-sm font-medium">
        <span>Customer Segment</span>

        <Select value={selectedSegment} onValueChange={setSelectedSegment} disabled={!canGenerateAi}>
          <SelectTrigger className={selectTriggerClassName}>
            <SelectValue placeholder="Select customer segment" />
          </SelectTrigger>

          <SelectContent
            position="popper"
            className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg"
          >
            {targetSegments.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      {/* Campaign Objective */}
      {workspaceMode === "low_occupancy_outreach" ? (
        <div className="space-y-2 text-sm font-medium">
          <span>Campaign Objective</span>
          <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-2.5">
            <p className="text-sm font-medium text-primary">Maximize Off-Peak Occupancy</p>
            <p className="mt-0.5 text-xs font-normal text-muted-foreground">Objective is set automatically in Low Occupancy Outreach mode.</p>
          </div>
        </div>
      ) : (
        <label className="space-y-2 text-sm font-medium">
          <span>Campaign Objective</span>
          <Select value={selectedObjective} onValueChange={(value) => handleGeneralObjectiveChange(value as CampaignObjectiveKey)} disabled={!canGenerateAi}>
          <SelectTrigger className={selectTriggerClassName}>
            <SelectValue placeholder="Select campaign objective" />
          </SelectTrigger>

          <SelectContent
            position="popper"
            className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg"
          >
            {campaignObjectives.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
          </Select>
        </label>
      )}

      {/* Offer Framework */}
      <Accordion
        type="single"
        collapsible
        value={advancedSettingsOpen ? "advanced-settings" : ""}
        onValueChange={(value) => setAdvancedSettingsOpen(value === "advanced-settings")}
        className="md:col-span-2 xl:col-span-3"
      >
        <AccordionItem value="advanced-settings" className="rounded-xl border border-border/70 bg-secondary/20 px-4">
          <AccordionTrigger className="py-3.5 text-foreground hover:no-underline">
            <span><span className="block">Advanced Strategy Settings</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">Optional · AI Recommended is used while this panel is closed</span></span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4 pt-1 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                <span>Offer Framework</span>
                <Select value={selectedIncentive} onValueChange={setSelectedIncentive} disabled={!canGenerateAi}>
                  <SelectTrigger className={selectTriggerClassNameCompact}><SelectValue placeholder="Select offer framework" /></SelectTrigger>
                  <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg">
                    {incentiveFrameworks.map((option) => <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>Message Tone</span>
                <Select value={selectedTone} onValueChange={setSelectedTone} disabled={!canGenerateAi}>
                  <SelectTrigger className={selectTriggerClassNameCompact}><SelectValue placeholder="Select message tone" /></SelectTrigger>
                  <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] rounded-xl border bg-background shadow-lg">
                    {copywritingTones.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>

    <section className="space-y-5" aria-labelledby="selected-segment-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-primary">Audience Profile</p>
          <h2 id="selected-segment-heading" className="mt-1 text-lg font-semibold text-foreground">Selected Segment: {selectedSegment}</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-fit gap-2 rounded-full"
          onClick={() => setShowDetailedContext((current) => !current)}
          disabled={!strategyContext || Boolean(contextError)}
        >
          {showDetailedContext ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showDetailedContext ? "Hide details" : "Show details"}
        </Button>
      </div>
      {isLoadingContext ? (
        <div className="space-y-5" aria-label="Loading segment summary">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-xl" />)}</div>
          <Skeleton className="h-44 rounded-2xl" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-xl" />)}</div>
        </div>
      ) : contextError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{contextError} Generation is disabled.</div>
      ) : strategyContext ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="Customers" value={strategyContext.selected_segment_history.customerCount} />
            <MetricTile label="Average Recency" value={strategyContext.selected_segment_history.averageRecencyDays == null ? "Recency data not available" : `${strategyContext.selected_segment_history.averageRecencyDays} days`} />
            <MetricTile label="Average Frequency" value={strategyContext.selected_segment_history.averageFrequency ?? "Frequency data not available"} />
            <MetricTile label="Average Monetary" value={strategyContext.selected_segment_history.averageMonetary == null ? "Monetary data not available" : formatIdr(strategyContext.selected_segment_history.averageMonetary)} />
          </div>

          {strategyContext.membership_opportunity.eligible ? (
            <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-semibold text-emerald-900">Membership Opportunity</p><p className="text-xs text-emerald-800">{strategyContext.membership_opportunity.reason}</p></div>
              <Badge className="w-fit bg-emerald-700 text-white">Eligible</Badge>
            </div>
          ) : null}

          {showDetailedContext ? (
          <Accordion type="single" collapsible>
            <AccordionItem value="segment-details" className="rounded-xl border border-border/70 bg-secondary/15 px-4">
              <AccordionTrigger className="py-3.5 hover:no-underline">View Segment Details</AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricTile label="Membership" value={strategyContext.selected_segment_history.membershipSharePct == null ? "Membership data not available" : `${strategyContext.selected_segment_history.membershipSharePct}%`} />
                  <MetricTile label="Non-membership" value={strategyContext.selected_segment_history.nonMembershipSharePct == null ? "Non-membership data not available" : `${strategyContext.selected_segment_history.nonMembershipSharePct}%`} />
                  <MetricTile label="Preferred Venue" value={strategyContext.selected_segment_history.preferredVenueLabel || "Venue preference not available"} />
                  <MetricTile label="Preferred Session" value={strategyContext.selected_segment_history.preferredSessionLabel || "Session preference not available"} />
                  <MetricTile label="Promotion Usage Count" value={strategyContext.promotion_usage_context.promotionUsageCount ?? "Usage data not available"} />
                </div>
                {!strategyContext.membership_opportunity.eligible ? <p className="mt-3 text-xs text-muted-foreground">Membership conversion is not relevant for this segment. {strategyContext.membership_opportunity.reason}</p> : null}
                {!strategyContext.promotion_usage_context.available ? <p className="mt-1 text-xs text-muted-foreground">{strategyContext.promotion_usage_context.reason || "No promotion usage is recorded for this segment and period."}</p> : null}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          ) : null}
          {selectedObjective === "maximize_off_peak_occupancy" ? (
            <section aria-labelledby="primary-opportunity-heading" className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-emerald-50/55 shadow-sm">
              <div className="border-b border-emerald-200/70 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2 text-emerald-900"><Target className="h-4 w-4" aria-hidden="true" /><h3 id="primary-opportunity-heading" className="font-semibold">Primary Opportunity</h3></div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-800/80"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />Analysis Period: {formatAnalysisPeriod(strategyContext.analysis_period)}</p>
              </div>
              {strategyContext.off_peak_opportunity?.available && strategyContext.off_peak_opportunity.recommendedPrimaryWindow ? (
                <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><p className="text-2xl font-semibold tracking-tight text-emerald-950">{strategyContext.off_peak_opportunity.recommendedPrimaryWindow.dayLabel} · Session {strategyContext.off_peak_opportunity.recommendedPrimaryWindow.sessionLabel}</p><Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">Low occupancy</Badge></div>
                    <p className="mt-2 text-sm text-emerald-900/75">This session is the top priority for the off-peak campaign.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-2xl font-semibold text-emerald-950">{strategyContext.off_peak_opportunity.recommendedPrimaryWindow.occupancyRate}%</p><p className="text-xs text-emerald-900/65">occupancy</p></div>
                    <div><p className="text-2xl font-semibold text-emerald-950">{strategyContext.off_peak_opportunity.recommendedPrimaryWindow.emptyCourtHours} Slots</p><p className="text-xs text-emerald-900/65">empty courts</p></div>
                  </div>
                </div>
              ) : <p className="px-5 py-6 text-sm text-muted-foreground">Historical occupancy data is not sufficient yet.</p>}
            </section>
          ) : null}

          <div className="rounded-xl border border-border/70 bg-sky-50/40 p-4">
            <p className="font-semibold">Business Opportunity Summary</p>
            <p className="mt-1 text-sm">
              {formatOpportunityKey(strategyContext.business_opportunity_summary.primaryOpportunity)}
              {" · "}
              {formatOpportunityKey(strategyContext.business_opportunity_summary.opportunityLevel)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{selectedSegment} holds strategic value, with the top off-peak window as the focus for the next campaign.</p>
          </div>

          {showDetailedContext && strategyContext.off_peak_opportunity?.available && strategyContext.off_peak_opportunity.lowestOccupancyWindows.length > 1 ? (
            <section aria-labelledby="alternative-heading">
              <h3 id="alternative-heading" className="text-base font-semibold">Alternative Sessions</h3>
              <div className="mt-3 divide-y rounded-xl border border-border/70 bg-background px-4">
                {strategyContext.off_peak_opportunity.lowestOccupancyWindows.filter((window) => window.dayKey !== strategyContext.off_peak_opportunity?.recommendedPrimaryWindow?.dayKey || window.sessionKey !== strategyContext.off_peak_opportunity?.recommendedPrimaryWindow?.sessionKey).slice(0, 2).map((window) => (
                  <div key={`${window.dayKey}-${window.sessionKey}`} className="grid gap-1 py-3 text-sm sm:grid-cols-[2rem_1fr_auto_auto] sm:items-center sm:gap-4"><span className="font-semibold text-primary">{window.rank}.</span><span className="font-medium">{window.dayLabel} · {window.sessionLabel}</span><span className="text-muted-foreground">{window.occupancyRate}% occupancy</span><span className="text-muted-foreground">{window.emptyCourtHours} empty slots</span></div>
                ))}
              </div>
              {strategyContext.off_peak_opportunity.lowestOccupancyWindows.length > 3 ? (
                <Accordion type="single" collapsible className="mt-2"><AccordionItem value="all-sessions"><AccordionTrigger className="py-3 text-primary hover:no-underline">View All Sessions</AccordionTrigger><AccordionContent><div className="space-y-2">{strategyContext.off_peak_opportunity.lowestOccupancyWindows.filter((window) => window.dayKey !== strategyContext.off_peak_opportunity?.recommendedPrimaryWindow?.dayKey || window.sessionKey !== strategyContext.off_peak_opportunity?.recommendedPrimaryWindow?.sessionKey).slice(2).map((window) => <div key={`${window.dayKey}-${window.sessionKey}`} className="flex flex-col gap-1 rounded-lg bg-secondary/25 px-3 py-2 text-sm sm:flex-row sm:justify-between"><span>{window.rank}. {window.dayLabel} · {window.sessionLabel}</span><span className="text-muted-foreground">{window.occupancyRate}% · {window.emptyCourtHours} empty slots</span></div>)}</div></AccordionContent></AccordionItem></Accordion>
              ) : null}
            </section>
          ) : null}

          {showDetailedContext ? (
            <>
              <section aria-labelledby="supporting-metrics-heading">
                <h3 id="supporting-metrics-heading" className="text-base font-semibold">Key Supporting Data</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {(selectedObjective === "boost_social_media_conversion"
                    ? [
                        ["Posts Published", strategyContext.social_media_performance?.available ? `${strategyContext.social_media_performance.postCount} posts` : "No content in this period"],
                        ["Average Engagement Rate", strategyContext.social_media_performance?.available ? formatMetric(strategyContext.social_media_performance.averageEngagementRate ?? null, "%") : "Data not available"],
                        ["Best Content Type", strategyContext.social_media_performance?.contentTypeBreakdown?.[0] ? `${formatContentTypeLabel(strategyContext.social_media_performance.contentTypeBreakdown[0].key)} · ${formatMetric(strategyContext.social_media_performance.contentTypeBreakdown[0].averageEngagementRate, "%")}` : "Data not available"],
                        ["Best Content Label", strategyContext.social_media_performance?.contentLabelBreakdown?.[0] ? `${formatContentLabelValue(strategyContext.social_media_performance.contentLabelBreakdown[0].key)} · ${formatMetric(strategyContext.social_media_performance.contentLabelBreakdown[0].averageEngagementRate, "%")}` : "Data not available"],
                      ]
                    : [
                        ["Total Revenue", formatIdr(strategyContext.revenue_history?.totalRevenue ?? null)],
                        ["Average Occupancy", formatMetric(strategyContext.occupancy_history?.averageOccupancyRate ?? null, "%")],
                        ["Historical Empty Court Slots", strategyContext.occupancy_history?.emptyCourtHours == null ? "Court inventory not available" : `${strategyContext.occupancy_history.emptyCourtHours} slots`],
                        ["Promotion Usage", strategyContext.promotion_usage_context.promotionUsagePct == null ? "No promotions recorded in this period" : `${strategyContext.promotion_usage_context.promotionUsagePct}%`],
                      ]
                  ).map(([label, value]) => (
                    <MetricTile key={String(label)} label={String(label)} value={value} />
                  ))}
                </div>
              </section>
              {selectedObjective === "boost_social_media_conversion"
                ? (!strategyContext.social_media_performance?.available ? <p className="text-xs text-muted-foreground">{strategyContext.social_media_performance?.reason || "Not enough Instagram performance data yet."}</p> : null)
                : (!strategyContext.occupancy_history?.available ? <p className="text-xs text-muted-foreground">{strategyContext.occupancy_history?.reason || "Historical occupancy data is not sufficient yet."}</p> : null)}
            </>
          ) : null}

          {showDetailedContext ? (
          <Accordion type="single" collapsible>
            <AccordionItem value="complete-data" className="rounded-xl border border-border/70 bg-secondary/15 px-4">
              <AccordionTrigger className="py-3.5 hover:no-underline">View Full Data</AccordionTrigger>
              <AccordionContent>
                {selectedObjective === "boost_social_media_conversion" ? (
                  strategyContext.social_media_performance?.available ? (
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border bg-background p-3">
                          <p className="text-xs font-semibold text-muted-foreground">Performance by Content Type</p>
                          <ul className="mt-2 space-y-1.5 text-sm">
                            {strategyContext.social_media_performance.contentTypeBreakdown?.map((group) => (
                              <li key={group.key} className="flex items-center justify-between gap-2">
                                <span>{formatContentTypeLabel(group.key)}</span>
                                <span className="text-muted-foreground">{group.postCount} posts · {formatMetric(group.averageEngagementRate, "% engagement")}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-xl border bg-background p-3">
                          <p className="text-xs font-semibold text-muted-foreground">Performance by Content Label</p>
                          <ul className="mt-2 space-y-1.5 text-sm">
                            {strategyContext.social_media_performance.contentLabelBreakdown?.map((group) => (
                              <li key={group.key} className="flex items-center justify-between gap-2">
                                <span>{formatContentLabelValue(group.key)}</span>
                                <span className="text-muted-foreground">{group.postCount} posts · {formatMetric(group.averageEngagementRate, "% engagement")}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Best Performing Content</p>
                        <div className="mt-2 divide-y rounded-xl border border-border/70 bg-background px-3">
                          {strategyContext.social_media_performance.topPerformingContent?.map((post, index) => (
                            <div key={`top-${post.postedAt}-${index}`} className="py-2.5 text-sm">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{formatContentTypeLabel(post.mediaType)}</span>
                                <Badge variant="outline" className="text-xs">{formatContentLabelValue(post.contentLabel)}</Badge>
                                <span className="text-xs text-muted-foreground">{formatDisplayDate(post.postedAt)}</span>
                              </div>
                              {post.captionExcerpt ? <p className="mt-1 text-xs text-muted-foreground">{post.captionExcerpt}</p> : null}
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatMetric(post.engagementRate, "% engagement")} · {post.views ?? "-"} views · {post.reach ?? "-"} reach
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {strategyContext.social_media_performance.lowestPerformingContent?.length ? (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">Lowest Performing Content (Avoid This Pattern)</p>
                          <div className="mt-2 divide-y rounded-xl border border-border/70 bg-background px-3">
                            {strategyContext.social_media_performance.lowestPerformingContent.map((post, index) => (
                              <div key={`low-${post.postedAt}-${index}`} className="py-2.5 text-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium">{formatContentTypeLabel(post.mediaType)}</span>
                                  <Badge variant="outline" className="text-xs">{formatContentLabelValue(post.contentLabel)}</Badge>
                                  <span className="text-xs text-muted-foreground">{formatDisplayDate(post.postedAt)}</span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {formatMetric(post.engagementRate, "% engagement")} · {post.views ?? "-"} views · {post.reach ?? "-"} reach
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{strategyContext.social_media_performance?.reason || "Not enough Instagram performance data for this period."}</p>
                  )
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <MetricTile label="Average Revenue per Month" value={formatIdr(strategyContext.revenue_history?.averageMonthlyRevenue ?? null)} />
                      <MetricTile label="Occupied Court Slots" value={formatMetric(strategyContext.occupancy_history?.occupiedCourtHours ?? null, " slots")} />
                      <MetricTile label="Available Court Slots" value={formatMetric(strategyContext.occupancy_history?.availableCourtHours ?? null, " slots")} />
                      <MetricTile label="Most Used Promotion" value={strategyContext.promotion_usage_context.mostUsedPromotion || "No promotions recorded in this period"} />
                      <MetricTile label="Valid Bookings" value={strategyContext.promotion_usage_context.validBookingCount ?? "Booking data not available"} />
                      <MetricTile label="Historical Coverage" value={strategyContext.revenue_history ? `${strategyContext.revenue_history.analysisMonths} months · ${strategyContext.revenue_history.validRevenueTransactionCount} transactions` : "Historical coverage not available"} />
                      <MetricTile label="Revenue Target Status" value={strategyContext.revenue_target_context.available ? `${formatMetric(strategyContext.revenue_target_context.revenueAchievementPct, "%")} achieved` : "Not configured"} />
                    </div>
                    {!strategyContext.revenue_target_context.available ? <p className="mt-3 text-xs text-muted-foreground">Revenue target is not configured for this scope.</p> : null}
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          ) : null}
        </div>
      ) : null}
    </section>

    <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-border/80 bg-background/95 p-3 shadow-lg backdrop-blur sm:static sm:flex-row sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
      <Button
        className="h-11 w-full gap-2 rounded-xl px-5 sm:w-auto"
        onClick={() => void handleGenerateStrategy()}
        disabled={!canGenerateAi || isGenerating || !aiStatus?.configured || !strategyContext || Boolean(contextError)}
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Generate Strategy
      </Button>

      <Button
        variant="outline"
        className="h-11 w-full gap-2 rounded-xl px-5 sm:w-auto"
        onClick={() => setStrategy(null)}
        disabled={isGenerating}
      >
        <RefreshCw className="h-4 w-4" />
        Clear Result
      </Button>
    </div>
  </CardContent>
</Card>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitleTooltip title="Ask the AI" tooltip="Ask a business question; Gemini answers using the selected segment's historical data." />
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ask a free-form business question. Gemini answers using historical data for the current segment and the configured business scope.
              </p>
              <div className="space-y-2">
                <label htmlFor="ask-prompt" className="text-sm font-medium">Your question</label>
                <Textarea
                  id="ask-prompt"
                  value={askPrompt}
                  onChange={(event) => setAskPrompt(event.target.value)}
                  placeholder="e.g. What is the best time slot to run a discount campaign for this segment?"
                  rows={3}
                  disabled={isAsking}
                  className="resize-none"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => void handleAskAi()}
                  disabled={isAsking || !askPrompt.trim() || !canGenerateAi || !aiStatus?.configured || !strategyContext || Boolean(contextError)}
                  className="h-11 gap-2 rounded-xl px-5"
                >
                  {isAsking ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                  {isAsking ? "Analyzing historical data..." : "Ask Gemini"}
                </Button>
                {askPrompt || askResult ? (
                  <Button
                    variant="ghost"
                    className="gap-2 rounded-xl"
                    onClick={() => {
                      setAskPrompt("")
                      setAskResult(null)
                      setAskError(null)
                    }}
                    disabled={isAsking}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
              {askError ? <p className="text-sm text-destructive">{askError}</p> : null}
              {askResult ? (
                <div className="rounded-2xl border border-border bg-gradient-to-br from-background to-secondary/20 p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Answer</p>
                    <span className="text-xs text-muted-foreground">{askResult.provider} · {askResult.model} · {formatExactDateTime(askResult.generatedAt)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{askResult.answer}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {!strategy ? (
            <StateCard
              state="empty"
              title="No AI strategy generated yet."
              description="Generate a strategy to populate campaign objective, offer, channel, outreach copy, and follow-up actions."
              icon={Sparkles}
            />
          ) : (
            <>
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitleTooltip title="Generated Strategy" tooltip={`AI-generated campaign strategy with objective, offer, channel, and follow-up actions. Generated ${formatExactDateTime(strategy.generatedAt)} (${getRelativeTime(strategy.generatedAt)})`} />
                  </div>
                  <Badge
                    variant="outline"
                    className="w-fit border-primary/20 text-primary"
                  >
                    {"Generated with Gemini"}
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
                    Offer: {resolvedOfferFrameworkLabel}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <StrategyFieldCard label="Campaign Objective" value={strategy.strategy.campaignObjective} accent="blue" />
                  <StrategyFieldCard label="Selected Segment" value={strategy.strategy.targetSegmentLabel || selectedSegment} accent="emerald" />
                  {strategy.strategy.targetDayLabel ? (
                    <StrategyFieldCard label="Target Day" value={strategy.strategy.targetDayLabel} accent="emerald" />
                  ) : null}
                  {strategy.strategy.targetSessionLabel ? (
                    <StrategyFieldCard label="Target Session" value={strategy.strategy.targetSessionLabel} accent="emerald" />
                  ) : null}
                  <StrategyFieldCard label="Recommended Offer" value={`${strategy.strategy.recommendedOfferType || "Offer"}: ${strategy.strategy.suggestedOffer}`} accent="rose" />
                  <StrategyFieldCard label="Why This Offer Fits" value={strategy.strategy.offerReasoning || "Not available"} accent="amber" />
                  <StrategyFieldCard label="Why This Segment" value={strategy.strategy.customerReasoning} accent="amber" />
                  <StrategyFieldCard label="Follow-Up Plan" value={strategy.strategy.followUpPlan} accent="slate" />
                  <StrategyFieldCard label="Stop Condition" value={strategy.strategy.stopCondition || "Not available"} accent="slate" />
                  <StrategyFieldCard label="Expected Business Impact" value={strategy.strategy.expectedBusinessImpact} accent="blue" />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Supporting Evidence</p>
                    {strategy.strategy.evidenceUsed?.length ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                        {strategy.strategy.evidenceUsed.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    ) : <p className="mt-2 text-sm text-muted-foreground">Not available</p>}
                  </div>
                  <div className="rounded-2xl border border-border p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Execution Plan</p>
                    {strategy.strategy.executionPlan?.length ? (
                      <ol className="mt-2 space-y-2 text-sm">
                        {strategy.strategy.executionPlan.map((item) => (
                          <li key={`${item.timing}-${item.action}`}><strong>{item.timing}:</strong> {item.action}<br /><span className="text-muted-foreground">{item.successCondition}</span></li>
                        ))}
                      </ol>
                    ) : <p className="mt-2 text-sm text-muted-foreground">Not available</p>}
                  </div>
                  <div className="rounded-2xl border border-border p-4 lg:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">KPI</p>
                    {strategy.strategy.kpis?.length ? (
                      <div className="mt-2 grid gap-2 md:grid-cols-3">
                        {strategy.strategy.kpis.map((kpi) => <div key={kpi.name}><p className="font-medium">{kpi.name}</p><p className="text-sm text-muted-foreground">{kpi.definition} ({formatTargetDirection(kpi.targetDirection)})</p></div>)}
                      </div>
                    ) : <p className="mt-2 text-sm text-muted-foreground">Not available</p>}
                  </div>
                </div>

                {strategy.strategy.dataLimitation ? <div className="rounded-2xl border border-border bg-gradient-to-br from-background to-secondary/20 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Data Limitations</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{strategy.strategy.dataLimitation}</p>
                </div> : null}

                <div className="rounded-2xl border border-border bg-gradient-to-br from-slate-50 to-background p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">WhatsApp Message Draft</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleGenerateStrategy()}
                        disabled={!canGenerateAi || isGenerating || !aiStatus?.configured || !strategyContext}
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

            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitleTooltip title="Refine Strategy" tooltip="Add extra instructions, then regenerate the strategy with your adjustments included as the highest priority." />
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Add extra instructions to adjust the generated strategy (e.g. change the offer type, target a different day or session, or adjust the tone). Your notes are injected into the prompt as the highest priority.
                </p>
                <div className="space-y-2">
                  <label htmlFor="refine-notes" className="text-sm font-medium">Your instructions</label>
                  <Textarea
                    id="refine-notes"
                    value={refineNotes}
                    onChange={(event) => setRefineNotes(event.target.value)}
                    placeholder="e.g. Use a 30% discount for this campaign and keep the tone casual."
                    rows={3}
                    disabled={isGenerating}
                    className="resize-none"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    className="h-11 gap-2 rounded-xl px-5"
                    onClick={() => {
                      setRefineNotes("")
                      setRefineMessage(null)
                    }}
                    disabled={isGenerating || !refineNotes.trim()}
                  >
                    Clear
                  </Button>
                  <Button
                    className="h-11 gap-2 rounded-xl px-5"
                    onClick={() => {
                      void (async () => {
                        const generated = await handleGenerateStrategy(refineNotes)
                        if (generated) {
                          setRefineMessage("Strategy regenerated with your instructions.")
                          setRefineNotes("")
                        }
                      })()
                    }}
                    disabled={isGenerating || !refineNotes.trim() || !canGenerateAi || !aiStatus?.configured || !strategyContext || Boolean(contextError)}
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Regenerate with Instructions
                  </Button>
                </div>
                {refineMessage ? (
                  <p className="flex items-center gap-1.5 text-sm text-emerald-700">
                    <Check className="h-4 w-4" aria-hidden="true" />
                    {refineMessage}
                  </p>
                ) : null}
              </CardContent>
            </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
