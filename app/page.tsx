"use client"

import { useState } from "react"
import { LoginPage } from "@/components/login-page"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/lib/auth-context"

export default function Home() {
  const {
    isAuthenticated,
    isLoading,
    userRole,
    currentPage,
    navigate,
    logout,
    loginSubmit,
    googleLogin,
  } = useAuth()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const handleLoginSubmit = async (email: string, password: string) => {
    setIsSubmitting(true)
    setAuthError(null)

    const error = await loginSubmit(email, password)
    if (error) setAuthError(error)

    setIsSubmitting(false)
  }

  const handleGoogleCredential = async (credential: string) => {
    setIsSubmitting(true)
    setAuthError(null)

    const error = await googleLogin(credential)
    if (error) setAuthError(error)

    setIsSubmitting(false)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading MaiinSight...
      </div>
    )
  }

  if (!isAuthenticated || !userRole) {
    return (
      <LoginPage
        onSubmit={handleLoginSubmit}
        onGoogleCredential={handleGoogleCredential}
        isLoading={isSubmitting}
        error={authError}
      />
    )
  }

  return (
    <DashboardLayout
      currentPage={currentPage}
      onNavigate={navigate}
      onLogout={logout}
      userRole={userRole}
    />
  )
}
