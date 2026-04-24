import type { Metadata } from 'next';
 import'./globals.css'
import { ThemeProvider } from '@/components/theme-provider';
import { SupabaseProvider } from '@/components/supabase-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { RoleProvider } from '@/contexts/role-context';
import { AuthGuard } from '@/components/auth-guard';
import { NotificationProvider } from '@/components/notification-provider';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Grace Harvest Seedlings - Nursery Management',
  description: 'Comprehensive vegetable seedling nursery management for inventory, sales, and operations',
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

        <script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fnursery7926back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.18" />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.2" /></body>
    </html>
  )
}