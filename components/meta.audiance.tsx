"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ArrowLeft, MapPin, Sparkles, Users, VenusAndMars } from "lucide-react"
import { Button } from "@/components/ui/button"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type GenderItem = {
  name: string
  value: number
}

type AgeItem = {
  age?: string
  name?: string
  breakdownValue?: string
  gender?: string
  breakdownType?: string

  total?: number | string
  value?: number | string
  metricValue?: number | string

  male?: number | string
  female?: number | string
  lakiLaki?: number | string
  perempuan?: number | string
  "Laki-laki"?: number | string
  Perempuan?: number | string
} 
type CityItem = {
  city: string
  value: number
}

type AudienceSummary = {
  summary: {
    dominantGender: string
    dominantGenderPct: number
    dominantAgeGroup: string
    topCity: string
    topCityPct: number
  }
  genderDistribution: GenderItem[]
  ageGenderDistribution: AgeItem[]
  topCities: CityItem[]
  personaInsight: string
}

const AUDIENCE_COLORS = {
  male: "#16A34A", // green utama
  female: "#ffc47d", // teal soft
  unknown: "#a5aba1", // neutral slate
}

function getAudienceColor(name: string) {
  const label = name.toLowerCase()

  if (label.includes("laki")) return AUDIENCE_COLORS.male
  if (label.includes("perempuan")) return AUDIENCE_COLORS.female
  if (label.includes("tidak")) return AUDIENCE_COLORS.unknown

  return AUDIENCE_COLORS.unknown
}

function formatPercent(value: number | undefined) {
  return `${Number(value || 0).toFixed(1)}%`
}

function toNumber(value: unknown) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function getAgeLabel(item: AgeItem) {
  return item.age ?? item.name ?? item.breakdownValue ?? "-"
}

function getAgeValue(item: AgeItem) {
  return toNumber(
    item.total ??
      item.value ??
      item.metricValue ??
      toNumber(item.female) + toNumber(item.male)
  )
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
  const raw = String(
    item.gender ?? item.breakdownValue ?? item.name ?? ""
  ).toLowerCase()

  if (
    raw === "f" ||
    raw.includes("female") ||
    raw.includes("perempuan") ||
    raw.startsWith("f.") ||
    raw.startsWith("f_") ||
    raw.startsWith("f-")
  ) {
    return "Perempuan"
  }

  if (
    raw === "m" ||
    raw.includes("male") ||
    raw.includes("laki") ||
    raw.startsWith("m.") ||
    raw.startsWith("m_") ||
    raw.startsWith("m-")
  ) {
    return "Laki-laki"
  }

  return "-"
}

type MetaAudienceProps = {
  onBack?: () => void
}

export function MetaAudience({ onBack }: MetaAudienceProps) {
  return <MetaAudienceCharts onBack={onBack} />
}

function MetaAudienceCharts({ onBack }: MetaAudienceProps) {
  const [data, setData] = useState<AudienceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const fetchAudienceSummary = async () => {
      try {
        setLoading(true)
        setErrorMessage("")

        const response = await fetch(`${API_URL}/api/meta/audience-summary`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error("Failed to fetch audience summary")
        }

        const result = await response.json()
        setData(result)
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load audience data"
        )
      } finally {
        setLoading(false)
      }
    }

    fetchAudienceSummary()
  }, [])

  const ageGenderChartData = useMemo(() => {
  const order = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"]

  const grouped = new Map<
    string,
    {
      age: string
      "Laki-laki": number
      Perempuan: number
    }
  >()

  order.forEach((age) => {
    grouped.set(age, {
      age,
      "Laki-laki": 0,
      Perempuan: 0,
    })
  })

  ;(data?.ageGenderDistribution || []).forEach((item) => {
    const age = getGenderAgeLabel(item)

    if (age === "-" || !grouped.has(age)) return

    const existing =
      grouped.get(age) || {
        age,
        "Laki-laki": 0,
        Perempuan: 0,
      }

    const directMale = toNumber(
      item["Laki-laki"] ?? item.lakiLaki ?? item.male
    )

    const directFemale = toNumber(
      item.Perempuan ?? item.perempuan ?? item.female
    )

    // Case 1: backend sudah mengirim data dalam bentuk male/female per age
    if (directMale > 0 || directFemale > 0) {
      existing["Laki-laki"] += directMale
      existing.Perempuan += directFemale
      grouped.set(age, existing)
      return
    }

    // Case 2: backend mengirim data mentah seperti M.35-44 / F.35-44
    const gender = getGenderFromBreakdown(item)
    const value = getAgeValue(item)

    if (gender === "-") return

    existing[gender] += value
    grouped.set(age, existing)
  })

  const rawData = Array.from(grouped.values())

  const total = rawData.reduce(
    (sum, item) => sum + item["Laki-laki"] + item.Perempuan,
    0
  )

  if (total === 0) return rawData

  return rawData.map((item) => ({
    age: item.age,
    "Laki-laki": Number(((item["Laki-laki"] / total) * 100).toFixed(1)),
    Perempuan: Number(((item.Perempuan / total) * 100).toFixed(1)),
  }))
}, [data])

const dominantAgeFromChart = useMemo(() => {
  if (!ageGenderChartData.length) return "-"

  return [...ageGenderChartData]
    .map((item) => ({
      age: item.age,
      total: item["Laki-laki"] + item.Perempuan,
    }))
    .sort((a, b) => b.total - a.total)[0]?.age ?? "-"
}, [ageGenderChartData])

