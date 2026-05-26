"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  Bell,
  RefreshCw,
  Send,
  Target,
  TrendingUp,
  CheckCircle2,
  Clock,
  Copy,
  Megaphone,
  Gift,
} from "lucide-react"

interface StrategyCardType {
  id: string
  title: string
  objective: string
  actionPlans: string[]
  incentive: string
  readyToUseLabel: string
  readyToUseCopy: string
  tone: string
  channel: string
  variant: "blue" | "pink"
}

const venueTypes = ["All Venue", "Mini Soccer", "Basket"] as const
type VenueType = (typeof venueTypes)[number]

const targetSegments = ["Champions", "Loyal", "At Risk", "Potential"]

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
  "Casual & Community Hook (WhatsApp Blast)",
  "Urgent & Catchy Promo (Instagram Ads)",
  "Professional Corporate Tone (Email Newsletter)",
]

export function GenAIWorkspace() {
  const [isGenerating, setIsGenerating] = useState(false)

  const [selectedVenueType, setSelectedVenueType] =
    useState<VenueType>("All Venue")

  const [selectedSegment, setSelectedSegment] = useState("At Risk")
  const [selectedObjective, setSelectedObjective] = useState(
    "Maximize Off-Peak Occupancy"
  )
  const [selectedIncentive, setSelectedIncentive] =
    useState("Value-Added Services")
  const [selectedTone, setSelectedTone] = useState(
    "Casual & Community Hook (WhatsApp Blast)"
  )

  const [aiSummary, setAiSummary] = useState(
    "At Risk customers show declining visit frequency and need reactivation before becoming dormant. Maximizing off-peak occupancy with value-added services through WhatsApp Blast can help redirect them into empty weekday slots with a cost-efficient strategy."
  )

  const [strategyCards, setStrategyCards] = useState<StrategyCardType[]>([
    {
      id: "1",
      title: "Mid-Week Customer Reactivation Push",
      objective: "Re-engage At Risk customers during weekday off-peak hours",
      actionPlans: [
        "Send WhatsApp reminder to inactive customers.",
        "Promote limited weekday booking slots.",
        "Highlight added-value benefits instead of heavy discounting.",
      ],
      incentive: "FREE mineral water + priority booking reminder",
      readyToUseLabel: "WhatsApp Blast Ready-To-Use",
      readyToUseCopy:
        "Hi! Udah lama nggak main di Maiin Gandaria 👋 Yuk balik lagi dan nikmatin weekday special bonus untuk booking di jam sepi. Slot terbatas, langsung booking sekarang ya!",
      tone: "Casual",
      channel: "WhatsApp Blast",
      variant: "blue",
    },
    {
      id: "2",
      title: "Retention Booster for Repeat Booking",
      objective: "Strengthen repeat booking habit and improve short-term retention",
      actionPlans: [
        "Offer reactivation package for repeat visits.",
        "Encourage booking confirmation before the weekend.",
        "Use reminder-based communication for faster conversion.",
      ],
      incentive: "Book 3 sessions, get added value on next session",
      readyToUseLabel: "Instagram / Promo Copy Ready-To-Use",
      readyToUseCopy:
        "Balik main minggu ini dan dapetin benefit spesial buat kamu yang udah lama nggak booking 🔥 Jangan tunggu slot favorit penuh. Amankan sesi kamu sekarang!",
      tone: "Catchy",
      channel: "Instagram Ads",
      variant: "pink",
    },
  ])

  const alerts = [
    {
      id: 1,
      message: "New AI draft ready: Holiday Season Strategy",
      time: "5 min ago",
      unread: true,
    },
    {
      id: 2,
      message: "Campaign performance update available",
      time: "1 hour ago",
      unread: true,
    },
  ]

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert("Copied to clipboard!")
    } catch {
      alert("Failed to copy")
    }
  }

  const buildAiSummary = () => {
    const segmentMap: Record<string, string> = {
      Champions:
        "Champions are high-value customers with strong loyalty, strong recency, and high transaction value.",
      Loyal:
        "Loyal customers are consistent repeat visitors and can be nurtured into stronger premium behavior.",
      "At Risk":
        "At Risk customers show declining visit frequency and need reactivation before becoming dormant.",
      Potential:
        "Potential customers already show interest and can be pushed into more frequent repeat bookings.",
    }

    const objectiveMap: Record<string, string> = {
      "Maximize Off-Peak Occupancy":
        "The immediate business goal is to fill empty off-peak slots and improve utilization during low-demand periods.",
      "Drive Revenue Growth":
        "The priority is to increase transaction value and overall revenue contribution from targeted customers.",
      "Boost Social Media Conversion":
        "The campaign should convert digital attention into real booking actions and stronger response rates.",
      "Customer Reactivation & Retention":
        "The strategy should bring customers back and improve their likelihood of repeat visits over time.",
    }

    const incentiveMap: Record<string, string> = {
      "Time-Based Discount":
        "A time-based discount can create urgency and redirect traffic into less crowded hours.",
      "Value-Added Services":
        "Value-added services offer a cost-efficient way to increase perceived value without reducing price too much.",
      "Loyalty Points Multiplier":
        "A loyalty points multiplier can motivate repeat bookings and reinforce retention behavior.",
      "Fixed-Rate Bundling":
        "Fixed-rate bundling can simplify the offer and encourage higher booking commitment.",
    }

    const toneMap: Record<string, string> = {
      "Casual & Community Hook (WhatsApp Blast)":
        "A casual and community-driven WhatsApp message is suitable to create a direct and warm engagement tone.",
      "Urgent & Catchy Promo (Instagram Ads)":
        "A more urgent and catchy Instagram-style promo is suitable to drive fast attention and action.",
      "Professional Corporate Tone (Email Newsletter)":
        "A professional email-based tone works well for more structured communication and formal audiences.",
    }

    const venueText =
      selectedVenueType === "All Venue"
        ? "all venue types"
        : selectedVenueType

    return `${selectedSegment} segment analysis for ${venueText}: ${segmentMap[selectedSegment]} ${objectiveMap[selectedObjective]} ${incentiveMap[selectedIncentive]} ${toneMap[selectedTone]}`
  }

  const generateStrategyCards = () => {
    const titleMap: Record<string, string> = {
      Champions: "Premium Loyalty Activation",
      Loyal: "Repeat Visit Growth Plan",
      "At Risk": "Customer Reactivation Push",
      Potential: "Conversion Uplift Campaign",
    }

    const objectiveDetailMap: Record<string, string> = {
      "Maximize Off-Peak Occupancy": "Occupancy boost on off-peak hours",
      "Drive Revenue Growth": "Revenue uplift through targeted monetization",
      "Boost Social Media Conversion":
        "Higher social engagement-to-booking conversion",
      "Customer Reactivation & Retention":
        "Repeat booking improvement and customer recovery",
    }

    const incentiveDetailMap: Record<string, string> = {
      "Time-Based Discount": "10% weekday discount for selected hours",
      "Value-Added Services":
        "FREE mineral water / vest rental / added-value bonus",
      "Loyalty Points Multiplier": "2x loyalty points for selected bookings",
      "Fixed-Rate Bundling": "Buy multi-session bundle with better fixed rate",
    }

    const readyToUseLabelMap: Record<string, string> = {
      "Casual & Community Hook (WhatsApp Blast)":
        "WhatsApp Blast Ready-To-Use",
      "Urgent & Catchy Promo (Instagram Ads)":
        "Instagram Ads Ready-To-Use",
      "Professional Corporate Tone (Email Newsletter)":
        "Email Newsletter Ready-To-Use",
    }

    const readyToUseCopyMap: Record<string, string> = {
      "Casual & Community Hook (WhatsApp Blast)": `Hai ${selectedSegment} customers 👋 Lagi cari waktu main yang lebih santai di ${selectedVenueType}? Yuk manfaatkan slot weekday dengan benefit spesial dari Maiin Gandaria. Booking sekarang sebelum slot-nya penuh ya!`,
      "Urgent & Catchy Promo (Instagram Ads)": `Jangan sampai kelewatan! 🔥 Promo spesial untuk ${selectedSegment} customers di ${selectedVenueType} lagi aktif sekarang. Booking sesi kamu hari ini dan nikmatin benefit eksklusif sebelum habis!`,
      "Professional Corporate Tone (Email Newsletter)": `Dear Customer, we are pleased to offer a tailored booking strategy for our ${selectedSegment} segment at ${selectedVenueType}. Enjoy selected benefits and preferred session opportunities designed to improve your playing experience with Maiin Gandaria.`,
    }

    const secondaryCopyMap: Record<string, string> = {
      "Casual & Community Hook (WhatsApp Blast)":
        "Udah siap balik main lagi? Ada benefit spesial buat kamu kalau booking di jam tertentu minggu ini 🙌 Cocok buat yang mau main lebih hemat tapi tetap nyaman.",
      "Urgent & Catchy Promo (Instagram Ads)":
        "Slot terbatas! ⏰ Benefit spesial untuk booking minggu ini siap kamu klaim sekarang juga. Jangan tunggu sampai kehabisan.",
      "Professional Corporate Tone (Email Newsletter)":
        "We would like to invite you to take advantage of this limited campaign opportunity, designed to support repeat booking and higher customer value.",
    }

    const primaryCard: StrategyCardType = {
      id: "1",
      title: `${titleMap[selectedSegment]} - Primary Strategy`,
      objective: `${objectiveDetailMap[selectedObjective]} for ${selectedVenueType}`,
      actionPlans: [
        `Target ${selectedSegment} customers with focused outreach.`,
        `Prioritize campaign for ${selectedVenueType}.`,
        `Align campaign message with objective: ${selectedObjective}.`,
        `Push preferred booking window based on current business priority.`,
      ],
      incentive: incentiveDetailMap[selectedIncentive],
      readyToUseLabel: readyToUseLabelMap[selectedTone],
      readyToUseCopy: readyToUseCopyMap[selectedTone],
      tone: selectedTone,
      channel: selectedTone,
      variant: "blue",
    }

    const secondaryCard: StrategyCardType = {
      id: "2",
      title: `${titleMap[selectedSegment]} - Supporting Strategy`,
      objective: `Support ${objectiveDetailMap[
        selectedObjective
      ].toLowerCase()} through follow-up communication`,
      actionPlans: [
        `Send reminder campaign to improve response rate.`,
        `Reinforce incentive using clear CTA and benefit framing.`,
        `Monitor booking response and retarget non-converted customers.`,
      ],
      incentive: incentiveDetailMap[selectedIncentive],
      readyToUseLabel: `${readyToUseLabelMap[selectedTone]} Alternative Copy`,
      readyToUseCopy: secondaryCopyMap[selectedTone],
      tone: selectedTone,
      channel: selectedTone,
      variant: "pink",
    }

    return [primaryCard, secondaryCard]
  }

  const handleGenerateStrategy = async () => {
    setIsGenerating(true)

    await new Promise((resolve) => setTimeout(resolve, 1000))

    const summary = buildAiSummary()
    const cards = generateStrategyCards()

    setAiSummary(summary)
    setStrategyCards(cards)
    setIsGenerating(false)
  }

  return (
    <div className="space-y-7">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">GenAI Strategy Workspace</h1>

          <p className="text-base text-muted-foreground">
            AI-powered marketing and business strategies
          </p>
        </div>

        <Button variant="outline" size="sm" className="gap-2 text-sm">
          <Bell className="h-4 w-4" />
          Alerts
          <Badge className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
            {alerts.filter((a) => a.unread).length}
          </Badge>
        </Button>
      </div>

      {/* ALERT */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-5">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-semibold text-primary">
                AI Draft Ready
              </h3>
              <p className="text-base text-muted-foreground">
                {alerts[0].message}
              </p>
            </div>

            <Badge
              variant="outline"
              className="text-sm text-primary border-primary/30"
            >
              {alerts[0].time}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* FILTERS */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Strategy Configuration
          </CardTitle>

          <CardDescription className="text-base">
            Choose campaign parameters to generate a data-driven strategy
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-[180px_220px_280px_280px_320px] gap-x-4 gap-y-5 items-end max-w-full">
            {/* 1. VENUE TYPE */}
            <div className="min-w-0 space-y-2">
              <label className="text-base font-semibold">1. Venue Type</label>

              <select
                value={selectedVenueType}
                onChange={(e) =>
                  setSelectedVenueType(e.target.value as VenueType)
                }
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {venueTypes.map((venue) => (
                  <option key={venue} value={venue}>
                    {venue}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. TARGET CUSTOMER SEGMENT */}
            <div className="min-w-0 space-y-2">
              <label className="text-base font-semibold">
                2. Target Customer Segment
              </label>

              <select
                value={selectedSegment}
                onChange={(e) => setSelectedSegment(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {targetSegments.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. CAMPAIGN OBJECTIVE */}
            <div className="min-w-0 space-y-2">
              <label className="text-base font-semibold">
                3. Campaign Objective
              </label>

              <select
                value={selectedObjective}
                onChange={(e) => setSelectedObjective(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {campaignObjectives.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. INCENTIVE */}
            <div className="min-w-0 space-y-2">
              <label className="text-base font-semibold">
                4. Incentive & Promo Framework
              </label>

              <select
                value={selectedIncentive}
                onChange={(e) => setSelectedIncentive(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {incentiveFrameworks.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. COPYWRITING */}
            <div className="min-w-0 space-y-2">
              <label className="text-base font-semibold">
                5. Copywriting Tone & Channel
              </label>

              <select
                value={selectedTone}
                onChange={(e) => setSelectedTone(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {copywritingTones.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleGenerateStrategy}
              disabled={isGenerating}
              className="gap-2 text-base"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Generate AI Strategy
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleGenerateStrategy}
              disabled={isGenerating}
              className="gap-2 text-base"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Strategy
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI EXECUTIVE ANALYSIS + PERFORMANCE */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-orange-50 border-orange-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-orange-600" />
              AI Executive Analysis: Data-Driven Insight
            </CardTitle>

            <CardDescription className="text-base">
              Generated summary based on selected strategy filters
            </CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-base leading-relaxed text-slate-700">
              {aiSummary}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-sm">
                {selectedVenueType}
              </Badge>
              <Badge variant="secondary" className="text-sm">
                {selectedSegment}
              </Badge>
              <Badge variant="secondary" className="text-sm">
                {selectedObjective}
              </Badge>
              <Badge variant="secondary" className="text-sm">
                {selectedIncentive}
              </Badge>
              <Badge variant="secondary" className="text-sm">
                {selectedTone}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">AI Performance</CardTitle>
            <CardDescription className="text-base">
              Strategy generation metrics
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <span className="text-base">Strategies Generated</span>
              </div>
              <span className="text-lg font-bold">24</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-chart-1/10 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-chart-1" />
                </div>
                <span className="text-base">Deployed</span>
              </div>
              <span className="text-lg font-bold">18</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-chart-3/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-chart-3" />
                </div>
                <span className="text-base">Avg. Accuracy</span>
              </div>
              <span className="text-lg font-bold">84%</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-chart-2/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-chart-2" />
                </div>
                <span className="text-base">Pending Review</span>
              </div>
              <span className="text-lg font-bold">3</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* STRATEGY CARDS */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Megaphone className="h-5 w-5 text-primary" />
            Strategy Cards
          </CardTitle>

          <CardDescription className="text-base">
            AI-generated action plans based on selected strategy inputs
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            {strategyCards.map((card) => {
              const isBlue = card.variant === "blue"

              return (
                <div
                  key={card.id}
                  className={`rounded-2xl border p-5 shadow-sm ${
                    isBlue
                      ? "bg-sky-50 border-sky-200"
                      : "bg-pink-50 border-pink-200"
                  }`}
                >
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">
                        {card.title}
                      </h3>

                      <p className="text-base mt-1 text-slate-700">
                        <span className="font-semibold">Objective:</span>{" "}
                        {card.objective}
                      </p>
               
                    </div>

                    <div>
                      <p className="text-base font-semibold text-slate-900 mb-2">
                        Action Plan
                      </p>

                      <div className="space-y-2">
                        {card.actionPlans.map((plan, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-base text-slate-700"
                          >
                            <CheckCircle2 className="h-4 w-4 mt-1 text-primary shrink-0" />
                            <span>{plan}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl bg-white/80 border border-white p-3">
                      <p className="text-base text-slate-800">
                        <span className="font-semibold">Incentive:</span>{" "}
                        {card.incentive}
                      </p>
                    </div>

                    <div className="rounded-xl border bg-white/70 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Gift className="h-4 w-4 text-primary" />

                        <p className="text-base font-semibold text-slate-900">
                          {card.readyToUseLabel}
                        </p>
                      </div>

                      <p className="text-base text-slate-700 leading-relaxed">
                        {card.readyToUseCopy}
                      </p>

                      <div className="mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-sm"
                          onClick={() => copyToClipboard(card.readyToUseCopy)}
                        >
                          <Copy className="h-4 w-4" />
                          Copy to Clipboard
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

