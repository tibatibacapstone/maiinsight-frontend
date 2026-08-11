"use client"

import { useEffect, useState } from "react"
import { LoginPage } from "@/components/login-page"
import { DashboardLayout } from "@/components/dashboard-layout"
import type { PageId } from "@/components/dashboard-sidebar"
import type { UserRole } from "@/lib/roles"
import { getApiUrl } from "@/lib/api"

type LoginResponse = {
  token: string
  user: {
    role: UserRole
  }
}

const DEFAULT_PAGE: PageId = "dashboard"
const VALID_PAGES = new Set<PageId>([
  "dashboard",
  "segments",
  "data",
  "targeting",
  "genai",
  "instasight",
  "history",
  "settings",
  "reports",
])

const getRequestedPage = (): PageId => {
  if (typeof window === "undefined") return DEFAULT_PAGE

  const page = new URLSearchParams(window.location.search).get("page") as PageId | null
  return page && VALID_PAGES.has(page) ? page : DEFAULT_PAGE
}

const syncPageToUrl = (page: PageId) => {
  if (typeof window === "undefined") return

  const url = new URL(window.location.href)
  if (page === DEFAULT_PAGE) {
    url.searchParams.delete("page")
  } else {
    url.searchParams.set("page", page)
  }

  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`)
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<UserRole>("operational")
  const [currentPage, setCurrentPage] = useState<PageId>(DEFAULT_PAGE)
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = localStorage.getItem("maiinToken")
    const storedRole = localStorage.getItem("maiinRole") as UserRole | null

    if (storedToken && storedRole) {
      setUserRole(storedRole)
      setCurrentPage(getRequestedPage())
      setIsAuthenticated(true)
    } else {
      localStorage.removeItem("maiinToken")
      localStorage.removeItem("maiinRole")
      localStorage.removeItem("maiinUser")
    }
  }, [])

  const handleLogin = (token: string, user: LoginResponse["user"]) => {
    setIsAuthenticated(true)
    setUserRole(user.role)
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
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setUserRole("operational")
    setCurrentPage(DEFAULT_PAGE)
    setAuthError(null)

    localStorage.removeItem("maiinToken")
    localStorage.removeItem("maiinRole")
    localStorage.removeItem("maiinUser")

    localStorage.removeItem("token")
    localStorage.removeItem("authToken")
    localStorage.removeItem("accessToken")
    localStorage.removeItem("maiinsight_token")
    localStorage.removeItem("user")
    localStorage.removeItem("maiinsight_user")
  }

  const handleNavigate = (page: PageId) => {
    setCurrentPage(page)
    syncPageToUrl(page)
  }

  const handleLoginSubmit = async (email: string, password: string) => {
    setIsLoading(true)
    setAuthError(null)

    try {
      const response = await fetch(getApiUrl("/auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        const message = data?.error || "Invalid credentials"
        setAuthError(message)
        return
      }

      const loginData = data as LoginResponse
      handleLogin(loginData.token, loginData.user)
    } catch {
      setAuthError("Unable to connect to the API. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleCredential = async (credential: string) => {
    setIsLoading(true)
    setAuthError(null)

    try {
      const response = await fetch(getApiUrl("/auth/google"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ credential }),
      })

      const data = await response.json()

      if (!response.ok) {
        const message = data?.error || "Google login failed"
        setAuthError(message)
        return
      }

      const loginData = data as LoginResponse
      handleLogin(loginData.token, loginData.user)
    } catch {
      setAuthError("Unable to connect to the API. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <LoginPage
        onSubmit={handleLoginSubmit}
        onGoogleCredential={handleGoogleCredential}
        isLoading={isLoading}
        error={authError}
      />
    )
  }

  return (
    <DashboardLayout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      userRole={userRole}
    />
  )
}
