
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Download, Wifi, WifiOff, Upload } from 'lucide-react'
import { offlineSync } from '@/lib/offline-sync'
import { useToast } from '@/components/ui/use-toast'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [hasPendingSync, setHasPendingSync] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration)
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError)
        })
    }

    // Check if already installed
    const checkIfInstalled = () => {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
        return true
      }
      // Also check for iOS Safari standalone mode
      if ((window.navigator as any).standalone === true) {
        setIsInstalled(true)
        return true
      }
      return false
    }

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setCanInstall(true)
      
      // Check if user has dismissed the banner before
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      if (!dismissed) {
        setShowInstallBanner(true)
      }
    }

    const installed = checkIfInstalled()
    
    // Show install option for iOS even without beforeinstallprompt
    if (!installed && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
      setCanInstall(true)
    }

    // Handle online/offline status
    const handleOnline = async () => {
      setIsOnline(true)
      setIsSyncing(true)
      
      try {
        const result = await offlineSync.syncPendingOperations()
        if (result.synced > 0) {
          toast({
            title: "Data Synced",
            description: `${result.synced} offline changes synced successfully`,
          })
        }
        if (result.failed > 0) {
          toast({
            title: "Sync Issues",
            description: `${result.failed} items failed to sync`,
            variant: "destructive"
          })
        }
        setHasPendingSync(false)
      } catch (error) {
        console.error('Sync failed:', error)
      } finally {
        setIsSyncing(false)
      }
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      setHasPendingSync(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Show manual install instructions
      showManualInstallInstructions()
      return
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowInstallBanner(false)
      setCanInstall(false)
    }
  }

  const showManualInstallInstructions = () => {
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
    const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor)
    const isEdge = /Edg/.test(navigator.userAgent)
    
    let instructions = ""
    
    if (isChrome || isEdge) {
      instructions = "Look for the install icon (⊞) in your address bar, or click the three dots menu → 'Install Grace Harvest Seedlings'"
    } else if (isSafari) {
      instructions = "Tap the Share button (□↗) and select 'Add to Home Screen'"
    } else {
      instructions = "Look for an install or 'Add to Home Screen' option in your browser menu"
    }

    toast({
      title: "Install Grace Harvest Seedlings",
      description: instructions,
      duration: 8000,
    })
  }

  return (
    <>
      {children}
      
      {/* Install Banner */}
      {(showInstallBanner || (!isInstalled && canInstall)) && (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-primary text-primary-foreground p-4 rounded-lg shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5" />
            <div>
              <p className="font-medium">Install Grace Harvest Seedlings</p>
              <p className="text-sm opacity-90">
                {deferredPrompt ? "Add to home screen for better experience" : "Available as app - click for instructions"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleInstallClick}
            >
              {deferredPrompt ? "Install" : "How to Install"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowInstallBanner(false)
                localStorage.setItem('pwa-install-dismissed', 'true')
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Permanent Install Button for Desktop and Mobile */}
      {!isInstalled && canInstall && (
        <div className="fixed top-4 right-4 z-40">
          <Button
            variant="default"
            size="sm"
            onClick={handleInstallClick}
            className="bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow"
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Install App</span>
            <span className="sm:hidden">Install</span>
          </Button>
        </div>
      )}

      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 p-2 text-center text-sm flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          You're offline. Changes will sync when reconnected.
          {hasPendingSync && <span className="font-medium">(Pending changes)</span>}
        </div>
      )}

      {/* Sync Status */}
      {isOnline && hasPendingSync && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-500 text-white p-2 text-center text-sm flex items-center justify-center gap-2">
          {isSyncing ? (
            <>
              <Upload className="h-4 w-4 animate-spin" />
              Syncing offline changes...
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4" />
              Back online! Changes synced.
            </>
          )}
        </div>
      )}
    </>
  )
}
