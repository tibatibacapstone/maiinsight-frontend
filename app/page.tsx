"use client"

import { useEffect, useState } from "react"
import { LoginPage } from "@/components/login-page"
import { DashboardLayout } from "@/components/dashboard-layout"
import type { PageId } from "@/components/dashboard-sidebar"

type UserRole = "admin" | "marketing" | "management" | "it_support"

type LoginResponse = {
  token: string
  user: {
    role: UserRole
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000"

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<UserRole>("admin")
  const [currentPage, setCurrentPage] = useState<PageId>("dashboard")
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = localStorage.getItem("maiinToken")
    const storedRole = localStorage.getItem("maiinRole") as UserRole | null

    if (storedToken && storedRole) {
      setUserRole(storedRole)
      setIsAuthenticated(true)
    }
  }, [])

  const handleLogin = (token: string, role: UserRole) => {
    setIsAuthenticated(true)
    setUserRole(role)
    setCurrentPage("dashboard")
    localStorage.setItem("maiinToken", token)
    localStorage.setItem("maiinRole", role)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setCurrentPage("dashboard")
    setAuthError(null)
    localStorage.removeItem("maiinToken")
    localStorage.removeItem("maiinRole")
  }

  const handleNavigate = (page: PageId) => {
    setCurrentPage(page)
  }

  const handleLoginSubmit = async (email: string, password: string) => {
    setIsLoading(true)
    setAuthError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
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
      handleLogin(loginData.token, loginData.user.role)
    } catch (error) {
      setAuthError("Unable to connect to the API. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <LoginPage
        onSubmit={handleLoginSubmit}
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
