"use client"

import * as React from "react"
import {
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Info,
  Loader2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"

/* -------------------------------------------------------------------------- */
/*  Base Card Components (shadcn/ui)                                          */
/* -------------------------------------------------------------------------- */

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-4 rounded-xl border py-5 shadow-sm",
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-5 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-5",
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-[1rem] leading-6 font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm leading-6", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-5", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-5 [.border-t]:pt-5", className)}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------- */
/*  Reusable Utility Components                                                */
/* -------------------------------------------------------------------------- */

function CardTitleTooltip({
  title,
  tooltip,
  className,
}: {
  title: string
  tooltip: string
  className?: string
}) {
  return (
    <CardTitle className={cn("flex items-center gap-2", className)}>
      <span>{title}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="More information"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={8}
          className="max-w-xs text-left leading-relaxed"
        >
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </CardTitle>
  )
}

function ChangeIndicator({
  value,
  isNegativeGood = false,
  className,
}: {
  value: number
  isNegativeGood?: boolean
  className?: string
}) {
  const isGood = isNegativeGood ? value < 0 : value > 0
  const colorClass =
    value === 0
      ? "text-muted-foreground"
      : isGood
        ? "text-emerald-600"
        : "text-red-600"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        colorClass,
        className,
      )}
    >
      {value > 0 ? (
        <TrendingUp className="h-3 w-3" />
      ) : value < 0 ? (
        <TrendingDown className="h-3 w-3" />
      ) : null}
      {value >= 0 ? "+" : ""}
      {value}%
    </span>
  )
}

function ChangeIndicatorRaw({
  value,
  isNegativeGood = false,
  className,
}: {
  value: number
  isNegativeGood?: boolean
  className?: string
}) {
  const isGood = isNegativeGood ? value < 0 : value > 0
  const colorClass =
    value === 0
      ? "text-muted-foreground"
      : isGood
        ? "text-emerald-600"
        : "text-red-600"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium",
        colorClass,
        className,
      )}
    >
      {value >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*  KpiCard — Standard KPI metric card (Overview / Management Report style)   */
/* -------------------------------------------------------------------------- */

interface KpiCardProps {
  label: string
  tooltip?: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: React.ElementType
  iconClassName?: string
  valueClassName?: string
  className?: string
  children?: React.ReactNode
}

function KpiCard({
  label,
  tooltip,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconClassName,
  valueClassName,
  className,
  children,
}: KpiCardProps) {
  return (
    <Card className={cn("border-border bg-card shadow-sm", className)}>
      <CardHeader className="pb-3">
        {tooltip ? (
          <CardTitleTooltip title={label} tooltip={tooltip} className="text-sm font-medium text-muted-foreground" />
        ) : (
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div className="min-w-0">
            <p
              className={cn(
                "text-3xl font-bold tracking-tight",
                valueClassName,
              )}
            >
              {value}
            </p>
            {change !== undefined && (
              <ChangeIndicator
                value={change}
                className={cn(
                  "mt-2",
                  change < 0 ? "text-destructive" : "text-primary",
                )}
              />
            )}
            {changeLabel && (
              <p className="mt-2 text-xs text-muted-foreground">
                {changeLabel}
              </p>
            )}
            {children}
          </div>
          {Icon && (
            <Icon
              className={cn(
                "h-6 w-6 shrink-0 text-primary",
                iconClassName,
              )}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/*  StatCard — Centered KPI card with optional badge (Segment style)          */
/* -------------------------------------------------------------------------- */

interface StatCardProps {
  label: string
  value: string | number
  valueClassName?: string
  subText?: string
  subTextClassName?: string
  badge?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

function StatCard({
  label,
  value,
  valueClassName,
  subText,
  subTextClassName,
  badge,
  className,
  children,
}: StatCardProps) {
  return (
    <Card className={cn("border-border bg-card shadow-sm", className)}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {label}
            </p>
            <p
              className={cn(
                "mt-4 text-3xl font-semibold text-foreground",
                valueClassName,
              )}
            >
              {value}
            </p>
            {subText && (
              <p
                className={cn(
                  "mt-2 text-sm font-medium",
                  subTextClassName || "text-muted-foreground",
                )}
              >
                {subText}
              </p>
            )}
            {children}
          </div>
          {badge}
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/*  StateCard — Loading / Empty / Error / Warning state cards                 */
/* -------------------------------------------------------------------------- */

interface StateCardProps {
  state: "loading" | "empty" | "error" | "warning" | "access-denied"
  title: string
  description?: string
  icon?: React.ElementType
  action?: React.ReactNode
  className?: string
  contentClassName?: string
  minHeight?: string
}

const STATE_ICONS: Record<
  StateCardProps["state"],
  React.ElementType
> = {
  loading: Loader2,
  empty: AlertTriangle,
  error: AlertCircle,
  warning: AlertTriangle,
  "access-denied": AlertCircle,
}

const STATE_COLORS: Record<StateCardProps["state"], string> = {
  loading: "text-muted-foreground",
  empty: "text-muted-foreground",
  error: "text-destructive",
  warning: "text-amber-600",
  "access-denied": "text-destructive",
}

function StateCard({
  state,
  title,
  description,
  icon: CustomIcon,
  action,
  className,
  contentClassName,
  minHeight = "min-h-[280px]",
}: StateCardProps) {
  const DefaultIcon = STATE_ICONS[state]
  const Icon = CustomIcon || DefaultIcon
  const iconColor = STATE_COLORS[state]

  const borderClass =
    state === "warning"
      ? "border-amber-200 bg-amber-50/70"
      : state === "error" || state === "access-denied"
        ? "border-red-200 bg-red-50/70"
        : "border-border bg-card"

  return (
    <Card className={cn(borderClass, className)}>
      <CardContent
        className={cn(
          "flex flex-col items-center justify-center gap-3 text-center",
          minHeight,
          contentClassName,
        )}
      >
        <Icon
          className={cn(
            state === "loading" ? "h-5 w-5 animate-spin" : "h-12 w-12",
            iconColor,
          )}
        />
        <div>
          <p className="font-medium">{title}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/*  Exports                                                                    */
/* -------------------------------------------------------------------------- */

export {
  /* base */
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  /* reusable */
  CardTitleTooltip,
  ChangeIndicator,
  ChangeIndicatorRaw,
  KpiCard,
  StatCard,
  StateCard,
}
