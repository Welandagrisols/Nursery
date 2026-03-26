
"use client"

import { Loader2, Sprout } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingStateProps {
  type?: "spinner" | "skeleton" | "pulse"
  message?: string
  className?: string
}

export function LoadingState({ 
  type = "spinner", 
  message = "Loading...", 
  className 
}: LoadingStateProps) {
  if (type === "spinner") {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="flex flex-col items-center gap-3">
          <Sprout className="h-8 w-8 animate-bounce text-green-600" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    )
  }

  if (type === "skeleton") {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("animate-pulse bg-gray-200 rounded", className)}></div>
  )
}

export function TableLoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex space-x-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded flex-1"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
      ))}
    </div>
  )
}
