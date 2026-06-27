"use client"

import { useEffect, useState } from "react"
import {
  AlertCircle,
  Copy,
  Info,
  Loader2,
  MessageSquare,
  Sparkles,
  Target,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  getLowOccupancySessions,
  getRecommendedCustomers,
  type LowOccupancySessionCard,
  type RecommendedTargetCustomer,
} from "@/lib/targeting"
import {
  saveLowOccupancyOutreachContext,
  type LowOccupancyOutreachIntent,
} from "@/lib/low-occupancy-outreach"

import type { PageId } from "./dashboard-sidebar"

interface LowOccupancyTargetingProps {
  onNavigate: (page: PageId) => void
}

const SESSION_OPTIONS = ["Morning", "Afternoon", "Evening", "Night"] as const
const COURT_OPTIONS = [
  { value: "all", label: "All" },
  { value: "mini_soccer", label: "Mini Soccer" },
  { value: "basketball", label: "Basketball" },
]
const CUSTOMER_TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "membership", label: "Membership" },
  { value: "non_membership", label: "Non Membership" },
]
const SEGMENT_OPTIONS = [
  { value: "all", label: "All" },
  { value: "Prime Players", label: "Prime Players" },
  { value: "Routine Players", label: "Routine Players" },
  { value: "Growth Players", label: "Growth Players" },
  { value: "Re-Engagement Players", label: "Re-Engagement Players" },
]

const getTodayIso = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
const INITIAL_DATE = getTodayIso()
const INITIAL_COURT_TYPE = "all"
const INITIAL_SESSION_NAME: (typeof SESSION_OPTIONS)[number] = "Morning"
const INITIAL_CUSTOMER_TYPE = "all"
const INITIAL_SEGMENT_NAME = "all"
const INITIAL_MIN_SESSION_BOOKING_COUNT = 1

const FILTER_HELP_TEXT = {
  campaignDate:
    "Pick the target play date you want to inspect. The session cards use uploaded historical transactions for that selected day, not live slot availability.",
  courtType:
    "Focus the promo opportunity on a specific court type or keep all courts included.",
  playSession:
    "Choose the session bucket you want to promote: Morning, Afternoon, Evening, or Night.",
  customerType:
    "Narrow the audience to membership, non-membership, or both depending on the promo goal.",
  rfmSegment:
    "Filter the audience by the latest available RFM segment to support retention, growth, or re-engagement campaigns.",
  minBookingCount:
    "Set the minimum number of past bookings in the selected session before a customer is considered a strong target.",
} as const

