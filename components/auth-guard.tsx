"use client"

import { useAuth } from '@/contexts/auth-context'
import { useRole } from '@/contexts/role-context'
import { LoadingSpinner } from '@/components/loading-spinner'
import { AdminLogin } from '@/components/admin-login'
import { Button } from "./ui/button"
import { useState, useEffect } from "react"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const { staffUser } = useRole()
  const [showFallback, setShowFallback] = useState(false)

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowFallback(true), 3000)
      return () => clearTimeout(timer)
    } else {
      setShowFallback(false)
    }
  }, [loading])

  if (loading && !showFallback) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    )
  }

  if (loading && showFallback) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Taking longer than expected.</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Refresh Page
          </Button>
        </div>
      </div>
    )
  }

  if (!user && !staffUser) {
    return <AdminLogin />
  }

  return <>{children}</>
}
