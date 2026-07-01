"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { AlertTriangle, ArrowLeft, MapPin, Sparkles, Users, VenusAndMars } from "lucide-react"

import { BusinessErrorAlert } from "@/components/business-error-alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getApiUrl } from "@/lib/api"
import { getAuthHeaders, getStoredRole, USER_ROLES } from "@/lib/roles"

type GenderItem = {
  name: string
  value: number
}

type AgeItem = {
  age?: string
  name?: string
  breakdownValue?: string
  gender?: string
  total?: number | string
  value?: number | string
  metricValue?: number | string
  male?: number | string
  female?: number | string
  Male?: number | string
  Female?: number | string
  lakiLaki?: number | string
  perempuan?: number | string
  "Laki-laki"?: number | string
  Perempuan?: number | string
}

type CityItem = {
  city: string
  value: number
}

type CountryItem = {
  country: string
  value: number
}

type AudienceSummary = {
  hasData: boolean
  summary: {
    dominantGender: string
    dominantGenderPct: number
    dominantAgeGroup: string
    topCity: string
    topCityPct: number
  }
  genderDistribution: GenderItem[]
  ageDistribution: Array<{ age: string; value: number }>
  ageGenderDistribution: AgeItem[]
  topCities: CityItem[]
  topCountries?: CountryItem[]
  personaInsight: string
}

type AudienceResponse = {
  success: boolean
  message?: string
  suggestion?: string
  technicalMessage?: string
  data?: AudienceSummary
}

const AUDIENCE_COLORS = {
  male: "#15803d",
  female: "#f59e0b",
  unknown: "#94a3b8",
}

function getAudienceColor(name: string) {
  const label = name.toLowerCase()
  if (label.includes("female") || label.includes("perempuan") || label.includes("cewe")) return AUDIENCE_COLORS.female
  if (label.includes("male") || label.includes("laki")) return AUDIENCE_COLORS.male
  return AUDIENCE_COLORS.unknown
}

function formatPercent(value: number | undefined) {
  return `${Number(value || 0).toFixed(1)}%`
}

function toNumber(value: unknown) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function getGenderAgeLabel(item: AgeItem) {
  const raw = String(item.breakdownValue ?? item.name ?? item.age ?? "").toLowerCase()
  if (raw.includes("13-17")) return "13-17"
  if (raw.includes("18-24")) return "18-24"
  if (raw.includes("25-34")) return "25-34"
  if (raw.includes("35-44")) return "35-44"
  if (raw.includes("45-54")) return "45-54"
  if (raw.includes("55-64")) return "55-64"
  if (raw.includes("65+")) return "65+"
  return "-"
}

function getGenderFromBreakdown(item: AgeItem) {
  const raw = String(item.gender ?? item.breakdownValue ?? item.name ?? "").toLowerCase()
  if (raw === "f" || raw.includes("female") || raw.includes("perempuan") || raw.includes("cewe") || raw.startsWith("f.")) return "Female"
  if (raw === "m" || raw.includes("male") || raw.includes("laki") || raw.startsWith("m.")) return "Male"
  return "-"
}

type MetaAudienceProps = {
  onBack?: () => void
}

export function MetaAudience({ onBack }: MetaAudienceProps) {
  return <MetaAudienceCharts onBack={onBack} />
}

