
"use client"

import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ErrorStateProps {
  error: Error | string
  retry?: () => void
  type?: "network" | "data" | "general"
}

export function ErrorState({ error, retry, type = "general" }: ErrorStateProps) {
  const errorMessage = typeof error === "string" ? error : error.message

  const getErrorConfig = () => {
    switch (type) {
      case "network":
        return {
          icon: WifiOff,
          title: "Connection Error",
          description: "Please check your internet connection and try again."
        }
      case "data":
        return {
          icon: AlertTriangle,
          title: "Data Error",
          description: "There was a problem loading your data."
        }
      default:
        return {
          icon: AlertTriangle,
          title: "Something went wrong",
          description: errorMessage
        }
    }
  }

  const config = getErrorConfig()
  const Icon = config.icon

  return (
    <Alert variant="destructive" className="my-4">
      <Icon className="h-4 w-4" />
      <AlertTitle>{config.title}</AlertTitle>
      <AlertDescription className="mt-2">
        {config.description}
        {retry && (
          <Button
            variant="outline"
            size="sm"
            onClick={retry}
            className="mt-3 ml-0"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
