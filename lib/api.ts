const DEFAULT_API_URL = "http://localhost:5000"

const normalizeApiBaseUrl = (value?: string) => {
  const baseUrl = (value || DEFAULT_API_URL).trim().replace(/\/+$/, "")

  if (baseUrl.endsWith("/api")) {
    return baseUrl.slice(0, -4)
  }

  return baseUrl
}

export const apiBaseUrl = normalizeApiBaseUrl(
  process.env.NEXT_PUBLIC_API_URL
)

export const getApiUrl = (path = "/health") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`

  if (normalizedPath.startsWith("/api/")) {
    return `${apiBaseUrl}${normalizedPath}`
  }

  return `${apiBaseUrl}/api${normalizedPath}`
}