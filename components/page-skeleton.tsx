"use client"

import { Skeleton } from "@/components/ui/skeleton"

type PageSkeletonProps = {
  titleWidth?: string
  lines?: number
  cards?: number
}

export function PageSkeleton({ titleWidth = "w-48", lines = 3, cards = 6 }: PageSkeletonProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className={`h-8 ${titleWidth}`} />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              {Array.from({ length: lines }).map((__, lineIndex) => (
                <Skeleton key={lineIndex} className="h-3 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <Skeleton className="mb-4 h-5 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <Skeleton className="mb-4 h-5 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  )
}
