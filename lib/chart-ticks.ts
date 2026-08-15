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

// Beyond this many points, "every odd calendar day" still leaves 14-16
// labels crowded onto the axis (a full 28-31 day MTD month), so a fixed
// milestone pattern takes over instead. At or under this count, the odd-day
// density already reads fine.
const WIDE_SPACING_THRESHOLD = 21

// Fixed day-of-month milestones for long (full-month) ranges: 1, 5, 10, 15,
// 20, 25, plus whatever the actual last day of the range is (28/29/30/31).
const MILESTONE_DAYS = new Set([1, 5, 10, 15, 20, 25])

// Builds the X-axis tick labels for a DAILY trend series.
//
// - 1-2 points: every label is kept so the chart stays readable.
// - Up to WIDE_SPACING_THRESHOLD points: only odd calendar days (1, 3, 5,
//   ...) get a visible label. Even dates remain in the data array and are
//   still plotted by the chart, just unlabeled.
// - Beyond that (e.g. a full calendar month under MTD): odd-day spacing
//   alone is still too dense, so only the fixed milestones 1, 5, 10, 15, 20,
//   25, and the range's actual last day are labeled.
//
// Selection is always based on the real date, never the array position, so
// missing dates in the series don't shift which days get labeled.
//
// Returns `undefined` when the series is not daily (e.g. monthly buckets) so
// the chart keeps its default tick rendering.
export const getDailyXTicks = (points: DailyTrendPoint[]): string[] | undefined => {
  if (points.length === 0) return undefined

  const parsedDays = points.map((point) => getIsoDateParts(point.key))
  const isDaily = parsedDays.every((parts) => parts !== null)
  if (!isDaily) return undefined

  const labels = points.map((point) => point.label)

  // Very short ranges (1-2 dates) always keep every label so the chart stays readable.
  if (points.length <= 2) return labels

  if (points.length <= WIDE_SPACING_THRESHOLD) {
    const oddLabels = points
      .filter((_, index) => (parsedDays[index] as IsoDateParts).day % 2 === 1)
      .map((point) => point.label)

    // Readability fallback: if few/no dates are odd (e.g. the data only
    // contains even days), show every label instead of an almost-empty axis.
    if (oddLabels.length < 2) return labels
    return oddLabels
  }

  const lastIndex = points.length - 1

  return points
    .filter((_, index) => MILESTONE_DAYS.has((parsedDays[index] as IsoDateParts).day) || index === lastIndex)
    .map((point) => point.label)
}
