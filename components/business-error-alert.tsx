"use client"

import { AlertCircle, AlertTriangle, Info } from "lucide-react"

import { Badge } from "@/components/ui/badge"

interface BusinessErrorAlertProps {
  title: string
  message: string
  suggestion?: string | null
  errorCode?: string | null
  technicalDetails?: string | null
  variant?: "error" | "warning" | "info"
  showTechnicalDetails?: boolean
}

const variantConfig = {
  error: {
    wrapper: "border-destructive/20 bg-destructive/5 text-destructive",
    icon: AlertCircle,
    badge: "destructive" as const,
  },
  warning: {
    wrapper: "border-amber-200 bg-amber-50 text-amber-800",
    icon: AlertTriangle,
    badge: "secondary" as const,
  },
  info: {
    wrapper: "border-primary/20 bg-primary/5 text-primary",
    icon: Info,
    badge: "secondary" as const,
  },
}

export function BusinessErrorAlert({
  title,
  message,
  suggestion,
  errorCode,
  technicalDetails,
  variant = "error",
  showTechnicalDetails = false,
}: BusinessErrorAlertProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  const suggestionMentionsItSupport = /it\s*support/i.test(suggestion ?? "")

  return (
    <div className={`rounded-md border p-4 ${config.wrapper}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{title}</p>
            {errorCode ? <Badge variant={config.badge}>{errorCode}</Badge> : null}
          </div>

          <p className="text-sm">{message}</p>

          {suggestion ? <p className="text-sm opacity-90">{suggestion}</p> : null}

          {suggestion && !suggestionMentionsItSupport ? (
            <p className="text-sm opacity-90">
              If the issue continues, contact IT Support.
            </p>
          ) : null}

          {showTechnicalDetails && technicalDetails ? (
            <details className="text-sm">
              <summary className="cursor-pointer select-none font-medium">
                Technical details
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md bg-background/70 p-3 text-xs text-foreground">
                {technicalDetails}
              </pre>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  )
}
