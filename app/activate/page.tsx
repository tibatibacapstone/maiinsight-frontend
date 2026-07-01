"use client"

import { useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { BarChart3, CheckCircle2, KeyRound, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000"

export default function ActivatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get("token") ?? ""
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isTokenPresent = useMemo(() => Boolean(inviteToken), [inviteToken])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (!inviteToken) {
      setError("Activation token is missing. Open the link from your invitation email.")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.")
      return
    }

    if (password !== confirmPassword) {
      setError("Password confirmation does not match.")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken, password }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setError(payload?.error || "Unable to activate your account.")
        return
      }

      setMessage("Account activated successfully. You can now sign in.")
      setPassword("")
      setConfirmPassword("")
      window.localStorage.setItem("maiinToken", payload.token)
      window.localStorage.setItem("maiinRole", payload.user?.role || "operational")
      window.localStorage.setItem("maiinUser", JSON.stringify(payload.user))
      router.replace("/")
    } catch {
      setError("Unable to connect to the API. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/80 p-8 shadow-2xl shadow-primary/5 backdrop-blur">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-44 w-44 rounded-full bg-accent/10 blur-3xl" />

          <div className="relative space-y-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">MaiinSight</p>
                <h1 className="text-3xl font-semibold tracking-tight">Activate your account</h1>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-medium text-foreground/90">
                Secure onboarding for invited users
              </h2>
              <p className="max-w-xl leading-relaxed text-muted-foreground">
                The invitation link contains a one-time activation token. You set your own password,
                and IT Support never sees it.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: ShieldCheck,
                  title: "Private",
                  text: "Password is entered only by the user.",
                },
                {
                  icon: KeyRound,
                  title: "One-time",
                  text: "Invite token expires and is marked used.",
                },
                {
                  icon: CheckCircle2,
                  title: "Ready",
                  text: "After activation, sign in normally.",
                },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
                    <Icon className="mb-3 h-5 w-5 text-primary" />
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <Card className="border-border/60 bg-card shadow-xl shadow-primary/5">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Set password</CardTitle>
            <CardDescription>
              {isTokenPresent
                ? "Create a secure password to complete registration."
                : "Open the activation link from your invitation email to continue."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 8 characters"
                  className="h-11 bg-secondary/50"
                  disabled={!inviteToken}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat your password"
                  className="h-11 bg-secondary/50"
                  disabled={!inviteToken}
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">
                  {message}
                </div>
              ) : null}

              <Button type="submit" className="h-11 w-full" disabled={!inviteToken || isSubmitting}>
                {isSubmitting ? "Activating..." : "Activate account"}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Already activated?{" "}
                <Link href="/" className="font-medium text-foreground underline underline-offset-4">
                  Sign in here
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
