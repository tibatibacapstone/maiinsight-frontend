"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { UserRole, normalizeRole, canAccessPage, getAuthHeaders } from "@/lib/roles"

type LoginResponse = {
  token: string
  user: { role: UserRole }
}

export interface CurrentUser {
  id?: number
  email?: string
  name?: string
  role: UserRole
  avatar?: string | null
}

export type PageId =
  | "dashboard" | "segments" | "data" | "targeting"
  | "genai" | "instasight" | "history" | "settings" | "reports"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000"
export const DEFAULT_PAGE: PageId = "dashboard"

const IDLE_TIMEOUT_MS = 10 * 60 * 1000
const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000

export const VALID_PAGES = new Set<PageId>([
  "dashboard", "segments", "data", "targeting",
  "genai", "instasight", "history", "settings", "reports",
])

interface AuthContextValue {
  isAuthenticated: boolean
  isLoading: boolean
  userRole: UserRole | null
  user: CurrentUser | null
  currentPage: PageId
  navigate: (page: PageId) => void
  login: (token: string, user: LoginResponse["user"]) => void
  logout: () => void
  updateProfile: (updates: { name?: string; avatar?: string | null }) => Promise<string | null>
  loginSubmit: (email: string, password: string) => Promise<string | null>
  googleLogin: (credential: string) => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

function getRequestedPage(): PageId {
  if (typeof window === "undefined") return DEFAULT_PAGE
  const page = new URLSearchParams(window.location.search).get("page") as PageId | null
  return page && VALID_PAGES.has(page) ? page : DEFAULT_PAGE
}

function syncPageToUrl(page: PageId) {
  if (typeof window === "undefined") return
  const url = new URL(window.location.href)
  if (page === DEFAULT_PAGE) {
    url.searchParams.delete("page")
  } else {
    url.searchParams.set("page", page)
  }
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`)
}

let sessionIdCounter = 0

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [sessionId, setSessionId] = useState(0)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [currentPage, setCurrentPage] = useState<PageId>(DEFAULT_PAGE)
  const lastActivityRef = useRef<number>(Date.now())
  const activityCallbackRef = useRef<(() => void) | null>(null)

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }, [])

  const startIdleTimer = useCallback(() => {
    clearIdleTimer()
    idleTimerRef.current = setTimeout(() => {
      if (isAuthenticated) {
        logout()
      }
    }, IDLE_TIMEOUT_MS)
  }, [isAuthenticated])

  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
    if (isAuthenticated) {
      clearIdleTimer()
      idleTimerRef.current = setTimeout(() => {
        logout()
      }, IDLE_TIMEOUT_MS)
    }
  }, [isAuthenticated])

  const resetIdleStable = useCallback(() => {
    lastActivityRef.current = Date.now()
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }
    idleTimerRef.current = setTimeout(() => {
      logout()
    }, IDLE_TIMEOUT_MS)
  }, [])

  const logout = useCallback(() => {
    clearIdleTimer()
    setIsAuthenticated(false)
    setUserRole(null)
    setUser(null)
    setCurrentPage(DEFAULT_PAGE)

    localStorage.removeItem("maiinToken")
    localStorage.removeItem("maiinRole")
    localStorage.removeItem("maiinUser")
    localStorage.removeItem("token")
    localStorage.removeItem("authToken")
    localStorage.removeItem("accessToken")
    localStorage.removeItem("maiinsight_token")
    localStorage.removeItem("user")
    localStorage.removeItem("maiinsight_user")

    if (typeof window !== "undefined") {
      syncPageToUrl(DEFAULT_PAGE)
    }
  }, [])

  activityCallbackRef.current = isAuthenticated ? resetIdleStable : null

  useEffect(() => {
    if (!isAuthenticated) {
      clearIdleTimer()
      return
    }

    const handleActivity = () => {
      lastActivityRef.current = Date.now()
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
      idleTimerRef.current = setTimeout(() => {
        logout()
      }, IDLE_TIMEOUT_MS)
    }

    window.addEventListener("mousemove", handleActivity, { passive: true })
    window.addEventListener("mousedown", handleActivity, { passive: true })
    window.addEventListener("keydown", handleActivity, { passive: true })
    window.addEventListener("scroll", handleActivity, { passive: true })
    window.addEventListener("touchstart", handleActivity, { passive: true })

    handleActivity()

    return () => {
      clearIdleTimer()
      window.removeEventListener("mousemove", handleActivity)
      window.removeEventListener("mousedown", handleActivity)
      window.removeEventListener("keydown", handleActivity)
      window.removeEventListener("scroll", handleActivity)
      window.removeEventListener("touchstart", handleActivity)
    }
  }, [isAuthenticated])

  const login = useCallback((token: string, user: LoginResponse["user"]) => {
    setIsAuthenticated(true)
    setUserRole(user.role)
    setUser(user)
    setCurrentPage(getRequestedPage())

    localStorage.setItem("maiinToken", token)
    localStorage.setItem("maiinRole", user.role)
    localStorage.setItem("maiinUser", JSON.stringify(user))

    localStorage.removeItem("token")
    localStorage.removeItem("authToken")
    localStorage.removeItem("accessToken")
    localStorage.removeItem("maiinsight_token")
    localStorage.removeItem("user")
    localStorage.removeItem("maiinsight_user")

    syncPageToUrl(getRequestedPage())
    setSessionId(++sessionIdCounter)
  }, [])

  const navigate = useCallback((page: PageId) => {
    setCurrentPage(page)
    syncPageToUrl(page)
  }, [])

  const updateProfile = useCallback(
    async (updates: { name?: string; avatar?: string | null }): Promise<string | null> => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify(updates),
        })

        const data = await response.json().catch(() => null)

        if (!response.ok) {
          return data?.error || "Could not update your profile."
        }

        if (data?.data) {
          setUser(data.data)
          localStorage.setItem("maiinUser", JSON.stringify(data.data))
        }

        return null
      } catch {
        return "Unable to connect to the API. Please try again."
      }
    },
    []
  )

  const loginSubmit = useCallback(async (email: string, password: string): Promise<string | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        return data?.error || "Invalid credentials"
      }

      const loginData = data as LoginResponse
      login(loginData.token, loginData.user)
      return null
    } catch {
      return "Unable to connect to the API. Please try again."
    }
  }, [login])

  const googleLogin = useCallback(async (credential: string): Promise<string | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      })

      const data = await response.json()

      if (!response.ok) {
        return data?.error || "Google login failed"
      }

      const loginData = data as LoginResponse
      login(loginData.token, loginData.user)
      return null
    } catch {
      return "Unable to connect to the API. Please try again."
    }
  }, [login])

  // Initial auth check on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("maiinToken")
    const storedRole = localStorage.getItem("maiinRole") as UserRole | null
    const normalizedRole = normalizeRole(storedRole)

    if (storedToken && normalizedRole) {
      setUserRole(normalizedRole)

      const requestedPage = getRequestedPage()
      const hasAccess = canAccessPage(normalizedRole, requestedPage)
      const targetPage = hasAccess ? requestedPage : DEFAULT_PAGE

      setCurrentPage(targetPage)
      syncPageToUrl(targetPage)
      setIsAuthenticated(true)
      setSessionId(++sessionIdCounter)
    } else {
      localStorage.removeItem("maiinToken")
      localStorage.removeItem("maiinRole")
      localStorage.removeItem("maiinUser")
      syncPageToUrl(DEFAULT_PAGE)
    }

    setIsLoading(false)
  }, [])

  // Refresh user details (name, avatar) from the API after restoring the session
  useEffect(() => {
    if (!isAuthenticated || isLoading) return

    const storedUser = localStorage.getItem("maiinUser")
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        /* ignore malformed stored user */
      }
    }

    fetch(`${API_BASE_URL}/api/auth/me`, { headers: getAuthHeaders() })
      .then((response) => response.json().catch(() => null))
      .then((result) => {
        if (result?.success && result.data) {
          setUser(result.data)
          localStorage.setItem("maiinUser", JSON.stringify(result.data))
        }
      })
      .catch(() => null)
  }, [isAuthenticated, isLoading])

  // Sync URL when currentPage changes
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      syncPageToUrl(currentPage)
    }
  }, [currentPage, isAuthenticated, isLoading])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        userRole,
        user,
        currentPage,
        navigate,
        login,
        logout,
        updateProfile,
        loginSubmit,
        googleLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
