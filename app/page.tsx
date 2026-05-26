"use client"

import { useState } from "react"
import { LoginPage } from "@/components/login-page"
import { DashboardLayout } from "@/components/dashboard-layout"
import type { PageId } from "@/components/dashboard-sidebar"

type UserRole = "admin" | "marketing" | "it_support"

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<UserRole>("admin")
  const [currentPage, setCurrentPage] = useState<PageId>("dashboard")

  const handleLogin = () => {
  setIsAuthenticated(true)
}

  const handleLogout = () => {
    setIsAuthenticated(false)
    setCurrentPage("dashboard")
  }

  const handleNavigate = (page: PageId) => {
    setCurrentPage(page)
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />
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
