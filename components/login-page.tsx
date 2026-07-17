"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useGoogleLogin } from "@react-oauth/google"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Eye,
  EyeOff
} from "lucide-react"
import { isGoogleConfigured } from "@/app/providers"

interface LoginPageProps {
  onSubmit: (email: string, password: string) => Promise<void>
  onGoogleCredential: (credential: string) => Promise<void>
  isLoading: boolean
  error?: string | null
}

function GoogleLoginButton({ onGoogleCredential, disabled }: { onGoogleCredential: (token: string) => Promise<void>; disabled: boolean }) {
  const [loading, setLoading] = useState(false)

  const googleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      setLoading(true)
      try {
        await onGoogleCredential(response.access_token)
      } finally {
        setLoading(false)
      }
    },
    onError: () => {},
  })

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full h-12"
      onClick={() => googleLogin()}
      disabled={disabled || loading}
    >
      <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      {loading ? "Signing in with Google..." : "Continue with Google"}
    </Button>
  )
}

function BasketballSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="#E87722" stroke="#C4601A" strokeWidth="2" />
      <path d="M60 4 C60 4 60 116 60 116" stroke="#C4601A" strokeWidth="2.5" />
      <path d="M4 60 C4 60 116 60 116 60" stroke="#C4601A" strokeWidth="2.5" />
      <path d="M16 16 C40 40 40 80 16 104" stroke="#C4601A" strokeWidth="2.5" fill="none" />
      <path d="M104 16 C80 40 80 80 104 104" stroke="#C4601A" strokeWidth="2.5" fill="none" />
      <ellipse cx="60" cy="60" rx="56" ry="56" stroke="#C4601A" strokeWidth="1" strokeDasharray="4 6" opacity="0.3" />
    </svg>
  )
}

function SoccerBallSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="white" stroke="#333" strokeWidth="2" />
      <polygon points="60,20 73,35 68,52 52,52 47,35" fill="#333" />
      <polygon points="90,40 95,58 82,68 70,58 75,40" fill="#333" />
      <polygon points="82,85 68,90 58,78 62,68 78,68" fill="#333" />
      <polygon points="38,85 42,68 58,68 52,78 32,78" fill="#333" />
      <polygon points="25,40 40,40 45,58 32,68 20,58" fill="#333" />
      <line x1="60" y1="4" x2="60" y2="20" stroke="#333" strokeWidth="1.5" />
      <line x1="73" y1="35" x2="90" y2="40" stroke="#333" strokeWidth="1.5" />
      <line x1="75" y1="40" x2="95" y2="58" stroke="#333" strokeWidth="1.5" />
      <line x1="82" y1="68" x2="95" y2="80" stroke="#333" strokeWidth="1.5" />
      <line x1="68" y1="90" x2="72" y2="108" stroke="#333" strokeWidth="1.5" />
      <line x1="52" y1="90" x2="48" y2="108" stroke="#333" strokeWidth="1.5" />
      <line x1="38" y1="85" x2="22" y2="95" stroke="#333" strokeWidth="1.5" />
      <line x1="25" y1="40" x2="10" y2="35" stroke="#333" strokeWidth="1.5" />
      <line x1="20" y1="58" x2="5" y2="65" stroke="#333" strokeWidth="1.5" />
      <line x1="47" y1="35" x2="42" y2="18" stroke="#333" strokeWidth="1.5" />
    </svg>
  )
}

function CourtLinesSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect x="20" y="20" width="360" height="360" rx="8" stroke="currentColor" strokeWidth="1" opacity="0.08" />
      <line x1="200" y1="20" x2="200" y2="380" stroke="currentColor" strokeWidth="1" opacity="0.06" />
      <circle cx="200" cy="200" r="60" stroke="currentColor" strokeWidth="1" opacity="0.06" />
      <circle cx="200" cy="200" r="3" fill="currentColor" opacity="0.08" />
      <rect x="20" y="130" width="80" height="140" rx="4" stroke="currentColor" strokeWidth="1" opacity="0.06" />
      <rect x="300" y="130" width="80" height="140" rx="4" stroke="currentColor" strokeWidth="1" opacity="0.06" />
      <rect x="20" y="160" width="40" height="80" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.05" />
      <rect x="340" y="160" width="40" height="80" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.05" />
      <path d="M100 20 A60 60 0 0 1 100 80" stroke="currentColor" strokeWidth="1" opacity="0.04" fill="none" />
      <path d="M300 20 A60 60 0 0 0 300 80" stroke="currentColor" strokeWidth="1" opacity="0.04" fill="none" />
    </svg>
  )
}

