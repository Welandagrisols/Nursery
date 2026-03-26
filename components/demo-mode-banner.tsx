import { AlertCircle, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface DemoModeBannerProps {
  isDemoMode: boolean
  connectionStatus: 'connecting' | 'connected' | 'demo'
}

export function DemoModeBanner({ isDemoMode, connectionStatus }: DemoModeBannerProps) {
  if (!isDemoMode && connectionStatus === 'connected') {
    return (
      <div className="bg-green-100 border border-green-300 p-3 rounded-lg mb-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          <span className="text-green-800 text-sm font-medium">Connected to Supabase</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-orange-100 border border-orange-300 p-4 rounded-lg mb-6">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-orange-600" />
        <h3 className="font-semibold text-orange-800">
          {connectionStatus === 'connecting' ? 'Connecting to Database...' : 'Demo Mode Active'}
        </h3>
      </div>
      <p className="text-orange-700 mt-2">
        {connectionStatus === 'connecting' 
          ? 'Attempting to connect to your Supabase database...'
          : 'Using sample data. Connect to Supabase for real data persistence.'
        }
      </p>
      {isDemoMode && (
        <div className="mt-3">
          <Link href="/setup" className="text-orange-600 hover:text-orange-500 underline">
            Set up your database →
          </Link>
        </div>
      )}
    </div>
  )
}
