
import { createClient } from "@supabase/supabase-js"
import type { Database } from "../types/supabase"

// Environment variables for Next.js
const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const normalizeSupabaseUrl = (value?: string): string | undefined => {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith("https://")) return trimmed
  // Allow project refs in env and normalize them to the full Supabase URL.
  return `https://${trimmed}.supabase.co`
}

const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl)

// Check if we have valid Supabase configuration
const hasValidUrl = supabaseUrl && supabaseUrl.startsWith("https://") && supabaseUrl.includes(".")
const hasValidKey = supabaseAnonKey && supabaseAnonKey.length > 20

// Check if we're in demo mode (missing required env vars)
export const isDemoMode =
  !supabaseUrl ||
  !supabaseAnonKey ||
  !hasValidUrl ||
  !hasValidKey ||
  rawSupabaseUrl === "your-project-url" ||
  supabaseAnonKey === "your-anon-key"

if (isDemoMode) {
  console.info("[Demo Mode] Supabase credentials not configured — running with demo data.")
}

// Use real credentials if available, otherwise use a safe placeholder
// (the isDemoMode flag prevents any real API calls from being made)
const effectiveUrl = (hasValidUrl && supabaseUrl) ? supabaseUrl : "https://placeholder.supabase.co"
const effectiveKey = (hasValidKey && supabaseAnonKey) ? supabaseAnonKey : "placeholder-key-for-demo-mode-only"

// Create a single supabase client for internal use only
export const supabase = createClient<Database>(effectiveUrl, effectiveKey, {
  auth: {
    persistSession: !isDemoMode,
    autoRefreshToken: !isDemoMode,
  },
})

// Module-level cache so each table is only checked once per session
const _tableExistsCache = new Map<string, boolean>()

// Helper function to check if a table exists
export const checkTableExists = async (tableName: string): Promise<boolean> => {
  if (isDemoMode) return false
  if (_tableExistsCache.has(tableName)) return _tableExistsCache.get(tableName)!

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const { data, error } = await supabase
      .from(tableName as any)
      .select('id')
      .limit(1)
      .abortSignal(controller.signal)

    clearTimeout(timeoutId)

    if (error) {
      if (error.message.includes('does not exist') ||
          (error.message.includes('relation') && error.message.includes('does not exist'))) {
        _tableExistsCache.set(tableName, false)
        return false
      }
      if (error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('TypeError')) {
        throw new Error(`Network error: ${error.message}`)
      }
      _tableExistsCache.set(tableName, true)
      return true
    }

    _tableExistsCache.set(tableName, true)
    return true
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - check your internet connection')
    }
    throw error
  }
}