const dominantAgeGroup =
  data?.summary.dominantAgeGroup && data.summary.dominantAgeGroup !== "-"
    ? data.summary.dominantAgeGroup
    : dominantAgeFromChart

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500">
        Loading audience insights...
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
        {errorMessage}
      </div>
    )
  }

  if (!data) return null

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div>
    <h2 className="text-2xl font-bold text-slate-900">Audience Profile</h2>
    <p className="mt-1 text-sm text-slate-500">
      Profil audiens Instagram berdasarkan data Meta API.
    </p>
  </div>

  {onBack && (
    <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
      <ArrowLeft className="h-4 w-4" />
      Back to Performance
    </Button>
  )}
</div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Dominant Gender</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {data.summary.dominantGender}
              </p>
              <p className="text-sm text-slate-500">
                {formatPercent(data.summary.dominantGenderPct)}
              </p>
            </div>
            <div className="rounded-xl bg-purple-50 p-3 text-purple-700">
              <VenusAndMars size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Dominant Age</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {dominantAgeGroup}
              </p>
              <p className="text-sm text-slate-500">Age group tertinggi</p>
            </div>
            <div className="rounded-xl bg-pink-50 p-3 text-pink-700">
              <Users size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Top City</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {data.summary.topCity}
              </p>
              <p className="text-sm text-slate-500">
                {formatPercent(data.summary.topCityPct)}
              </p>
            </div>
            <div className="rounded-xl bg-orange-50 p-3 text-orange-700">
              <MapPin size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500"></p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                
              </p>
              <p className="text-sm text-slate-500"></p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
              <Sparkles size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Gender Distribution
            </h3>
            <p className="text-sm text-slate-500">
              Komposisi audiens berdasarkan gender.
            </p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.genderDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={3}
                >
                  {data.genderDistribution.map((entry, index) => (
                    <Cell key={entry.name} fill={getAudienceColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatPercent(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex justify-center gap-8">
            {data.genderDistribution.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: getAudienceColor(item.name) }}
                />
                <div>
                  <p className="text-sm font-medium text-slate-700">{item.name}</p>
                  <p className="text-sm text-slate-500">{formatPercent(item.value)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
  <div className="mb-4">
    <h3 className="text-lg font-semibold text-slate-900">
      Usia & Jenis Kelamin
    </h3>
    <p className="text-sm text-slate-500">
      Distribusi audiens berdasarkan kelompok usia dan gender.
    </p>
  </div>

  <div className="h-[330px]">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
  data={ageGenderChartData.filter(
    (item) => item["Laki-laki"] > 0 || item.Perempuan > 0
  )}
  barCategoryGap="22%"
>
  <CartesianGrid strokeDasharray="3 3" vertical={false} />
  <XAxis dataKey="age" />
  <YAxis tickFormatter={(value) => `${value}%`} />
  <Tooltip
    formatter={(value: number) => `${Number(value).toFixed(1)}%`}
    labelFormatter={(label) => `Usia ${label}`}
  />
  <Bar
  dataKey="Laki-laki"
  name="Laki-laki"
  fill={AUDIENCE_COLORS.male}
  radius={[6, 6, 0, 0]}
/>
<Bar
  dataKey="Perempuan"
  name="Perempuan"
  fill={AUDIENCE_COLORS.female}
  radius={[6, 6, 0, 0]}
/>
</BarChart>
    </ResponsiveContainer>
  </div>

  <div className="mt-4 flex justify-center gap-8">
    <div className="flex items-center gap-2">
      <span
  className="h-3 w-3 rounded-sm"
  style={{ backgroundColor: AUDIENCE_COLORS.male }}
/>
      <div>
        <p className="text-sm font-medium text-slate-700">Laki-laki</p>
        <p className="text-sm text-slate-500">
          {formatPercent(data.genderDistribution.find((item) => item.name === "Laki-laki")?.value)}
        </p>
      </div>
    </div>

    <div className="flex items-center gap-2">
      <span
  className="h-3 w-3 rounded-sm"
  style={{ backgroundColor: AUDIENCE_COLORS.female }}
/>
      <div>
        <p className="text-sm font-medium text-slate-700">Perempuan</p>
        <p className="text-sm text-slate-500">
          {formatPercent(data.genderDistribution.find((item) => item.name === "Perempuan")?.value)}
        </p>
      </div>
    </div>
  </div>
</div>
</div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Top Cities</h3>
            <p className="text-sm text-slate-500">
              Kota dengan kontribusi audiens tertinggi.
            </p>
          </div>

          <div className="space-y-4">
            {data.topCities.map((item) => (
              <div key={item.city}>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">{item.city}</p>
                  <p className="text-sm text-slate-500">{formatPercent(item.value)}</p>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-orange-300"
                    style={{ width: `${Math.min(item.value, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Audience Insight
            </h3>
            <p className="text-sm text-slate-500">
              Kesimpulan singkat dari profil audiens.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm leading-7 text-slate-700">
              {data.personaInsight}
            </p>
          </div>

          <div className="mt-5 rounded-xl border border-purple-100 bg-purple-50 p-4">
            <p className="text-sm font-semibold text-purple-900">
              Recommendation
            </p>
            <p className="mt-2 text-sm leading-7 text-purple-800">
              Fokuskan konten pada audiens utama yaitu {data.summary.dominantGender.toLowerCase()} usia{" "}
              {dominantAgeGroup}, terutama area {data.summary.topCity}. Gunakan visual dan caption yang relevan dengan segmen urban dan working-age audience.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
