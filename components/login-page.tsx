"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  BarChart3,
  Eye,
  EyeOff
} from "lucide-react"

interface LoginPageProps {
  onLogin: () => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsLoading(true)

    // Simulate authentication delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    onLogin()
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)

    // Simulate Google authentication delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    onLogin()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/10">
      
      {/* Background Glow Effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/15 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/20 rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-0 w-[300px] h-[300px] bg-chart-2/15 rounded-full blur-3xl" />

      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 relative z-10">

        {/* Left Side - Branding */}
        <div className="flex flex-col justify-center space-y-6 lg:pr-8">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-7 w-7 text-primary" />
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                MaiinSight
              </h1>

              <p className="text-muted-foreground text-sm">
                Decision Support System
              </p>
            </div>
          </div>

          {/* Hero Text */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground/90">
              Welcome to Maiin Gandaria Analytics
            </h2>

            <p className="text-muted-foreground leading-relaxed">
              Unlock powerful insights with real-time analytics,
              AI-driven strategies, and comprehensive data
              visualization for smarter business decisions.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-4 pt-4">

            {[
              {
                label: "Real-time Analytics",
                value: "Live",
                color: "text-primary"
              },
              {
                label: "AI Strategies",
                value: "GenAI",
                color: "text-chart-3"
              },
              {
                label: "Data Sources",
                value: "Unified",
                color: "text-chart-2"
              },
              {
                label: "Performance",
                value: "Insights",
                color: "text-chart-4"
              }
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow"
              >
                <p className={`${stat.color} font-bold text-lg`}>
                  {stat.value}
                </p>

                <p className="text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}

          </div>
        </div>

        {/* Right Side - Login Form */}
        <Card className="border-border bg-card shadow-xl shadow-primary/5">

          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl">
              Sign in
            </CardTitle>

            <CardDescription>
              Continue with your Google account or email
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">

            {/* Google Login */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-12"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <svg
                className="h-5 w-5 mr-2"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />

                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />

                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />

                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>

              {isLoading ? "Signing in..." : "Continue with Google"}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>

              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Email Login Form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email
                </Label>

                <Input
                  id="email"
                  type="email"
                  placeholder="name@maiin.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-secondary/50"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password
                </Label>

                <div className="relative">

                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-secondary/50 pr-10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>

                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>

            </form>

            {/* Footer */}
            <p className="text-center text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service
              and Privacy Policy
            </p>

          </CardContent>
        </Card>
      </div>
    </div>
  )
}