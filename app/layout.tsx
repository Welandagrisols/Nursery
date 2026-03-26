import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { SupabaseProvider } from '@/components/supabase-provider'
import { AuthProvider } from '@/contexts/auth-context'
import { RoleProvider } from '@/contexts/role-context'
import { AuthGuard } from '@/components/auth-guard'
import { NotificationProvider } from '@/components/notification-provider'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'Grace Harvest Seedlings - Nursery Management',
  description: 'Comprehensive vegetable seedling nursery management for inventory, sales, and operations',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192x192.png',
    apple: '/icon-512x512.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <SupabaseProvider>
            <AuthProvider>
              <RoleProvider>
                <NotificationProvider>
                  <AuthGuard>
                    {children}
                  </AuthGuard>
                  <Toaster />
                </NotificationProvider>
              </RoleProvider>
            </AuthProvider>
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}