function MetaAudienceCharts({ onBack }: MetaAudienceProps) {
  const userRole = getStoredRole()
  const canViewTechnicalDetails = userRole === USER_ROLES.IT_SUPPORT
  const [data, setData] = useState<AudienceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ message: string; suggestion?: string | null; technical?: string | null } | null>(null)

  useEffect(() => {
    const fetchAudienceSummary = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(getApiUrl("/meta/audience-summary"), {
          method: "GET",
          headers: getAuthHeaders(),
          cache: "no-store",
        })

        const result: AudienceResponse | null = await response.json().catch(() => null)
        if (!response.ok || !result?.success || !result.data) {
          setData(null)
          setError({
            message: result?.message || "Audience insight data could not be loaded.",
            suggestion: result?.suggestion || "Please sync InstaSight data again after the Meta API connection is available.",
            technical: result?.technicalMessage || null,
          })
          return
        }

        setData(result.data)
      } catch (loadError) {
        setData(null)
        setError({
          message: "Audience insight data could not be loaded.",
          suggestion: "Please sync InstaSight data again after the Meta API connection is available.",
          technical: loadError instanceof Error ? loadError.message : null,
        })
      } finally {
        setLoading(false)
      }
    }

    void fetchAudienceSummary()
  }, [])

  const ageGenderChartData = useMemo(() => {
    const order = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"]
    const grouped = new Map<string, { age: string; Male: number; Female: number }>()

    order.forEach((age) => {
      grouped.set(age, {
        age,
        Male: 0,
        Female: 0,
      })
    })

    ;(data?.ageGenderDistribution || []).forEach((item) => {
      const age = getGenderAgeLabel(item)
      if (age === "-" || !grouped.has(age)) return

      const existing = grouped.get(age) || { age, Male: 0, Female: 0 }
      const directMale = toNumber(item.Male ?? item.male ?? item["Laki-laki"] ?? item.lakiLaki)
      const directFemale = toNumber(item.Female ?? item.female ?? item.Perempuan ?? item.perempuan)

      if (directMale > 0 || directFemale > 0) {
        existing.Male += directMale
        existing.Female += directFemale
        grouped.set(age, existing)
        return
      }

      const gender = getGenderFromBreakdown(item)
      const value = toNumber(item.total ?? item.value ?? item.metricValue)
      if (gender === "-") return

      existing[gender] += value
      grouped.set(age, existing)
    })

    const stackedRows = Array.from(grouped.values())
    if (stackedRows.some((item) => item.Male > 0 || item.Female > 0)) {
      return stackedRows
    }

    const malePct = data?.genderDistribution.find((item) => item.name.toLowerCase() === "male")?.value || 0
    const femalePct = data?.genderDistribution.find((item) => item.name.toLowerCase() === "female")?.value || 0
    const genderTotal = malePct + femalePct
    const maleShare = genderTotal > 0 ? malePct / genderTotal : 0
    const femaleShare = genderTotal > 0 ? femalePct / genderTotal : 0

    return order.map((age) => {
      const ageValue = toNumber(data?.ageDistribution?.find((item) => item.age === age)?.value)
      return {
        age,
        Male: Number((ageValue * maleShare).toFixed(1)),
        Female: Number((ageValue * femaleShare).toFixed(1)),
      }
    })
  }, [data])

  if (loading) {
    return (
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
          Loading audience insights...
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <BusinessErrorAlert
        title="Audience Insight"
        message={error.message}
        suggestion={error.suggestion}
        technicalDetails={error.technical}
        showTechnicalDetails={canViewTechnicalDetails}
      />
    )
  }

  if (!data?.hasData) {
    return (
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-600" />
          <div>
            <p className="font-medium">No audience insight data is available yet.</p>
            <p className="text-sm text-muted-foreground">Sync InstaSight first to populate audience demographics from Meta.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Audience Profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">Instagram audience profile based on synced Meta Graph API data.</p>
        </div>

        {onBack ? (
          <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Performance
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dominant Gender</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{data.summary.dominantGender}</p>
                <p className="text-sm text-muted-foreground">{formatPercent(data.summary.dominantGenderPct)}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                <VenusAndMars size={22} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dominant Age</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{data.summary.dominantAgeGroup}</p>
                <p className="text-sm text-muted-foreground">Strongest age band</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
                <Users size={22} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Top City</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{data.summary.topCity}</p>
                <p className="text-sm text-muted-foreground">{formatPercent(data.summary.topCityPct)}</p>
              </div>
              <div className="rounded-xl bg-sky-50 p-3 text-sky-700">
                <MapPin size={22} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Audience Insight</p>
                <p className="mt-1 text-base font-semibold leading-6 text-foreground">Profile ready</p>
                <p className="text-sm text-muted-foreground">Use this to guide Meta content and targeting.</p>
              </div>
              <div className="rounded-xl bg-violet-50 p-3 text-violet-700">
                <Sparkles size={22} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Gender Distribution</CardTitle>
            <CardDescription>Audience composition by gender.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.genderDistribution} dataKey="value" nameKey="name" innerRadius={70} outerRadius={105} paddingAngle={3}>
                    {data.genderDistribution.map((entry) => (
                      <Cell key={entry.name} fill={getAudienceColor(entry.name)} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={28} />
                  <Tooltip formatter={(value: number) => formatPercent(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Age and Gender</CardTitle>
            <CardDescription>Audience distribution by age band and gender.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageGenderChartData.filter((item) => item.Male > 0 || item.Female > 0)} barCategoryGap="22%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="age" />
                  <YAxis />
                  <Legend verticalAlign="top" height={28} />
                  <Tooltip formatter={(value: number) => formatPercent(Number(value))} labelFormatter={(label) => `Age ${label}`} />
                  <Bar dataKey="Male" name="Male" fill={AUDIENCE_COLORS.male} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Female" name="Female" fill={AUDIENCE_COLORS.female} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Top Cities</CardTitle>
            <CardDescription>Cities with the strongest audience contribution.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.topCities.map((item) => (
              <div key={item.city}>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{item.city}</p>
                  <p className="text-sm text-muted-foreground">{formatPercent(item.value)}</p>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100">
                  <div className="h-3 rounded-full bg-amber-400" style={{ width: `${Math.min(item.value, 100)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Top Countries</CardTitle>
            <CardDescription>Country concentration from Meta follower demographics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(data.topCountries || []).map((item) => (
              <div key={item.country}>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{item.country}</p>
                  <p className="text-sm text-muted-foreground">{formatPercent(item.value)}</p>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100">
                  <div className="h-3 rounded-full bg-sky-400" style={{ width: `${Math.min(item.value, 100)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Audience Insight</CardTitle>
            <CardDescription>Short business summary from synced audience profile data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-secondary/20 p-4">
              <p className="text-sm leading-7 text-muted-foreground">{data.personaInsight}</p>
            </div>
            <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-foreground">Recommendation</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Focus Meta content and targeting on {data.summary.dominantGender.toLowerCase()} audience in the {data.summary.dominantAgeGroup} age band, especially around {data.summary.topCity}.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
