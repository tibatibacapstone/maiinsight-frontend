export const TRANSACTION_DATE_TIME_ZONE = "Asia/Bangkok"

const formatBangkokCalendarDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TRANSACTION_DATE_TIME_ZONE,
  }).format(date)

export const formatLatestTransactionDate = (value?: string | null) => {
  if (!value) return "No data"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "No data"

  return formatBangkokCalendarDate(date)
}

export const formatDatabaseLastSyncDateTime = (value?: string | null) => {
  if (!value) return "Not synced yet"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not synced yet"
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TRANSACTION_DATE_TIME_ZONE,
  }).format(date)
}
