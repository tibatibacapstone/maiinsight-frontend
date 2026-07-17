"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Mail, CheckCircle } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getApiUrl } from "@/lib/api"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    try {
      setIsSubmitting(true)
      const response = await fetch(getApiUrl("/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      await response.json()
      setSubmitted(true)
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Forgot Password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium">Check your email</p>
                <p className="text-sm text-muted-foreground mt-1">
                  If an account exists with <strong>{email}</strong>, we&apos;ve sent a password reset link.
                </p>
              </div>
              <Link href="/">
                <Button variant="outline" className="w-full">Back to Login</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={isSubmitting || !email.trim()}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </Button>
              <Link href="/" className="block text-center text-sm text-muted-foreground hover:text-primary">
                Back to Login
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