export function LoginPage({ onSubmit, onGoogleCredential, isLoading, error }: LoginPageProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await onSubmit(email, password)
  }

  return (
    <>
      <style>{`
        @keyframes bounce-basketball {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-18px) rotate(8deg); }
          50% { transform: translateY(0) rotate(0deg); }
          75% { transform: translateY(-8px) rotate(-4deg); }
        }
        @keyframes bounce-soccer {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          30% { transform: translateY(-22px) rotate(-12deg); }
          60% { transform: translateY(0) rotate(0deg); }
          80% { transform: translateY(-6px) rotate(4deg); }
        }
        @keyframes float-particle {
          0%, 100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.5; }
          25% { transform: translateY(-20px) translateX(8px) scale(1.1); opacity: 0.7; }
          50% { transform: translateY(-10px) translateX(-5px) scale(0.95); opacity: 0.4; }
          75% { transform: translateY(-25px) translateX(12px) scale(1.05); opacity: 0.6; }
        }
        @keyframes drift {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(15px, -10px) rotate(5deg); }
          66% { transform: translate(-8px, -18px) rotate(-3deg); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.9); opacity: 0.3; }
          50% { transform: scale(1.05); opacity: 0.15; }
          100% { transform: scale(0.9); opacity: 0.3; }
        }
        @keyframes court-draw {
          from { stroke-dashoffset: 1000; }
          to { stroke-dashoffset: 0; }
        }
        .anim-bounce-basketball { animation: bounce-basketball 3s ease-in-out infinite; }
        .anim-bounce-soccer { animation: bounce-soccer 3.5s ease-in-out infinite 0.5s; }
        .anim-float { animation: drift 8s ease-in-out infinite; }
        .anim-float-delay { animation: drift 10s ease-in-out infinite 2s; }
        .anim-pulse-ring { animation: pulse-ring 4s ease-in-out infinite; }
        .anim-particle-1 { animation: float-particle 6s ease-in-out infinite; }
        .anim-particle-2 { animation: float-particle 7s ease-in-out infinite 1s; }
        .anim-particle-3 { animation: float-particle 5s ease-in-out infinite 2s; }
        .anim-particle-4 { animation: float-particle 8s ease-in-out infinite 0.5s; }
      `}</style>

      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/10">

        {/* Background Glow Effects */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-[300px] h-[300px] bg-chart-2/15 rounded-full blur-3xl" />

        {/* Floating Court Lines Background */}
        <CourtLinesSvg className="absolute inset-0 w-full h-full text-foreground anim-float pointer-events-none" />

        {/* Floating Sport Particles */}
        <div className="absolute top-[15%] left-[10%] w-2 h-2 rounded-full bg-primary/30 anim-particle-1" />
        <div className="absolute top-[25%] right-[15%] w-1.5 h-1.5 rounded-full bg-chart-3/40 anim-particle-2" />
        <div className="absolute bottom-[20%] left-[20%] w-2.5 h-2.5 rounded-full bg-chart-2/25 anim-particle-3" />
        <div className="absolute top-[60%] right-[8%] w-1.5 h-1.5 rounded-full bg-chart-4/35 anim-particle-4" />
        <div className="absolute bottom-[35%] right-[25%] w-2 h-2 rounded-full bg-primary/20 anim-particle-2" />
        <div className="absolute top-[40%] left-[5%] w-1 h-1 rounded-full bg-chart-1/30 anim-particle-1" />

        {/* Edge Sport Icons - Left */}
        <svg viewBox="0 0 32 32" className="absolute top-[12%] left-[3%] w-8 h-8 text-primary/20 anim-particle-1" fill="currentColor">
          <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M16 4v24M4 16h24" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 6l20 20M26 6L6 26" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        </svg>
        <svg viewBox="0 0 32 32" className="absolute top-[45%] left-[2%] w-7 h-7 text-chart-3/25 anim-particle-3" fill="currentColor">
          <circle cx="16" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M11 17l-3 11M21 17l3 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8 28h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <svg viewBox="0 0 32 32" className="absolute bottom-[18%] left-[4%] w-6 h-6 text-chart-4/25 anim-particle-2" fill="currentColor">
          <path d="M16 4l3 9h9l-7 5 3 9-8-6-8 6 3-9-7-5h9z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>

        {/* Edge Sport Icons - Right */}
        <svg viewBox="0 0 32 32" className="absolute top-[18%] right-[3%] w-7 h-7 text-chart-2/25 anim-particle-2" fill="currentColor">
          <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M16 4c-4 4-4 8 0 12s4 8 0 12" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M4 16c4-4 8-4 12 0s8 4 12 0" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <svg viewBox="0 0 32 32" className="absolute top-[55%] right-[2%] w-6 h-6 text-primary/20 anim-particle-4" fill="currentColor">
          <path d="M10 6h12v10l-6 10-6-10V6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M10 6h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <svg viewBox="0 0 32 32" className="absolute bottom-[22%] right-[5%] w-8 h-8 text-chart-3/20 anim-particle-1" fill="currentColor">
          <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M16 4v24M4 16h24" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 6l20 20M26 6L6 26" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        </svg>

        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 relative z-10">

          {/* Left Side - Branding & Sports Animation */}
          <div className="flex flex-col justify-center space-y-6 lg:pr-8">

            {/* Logo + Kids */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-card border border-border shadow-md flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src="/maiin-gandaria-logos.jpg"
                    alt="Maiin Gandaria Logo"
                    className="h-full w-full object-cover"
                  />
                </div>
                {/* Mini kid - left */}
                <svg viewBox="0 0 24 24" className="absolute -left-4 -bottom-3 w-6 h-6 anim-float-kid" fill="none">
                  <circle cx="12" cy="5" r="3" fill="#38bdf8" />
                  <path d="M12 8v6M9 11l3 3 3-3" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 17l-2 4M15 17l2 4" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                {/* Mini kid - right */}
                <svg viewBox="0 0 24 24" className="absolute -right-4 -bottom-3 w-6 h-6 anim-float-kid" style={{ animationDelay: "0.8s" }} fill="none">
                  <circle cx="12" cy="5" r="3" fill="#f97316" />
                  <path d="M12 8v6M9 11l3 3 3-3" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 17l-2 4M15 17l2 4" stroke="#f97316" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>

              <div>
                <h1 className="text-5xl font-extrabold tracking-tight">
                  MaiinSight
                </h1>

                <p className="text-muted-foreground text-sm mt-0.5">
                  Marketing Decision Support System
                </p>
              </div>
            </div>

            {/* Animated Sports Illustration */}
            <div className="relative h-48 w-full flex items-center justify-center">
              {/* Center pulse ring */}
              <div className="absolute w-40 h-40 rounded-full border border-primary/20 anim-pulse-ring" />
              <div className="absolute w-56 h-56 rounded-full border border-primary/10 anim-pulse-ring" style={{ animationDelay: "1s" }} />

              {/* Basketball - left side */}
              <div className="absolute left-4 top-2 anim-bounce-basketball">
                <BasketballSvg className="w-20 h-20 drop-shadow-lg" />
              </div>

              {/* Soccer ball - right side */}
              <div className="absolute right-4 top-0 anim-bounce-soccer">
                <SoccerBallSvg className="w-16 h-16 drop-shadow-lg" />
              </div>

              {/* Mini decorative elements */}
              <div className="absolute left-[30%] top-6 anim-float-delay">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-chart-3/40" fill="currentColor">
                  <polygon points="12,2 15,10 24,10 17,15 19,24 12,19 5,24 7,15 0,10 9,10" />
                </svg>
              </div>

              <div className="absolute right-[28%] bottom-4 anim-float">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-chart-4/35" fill="currentColor">
                  <polygon points="12,2 15,10 24,10 17,15 19,24 12,19 5,24 7,15 0,10 9,10" />
                </svg>
              </div>

              {/* Court midpoint line */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-24 bg-gradient-to-b from-transparent via-primary/15 to-transparent" />
            </div>

            {/* Hero Text */}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground/90">
                Know Your Players, Win Their Loyalty
              </h2>

              <p className="text-muted-foreground leading-relaxed">
                Know which customers keep coming back, who&rsquo;s drifting away,
                and which sessions need a push — then let AI draft the perfect
                campaign to bring them in. Let&rsquo;s fill those courts!
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-2 gap-4 -mt-1">

              {[
                {
                  label: "Reporting & Analytics",
                  value: "Automated",
                  color: "text-primary",
                  glow: "rgba(14, 165, 233, 0.35)",
                  icon: (
                    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
                      <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm8-6a6 6 0 100 12A6 6 0 0010 4z" opacity="0.2" />
                      <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 2a6 6 0 110 12 6 6 0 010-12z" />
                      <path d="M10 5v5l3 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )
                },
                {
                  label: "Customer Segmentation",
                  value: "Classified",
                  color: "text-chart-3",
                  glow: "rgba(34, 197, 94, 0.35)",
                  icon: (
                    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
                      <path d="M10 2a3 3 0 100 6 3 3 0 000-6zM4 16a6 6 0 0112 0H4z" opacity="0.3" />
                      <circle cx="10" cy="5" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M4 16c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )
                },
                {
                  label: "AI Marketing Strategy",
                  value: "Generated",
                  color: "text-chart-2",
                  glow: "rgba(168, 85, 247, 0.35)",
                  icon: (
                    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
                      <path d="M10 1l2 4 4.5.7-3.2 3.1.8 4.4L10 10.8 5.9 13.2l.8-4.4L3.5 5.7 8 5l2-4z" opacity="0.2" />
                      <path d="M10 2l1.8 3.6L16 6.2l-3 2.9.7 4.1L10 11.1l-3.7 2.1.7-4.1-3-2.9 4.2-.6L10 2z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                    </svg>
                  )
                },
                {
                  label: "Low-Occupancy Filling",
                  value: "Targeted",
                  color: "text-chart-4",
                  glow: "rgba(251, 146, 60, 0.35)",
                  icon: (
                    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
                      <path d="M10 2a8 8 0 100 16 8 8 0 000-16z" opacity="0.15" />
                      <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="10" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      <line x1="10" y1="3" x2="10" y2="7" stroke="currentColor" strokeWidth="1.2" />
                      <line x1="10" y1="13" x2="10" y2="17" stroke="currentColor" strokeWidth="1.2" />
                      <line x1="3" y1="10" x2="7" y2="10" stroke="currentColor" strokeWidth="1.2" />
                      <line x1="13" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                  )
                }
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="group rounded-xl p-5 border-2 bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg transition-all duration-300 cursor-default"
                  style={{
                    borderColor: stat.glow,
                    boxShadow: `0 0 12px ${stat.glow}, 0 0 4px ${stat.glow}`,
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className={`${stat.color} opacity-80 group-hover:opacity-100 transition-opacity`}>
                      {stat.icon}
                    </span>
                    <p className={`${stat.color} font-bold text-base`}>
                      {stat.value}
                    </p>
                  </div>

                  <p className="text-sm text-gray-600 leading-snug">
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
                Continue with your account credentials or activate your invited account
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">

              {/* Google Login */}
              <GoogleLoginButton
                onGoogleCredential={onGoogleCredential}
                disabled={isLoading}
              />

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

              {error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <form
                onSubmit={handleSubmit}
                className="space-y-4">
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

                <div className="text-right">
                  <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    Forgot password?
                  </Link>
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
                By continuing, you agree to our{" "}
                <Link href="/terms" className="underline hover:text-foreground transition-colors">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
