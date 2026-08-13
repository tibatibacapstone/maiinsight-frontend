export interface DailyTrendPoint {
  key?: string
  label: string
}

export interface IsoDateParts {
  year: number
  month: number
  day: number
}

const ISO_DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export const getIsoDateParts = (value?: string): IsoDateParts | null => {
  if (!value) return null

  const match = ISO_DATE_KEY_PATTERN.exec(value)
  if (!match) return null

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

// Builds the X-axis tick labels for a DAILY trend series. Only odd calendar
// days (1, 3, 5, ...) receive a visible label so the timeline stays readable;
// even dates remain in the data array and are still plotted by the chart.
//
// Returns `undefined` when the series is not daily (e.g. monthly buckets) so
// the chart keeps its default tick rendering.
export const getDailyXTicks = (points: DailyTrendPoint[]): string[] | undefined => {
  if (points.length === 0) return undefined

  const isDaily = points.every((point) => getIsoDateParts(point.key) !== null)
  if (!isDaily) return undefined

  const labels = points.map((point) => point.label)

  // Very short ranges (1-2 dates) always keep every label so the chart stays readable.
  if (points.length <= 2) return labels

  // Show only odd calendar days, based on the actual date — never the array index.
  const oddLabels = points
    .filter((point) => {
      const parts = getIsoDateParts(point.key)
      return parts !== null && parts.day % 2 === 1
    })
    .map((point) => point.label)

  // Readability fallback: if few/no dates are odd (e.g. the data only contains
  // even days), show every label instead of an almost-empty X-axis.
  if (oddLabels.length < 2) return labels

  return oddLabels
}
