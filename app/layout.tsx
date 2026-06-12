import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { SupabaseProvider } from '@/components/supabase-provider'
import { AuthProvider } from '@/contexts/auth-context'
import { RoleProvider } from '@/contexts/role-context'
import { AuthGuard } from '@/components/auth-guard'
import { NotificationProvider } from '@/components/notification-provider'
import { NurseryProvider } from '@/contexts/nursery-context'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'Nursery Manager',
  description: 'Professional nursery management for seedling inventory, sales, and operations',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192x192.png',
    apple: '/icon-512x512.png',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
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
                <NurseryProvider>
                  <NotificationProvider>
                  <AuthGuard>
                    {children}
                  </AuthGuard>
                  <Toaster />
                </NotificationProvider>
                </NurseryProvider>
              </RoleProvider>
            </AuthProvider>
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}