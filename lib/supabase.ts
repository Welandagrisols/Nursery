
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

console.log("Supabase URL:", supabaseUrl)
console.log("Supabase Key:", supabaseAnonKey ? "Set" : "Not set")

// Check if we have valid Supabase configuration
const hasValidUrl = supabaseUrl && supabaseUrl.startsWith("https://") && supabaseUrl.includes(".supabase.co")
const hasValidKey = supabaseAnonKey && supabaseAnonKey.length > 50

console.log("Is valid URL:", hasValidUrl)

// Check if we're in demo mode (missing required env vars)
export const isDemoMode =
  !supabaseUrl ||
  !supabaseAnonKey ||
  !hasValidUrl ||
  !hasValidKey ||
  rawSupabaseUrl === "your-project-url" ||
  supabaseAnonKey === "your-anon-key"

console.log("Is Demo Mode:", isDemoMode)

// If env config is invalid, fail fast with a clear message.
if (isDemoMode) {
  const details = {
    hasUrl: !!supabaseUrl,
    hasValidUrl,
    hasKey: !!supabaseAnonKey,
    hasValidKey,
  }
  console.error("Invalid Supabase environment configuration:", details)
  throw new Error(
    "Missing or invalid Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
  )
}

const validSupabaseUrl = supabaseUrl!
const validSupabaseAnonKey = supabaseAnonKey!

// Create a single supabase client for internal use only
export const supabase = createClient<Database>(validSupabaseUrl, validSupabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
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
      .from(tableName)
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
