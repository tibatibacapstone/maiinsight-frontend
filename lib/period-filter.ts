export type PeriodType = "MTD" | "YTD"

export interface PeriodFilter {
  month: number | null
  year: number
  periodType: PeriodType
}

export const REPORTING_TIME_ZONE = "Asia/Bangkok"

export interface ReportingCalendarDate {
  year: number
  month: number
  day: number
}

const isValidYear = (value: number) => Number.isInteger(value) && value >= 2000 && value <= 2100
const isValidMonth = (value: number) => Number.isInteger(value) && value >= 1 && value <= 12
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sept", "Oct", "Nov", "Dec",
]

export const normalizeMonthNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return null
  if (String(value).trim().toLowerCase() === "all month") return null
  if (String(value).trim().toLowerCase() === "all") return null
  const numeric = Number(value)
  if (isValidMonth(numeric)) return numeric
  const index = MONTH_LABELS.findIndex(
    (label) => label.toLowerCase() === String(value).trim().toLowerCase()
  )
  return index >= 0 ? index + 1 : null
}

const bangkokCalendarFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: REPORTING_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

export const getBangkokCalendarDate = (value: Date): ReportingCalendarDate => {
  if (Number.isNaN(value.getTime())) throw new RangeError("Invalid reporting date")
  const parts = Object.fromEntries(
    bangkokCalendarFormatter
      .formatToParts(value)
      .filter(({ type }) => type === "year" || type === "month" || type === "day")
      .map(({ type, value: partValue }) => [type, Number(partValue)])
  )
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  }
}

const formatCalendarDate = ({ year, month, day }: ReportingCalendarDate) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`

export const formatBangkokDate = (value: Date) =>
  formatCalendarDate(getBangkokCalendarDate(value))

// Retained for compatibility with existing imports. Reporting dates are no
// longer browser-local; the canonical business calendar is Asia/Bangkok.
export const formatLocalDate = formatBangkokDate

const getDaysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate()

export const getPreviousCalendarMonth = (year: number, month: number) => {
  if (!isValidYear(year) || !isValidMonth(month)) {
    throw new RangeError("Invalid reporting month")
  }
  return month === 1
    ? { year: year - 1, month: 12 }
    : { year, month: month - 1 }
}

export const resolvePeriodDateRange = (
  filter: PeriodFilter,
  today = new Date()
) => {
  const bangkokToday = getBangkokCalendarDate(today)
  const year = isValidYear(filter.year) ? filter.year : bangkokToday.year

  if (filter.month === null) {
    return {
      startDate: `${year}-01-01`,
      endDate:
        year === bangkokToday.year
          ? formatCalendarDate(bangkokToday)
          : `${year}-12-31`,
    }
  }

  const month = isValidMonth(filter.month) ? filter.month : bangkokToday.month
  const isCurrentMonth =
    year === bangkokToday.year && month === bangkokToday.month
  const endDay = isCurrentMonth ? bangkokToday.day : getDaysInMonth(year, month)

  return {
    startDate:
      filter.periodType === "YTD"
        ? `${year}-01-01`
        : formatCalendarDate({ year, month, day: 1 }),
    endDate: formatCalendarDate({ year, month, day: endDay }),
  }
}

export const buildPeriodSearchParams = (
  filter: PeriodFilter,
  additional: Record<string, string> = {}
) =>
  new URLSearchParams({
    month: filter.month === null ? "all" : String(filter.month),
    year: String(filter.year),
    periodType: filter.periodType,
    ...additional,
  })
