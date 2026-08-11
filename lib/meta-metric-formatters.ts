export type NullableMetric = number | null | undefined

export const finiteMetric = (value: NullableMetric): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null

export const formatMetaPercent = (value: NullableMetric): string => {
  const metric = finiteMetric(value)
  return metric == null ? "Not available" : `${Number(metric.toFixed(1))}%`
}

export const formatMetaNumber = (value: NullableMetric): string => {
  const metric = finiteMetric(value)
  return metric == null
    ? "Not available"
    : new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(metric)
}

export const calculatePercentChange = (
  current: NullableMetric,
  previous: NullableMetric
): number | null => {
  const currentMetric = finiteMetric(current)
  const previousMetric = finiteMetric(previous)
  if (currentMetric == null || previousMetric == null || previousMetric === 0) return null
  return ((currentMetric - previousMetric) / previousMetric) * 100
}

export function buildMetaComparisonInsight({
  reportAvailable,
  configured,
  hasData,
  revenue,
  reach,
  engagementRate,
}: {
  reportAvailable: boolean
  configured: boolean
  hasData: boolean
  revenue: NullableMetric
  reach: NullableMetric
  engagementRate: NullableMetric
}): string {
  if (!reportAvailable) return "Revenue data is not available yet for comparison with Meta."
  if (!configured) {
    return "Meta is not connected yet. Sync Instagram data first if you want to compare revenue with ads reach."
  }
  if (!hasData) {
    return "No Meta data for this period yet. Revenue data is ready, but ads reach data is not available for comparison."
  }

  const safeRevenue = finiteMetric(revenue)
  const safeReach = finiteMetric(reach)
  const safeEngagementRate = finiteMetric(engagementRate)
  if (safeRevenue == null || safeReach == null || safeEngagementRate == null) {
    return "Historical Meta reach or engagement rate is not available for this period, so a revenue comparison cannot be calculated."
  }
  if (safeReach === 0) {
    return `Revenue was IDR ${Math.round(safeRevenue).toLocaleString("id-ID")} while Meta reach was 0. Revenue per 1K reach is not available because the comparison denominator is zero.`
  }

  const revenuePer1kReach = safeRevenue / (safeReach / 1000)
  return `Revenue was IDR ${Math.round(safeRevenue).toLocaleString("id-ID")} with ${formatMetaNumber(safeReach)} reach from Meta ads in this period. That's about IDR ${Math.round(revenuePer1kReach).toLocaleString("id-ID")} per 1K reach with ${formatMetaPercent(safeEngagementRate)} engagement rate.`
}
