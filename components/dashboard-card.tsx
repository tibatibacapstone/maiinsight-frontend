"use client"

import * as React from "react"

import {
  Card as BaseCard,
  CardAction as BaseCardAction,
  CardContent as BaseCardContent,
  CardDescription as BaseCardDescription,
  CardFooter as BaseCardFooter,
  CardHeader as BaseCardHeader,
  CardTitle as BaseCardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

const dashboardCardClassName = "border-border bg-card shadow-sm"

function Card({ className, ...props }: React.ComponentProps<typeof BaseCard>) {
  return <BaseCard className={cn(dashboardCardClassName, className)} {...props} />
}

function CardHeader({ className, ...props }: React.ComponentProps<typeof BaseCardHeader>) {
  return <BaseCardHeader className={className} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<typeof BaseCardTitle>) {
  return <BaseCardTitle className={className} {...props} />
}

function CardDescription({ className, ...props }: React.ComponentProps<typeof BaseCardDescription>) {
  return <BaseCardDescription className={className} {...props} />
}

function CardAction({ className, ...props }: React.ComponentProps<typeof BaseCardAction>) {
  return <BaseCardAction className={className} {...props} />
}

function CardContent({ className, ...props }: React.ComponentProps<typeof BaseCardContent>) {
  return <BaseCardContent className={className} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<typeof BaseCardFooter>) {
  return <BaseCardFooter className={className} {...props} />
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
