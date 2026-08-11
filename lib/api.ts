const DEVELOPMENT_API_URL = "http://localhost:5000"

interface ApiEnvironment {
  baseUrl?: string
  legacyUrl?: string
  nodeEnv?: string
}

const isPlaceholderApiUrl = (value: string) => {
  const normalized = value.trim().toLowerCase()
  if (
    normalized.includes("your_backend_url") ||
    normalized.includes("your-backend-url") ||
    normalized.includes("replace-me") ||
    normalized.includes("placeholder")
  ) {
    return true
  }

  try {
    const hostname = new URL(normalized).hostname
    return (
      hostname === "example.com" ||
      hostname.endsWith(".example.com") ||
      hostname === "your-backend.example.com"
    )
  } catch {
    return false
  }
}

const normalizeConfiguredApiUrl = (value: string) => {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(value.trim())
  } catch {
    throw new Error("Frontend API URL must be a valid absolute HTTP or HTTPS URL.")
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Frontend API URL must use the HTTP or HTTPS protocol.")
  }

  let normalized = value.trim().replace(/\/+$/, "")
  if (normalized.endsWith("/api")) normalized = normalized.slice(0, -4)
  return normalized
}

export const resolveApiBaseUrl = ({
  baseUrl,
  legacyUrl,
  nodeEnv = process.env.NODE_ENV,
}: ApiEnvironment = {}) => {
  const configuredValue = baseUrl?.trim() || legacyUrl?.trim()

  if (configuredValue) {
    if (isPlaceholderApiUrl(configuredValue)) {
      throw new Error(
        "Frontend API URL is still a placeholder. Configure NEXT_PUBLIC_API_BASE_URL or NEXT_PUBLIC_API_URL."
      )
    }
    return normalizeConfiguredApiUrl(configuredValue)
  }

  if (nodeEnv === "development") return DEVELOPMENT_API_URL

  throw new Error(
    "A valid NEXT_PUBLIC_API_BASE_URL or NEXT_PUBLIC_API_URL is required for production."
  )
}

export const getApiBaseUrl = (environment?: ApiEnvironment) =>
  resolveApiBaseUrl(
    environment || {
      baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
      legacyUrl: process.env.NEXT_PUBLIC_API_URL,
      nodeEnv: process.env.NODE_ENV,
    }
  )

export const buildApiUrlFromBase = (baseUrl: string, path = "/health") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return normalizedPath.startsWith("/api/")
    ? `${baseUrl}${normalizedPath}`
    : `${baseUrl}/api${normalizedPath}`
}

export const buildApiUrl = (path = "/health", environment?: ApiEnvironment) =>
  buildApiUrlFromBase(getApiBaseUrl(environment), path)

export const getApiUrl = buildApiUrl