function FilterLabel({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label={`More information about ${label}`}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8} className="max-w-xs text-left leading-relaxed">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

export function LowOccupancyTargeting({ onNavigate }: LowOccupancyTargetingProps) {
  const [date, setDate] = useState(INITIAL_DATE)
  const [courtType, setCourtType] = useState(INITIAL_COURT_TYPE)
  const [sessionName, setSessionName] = useState<(typeof SESSION_OPTIONS)[number]>(INITIAL_SESSION_NAME)
  const [customerType, setCustomerType] = useState(INITIAL_CUSTOMER_TYPE)
  const [segmentName, setSegmentName] = useState(INITIAL_SEGMENT_NAME)
  const [minSessionBookingCount, setMinSessionBookingCount] = useState(INITIAL_MIN_SESSION_BOOKING_COUNT)

  const [sessions, setSessions] = useState<LowOccupancySessionCard[]>([])
  const [customers, setCustomers] = useState<RecommendedTargetCustomer[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [customerError, setCustomerError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [selectedCardKey, setSelectedCardKey] = useState<string | null>(null)

  const loadSessions = async (nextDate = date, nextCourtType = courtType) => {
    setIsLoadingSessions(true)
    setSessionError(null)

    try {
      const response = await getLowOccupancySessions({
        date: nextDate,
        courtType: nextCourtType,
      })
      setSessions(response.sessions)
    } catch (error) {
      setSessionError(
        error instanceof Error
          ? error.message
          : "Failed to load historical low-demand session summary."
      )
      setSessions([])
    } finally {
      setIsLoadingSessions(false)
    }
  }

  const loadCustomers = async (filters?: {
    nextDate?: string
    nextCourtType?: string
    nextSessionName?: string
    nextCustomerType?: string
    nextSegmentName?: string
    nextMinSessionBookingCount?: number
  }) => {
    const nextDate = filters?.nextDate ?? date
    const nextCourtType = filters?.nextCourtType ?? courtType
    const nextSessionName = filters?.nextSessionName ?? sessionName
    const nextCustomerType = filters?.nextCustomerType ?? customerType
    const nextSegmentName = filters?.nextSegmentName ?? segmentName
    const nextMinSessionBookingCount =
      filters?.nextMinSessionBookingCount ?? minSessionBookingCount

    setIsLoadingCustomers(true)
    setCustomerError(null)

    try {
      const response = await getRecommendedCustomers({
        date: nextDate,
        courtType: nextCourtType,
        sessionName: nextSessionName,
        customerType: nextCustomerType,
        segmentName: nextSegmentName === "all" ? undefined : nextSegmentName,
        minSessionBookingCount: nextMinSessionBookingCount,
        limit: 50,
        offset: 0,
      })
      setCustomers(response.customers)
    } catch (error) {
      setCustomerError(
        error instanceof Error
          ? error.message
          : "Failed to load recommended customers."
      )
      setCustomers([])
    } finally {
      setIsLoadingCustomers(false)
    }
  }

  useEffect(() => {
    const initialize = async () => {
      setIsLoadingSessions(true)
      setIsLoadingCustomers(true)
      setSessionError(null)
      setCustomerError(null)

      try {
        const [sessionResponse, customerResponse] = await Promise.all([
          getLowOccupancySessions({
            date: INITIAL_DATE,
            courtType: INITIAL_COURT_TYPE,
          }),
          getRecommendedCustomers({
            date: INITIAL_DATE,
            courtType: INITIAL_COURT_TYPE,
            sessionName: INITIAL_SESSION_NAME,
            customerType: INITIAL_CUSTOMER_TYPE,
            minSessionBookingCount: INITIAL_MIN_SESSION_BOOKING_COUNT,
            limit: 50,
            offset: 0,
          }),
        ])

        setSessions(sessionResponse.sessions)
        setCustomers(customerResponse.customers)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to initialize Promote Underbooked Sessions."
        setSessionError(message)
        setCustomerError(message)
        setSessions([])
        setCustomers([])
      } finally {
        setIsLoadingSessions(false)
        setIsLoadingCustomers(false)
      }
    }

    void initialize()
  }, [])

  const handleApply = async () => {
    setStatusMessage(null)
    await Promise.all([loadSessions(date, courtType), loadCustomers()])
  }

  const handleCardSelect = async (card: LowOccupancySessionCard) => {
    setCourtType(card.courtType)
    setSessionName(card.sessionName as (typeof SESSION_OPTIONS)[number])
    setSelectedCardKey(`${card.courtType}:${card.sessionName}`)
    setStatusMessage(null)

    await loadCustomers({
      nextCourtType: card.courtType,
      nextSessionName: card.sessionName,
    })
  }

  const copyText = async (text: string | null, successMessage: string) => {
    if (!text) {
      setStatusMessage("No value available to copy.")
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      setStatusMessage(successMessage)
    } catch {
      setStatusMessage("Failed to copy to clipboard.")
    }
  }

  const openGenAi = (
    customer: RecommendedTargetCustomer,
    intent: LowOccupancyOutreachIntent
  ) => {
    saveLowOccupancyOutreachContext({
      source: "low_occupancy_targeting",
      intent,
      customerKey: customer.customerKey,
      customerName: customer.customerName,
      phone: customer.phone,
      email: customer.email,
      customerTypeLabel: customer.customerTypeLabel,
      bookingTypeDominant: customer.bookingTypeDominant,
      courtType,
      sessionName,
      date,
      preferredSession: customer.preferredSession,
      selectedSessionBookingCount: customer.selectedSessionBookingCount,
      selectedCourtBookingCount: customer.selectedCourtBookingCount,
      totalBookingCount: customer.totalBookingCount,
      lastBookingDate: customer.lastBookingDate,
      recencyDays: customer.recencyDays,
      avgSpend: customer.avgSpend,
      totalRevenue: customer.totalRevenue,
      rfmSegmentName: customer.rfmSegmentName,
      targetPriorityScore: customer.targetPriorityScore,
      targetPriorityLabel: customer.targetPriorityLabel,
      suggestedAction: customer.suggestedAction,
      whatsappMessage: customer.whatsappMessage,
    })

    setStatusMessage(
      intent === "campaign"
        ? "Campaign context sent to GenAI Workspace."
        : "Outreach context sent to GenAI Workspace."
    )
    onNavigate("genai")
  }

  const lowSessions = sessions.filter((session) => session.status === "Low")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Promote Underbooked Sessions</h1>
        <p className="text-base text-muted-foreground">
          Use uploaded historical transactions to spot weaker play sessions and build a targeted promo audience.
        </p>
      </div>

      <Card className="border-amber-200 bg-amber-50/70 shadow-sm">
        <CardContent className="py-4 text-sm text-amber-900">
          Insights on this page are based on uploaded historical transaction data and do not reflect real-time slot availability.
        </CardContent>
      </Card>

      {statusMessage && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4 text-sm text-primary">
            {statusMessage}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Target className="h-5 w-5 text-primary" />
            Campaign Targeting
          </CardTitle>
          <CardDescription>
            Choose the historical demand lens, then narrow the audience most worth targeting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2">
              <FilterLabel
                label="Campaign Date"
                tooltip={FILTER_HELP_TEXT.campaignDate}
              />
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-12 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm font-medium shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>

            <label className="space-y-2">
              <FilterLabel
                label="Court Type"
                tooltip={FILTER_HELP_TEXT.courtType}
              />
              <select
                value={courtType}
                onChange={(event) => setCourtType(event.target.value)}
                className="h-12 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm font-medium shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {COURT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <FilterLabel
                label="Play Session"
                tooltip={FILTER_HELP_TEXT.playSession}
              />
              <select
                value={sessionName}
                onChange={(event) =>
                  setSessionName(event.target.value as (typeof SESSION_OPTIONS)[number])
                }
                className="h-12 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm font-medium shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {SESSION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <FilterLabel
                label="Target Customer"
                tooltip={FILTER_HELP_TEXT.customerType}
              />
              <select
                value={customerType}
                onChange={(event) => setCustomerType(event.target.value)}
                className="h-12 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm font-medium shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {CUSTOMER_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <FilterLabel
                label="RFM Segment"
                tooltip={FILTER_HELP_TEXT.rfmSegment}
              />
              <select
                value={segmentName}
                onChange={(event) => setSegmentName(event.target.value)}
                className="h-12 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm font-medium shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {SEGMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <FilterLabel
                label="Minimum Session Booking Count"
                tooltip={FILTER_HELP_TEXT.minBookingCount}
              />
              <input
                type="number"
                min={1}
                value={minSessionBookingCount}
                onChange={(event) =>
                  setMinSessionBookingCount(
                    Math.max(1, Number(event.target.value) || 1)
                  )
                }
                className="h-12 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm font-medium shadow-sm outline-none transition hover:border-primary/35 hover:bg-background focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Button onClick={handleApply} className="h-11 gap-2 rounded-xl px-5">
              {isLoadingSessions || isLoadingCustomers ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Target className="h-4 w-4" />
                  Find Recommended Customers
                </>
              )}
            </Button>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Recommendations are ranked from historical booking behavior and the latest available RFM segmentation.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Historically Low-Demand Sessions</CardTitle>
          <CardDescription>
            Use these session buckets as promo opportunities for the selected campaign date, then click a card to target the matching audience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessionError ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {sessionError}
            </div>
          ) : isLoadingSessions ? (
            <div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading historical session demand...
            </div>
          ) : (
            <div className="space-y-4">
              {lowSessions.length === 0 && (
                <div className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                  No low-demand session was detected for this selection. Try another date or court type to inspect a different historical pattern.
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {sessions.map((card) => {
                  const cardKey = `${card.courtType}:${card.sessionName}`
                  const isActive =
                    selectedCardKey === cardKey ||
                    (courtType === card.courtType && sessionName === card.sessionName)

                  return (
                    <button
                      key={cardKey}
                      type="button"
                      onClick={() => void handleCardSelect(card)}
                      className={`rounded-2xl border p-4 text-left transition hover:border-primary/50 hover:shadow-sm ${
                        isActive
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">{card.courtTypeLabel}</p>
                          <h3 className="text-lg font-semibold">{card.sessionName}</h3>
                          <p className="text-xs text-muted-foreground">
                            {card.sessionStartHour} - {card.sessionEndHour}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            card.status === "Low"
                              ? "border-amber-300 text-amber-700"
                              : "border-emerald-300 text-emerald-700"
                          }
                        >
                          {card.status === "Low" ? "Promo opportunity" : "Healthy demand"}
                        </Badge>
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-slate-700">
                        <p>Historical Occupancy Rate: {card.occupancyRate}%</p>
                        <p>
                          Occupied / Available Court-Hours: {card.occupiedCourtHours} / {card.availableCourtHours}
                        </p>
                        <p>Potential Audience Size: {card.potentialTargetCount}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Recommended Customers</CardTitle>
          <CardDescription>
            Customers whose historical behavior best matches the selected session and campaign filters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customerError ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {customerError}
            </div>
          ) : isLoadingCustomers ? (
            <div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading recommended customers...
            </div>
          ) : customers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
              No matching customers found for this session. Try adjusting the filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-3 font-medium">Customer Name</th>
                    <th className="px-3 py-3 font-medium">Customer Type</th>
                    <th className="px-3 py-3 font-medium">Phone</th>
                    <th className="px-3 py-3 font-medium">Email</th>
                    <th className="px-3 py-3 font-medium">Preferred Session</th>
                    <th className="px-3 py-3 font-medium">Session Count</th>
                    <th className="px-3 py-3 font-medium">Court Count</th>
                    <th className="px-3 py-3 font-medium">Last Booking</th>
                    <th className="px-3 py-3 font-medium">Avg Spend</th>
                    <th className="px-3 py-3 font-medium">RFM Segment</th>
                    <th className="px-3 py-3 font-medium">Priority</th>
                    <th className="px-3 py-3 font-medium">Suggested Action</th>
                    <th className="px-3 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((customer) => (
                    <tr key={customer.customerKey} className="align-top">
                      <td className="px-3 py-3 font-medium text-slate-900">
                        {customer.customerName || customer.customerKey}
                      </td>
                      <td className="px-3 py-3">{customer.customerTypeLabel}</td>
                      <td className="px-3 py-3">{customer.phone || "-"}</td>
                      <td className="px-3 py-3">{customer.email || "-"}</td>
                      <td className="px-3 py-3">{customer.preferredSession || "-"}</td>
                      <td className="px-3 py-3">{customer.selectedSessionBookingCount}</td>
                      <td className="px-3 py-3">{customer.selectedCourtBookingCount}</td>
                      <td className="px-3 py-3">{customer.lastBookingDate || "-"}</td>
                      <td className="px-3 py-3">Rp {customer.avgSpend.toLocaleString()}</td>
                      <td className="px-3 py-3">{customer.rfmSegmentName || "Not segmented"}</td>
                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          <Badge variant="secondary">{customer.targetPriorityLabel}</Badge>
                          <p className="text-xs text-muted-foreground">
                            Score: {customer.targetPriorityScore}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-3">{customer.suggestedAction}</td>
                      <td className="px-3 py-3">
                        <div className="flex min-w-[220px] flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="justify-start gap-2"
                            onClick={() =>
                              void copyText(customer.phone, "Phone copied to clipboard.")
                            }
                          >
                            <Copy className="h-4 w-4" />
                            Copy Phone
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="justify-start gap-2"
                            onClick={() =>
                              void copyText(
                                customer.whatsappMessage,
                                "WhatsApp message copied to clipboard."
                              )
                            }
                          >
                            <MessageSquare className="h-4 w-4" />
                            Copy Message
                          </Button>
                          <Button
                            size="sm"
                            className="justify-start gap-2"
                            onClick={() => openGenAi(customer, "message")}
                          >
                            <Sparkles className="h-4 w-4" />
                            Generate Message
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="justify-start gap-2"
                            onClick={() => openGenAi(customer, "campaign")}
                          >
                            <Sparkles className="h-4 w-4" />
                            Generate Campaign
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start gap-2"
                            onClick={() => openGenAi(customer, "workspace")}
                          >
                            <Sparkles className="h-4 w-4" />
                            Open in GenAI Workspace
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


