
"use client"

import { useEffect } from 'react'
import { notificationService } from '@/lib/notification-service'
import { isDemoMode } from '@/lib/supabase'

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only start monitoring if not in demo mode
    if (!isDemoMode) {
      notificationService.startMonitoring()
      
      return () => {
        notificationService.stopMonitoring()
      }
    }
  }, [])

  return <>{children}</>
}
