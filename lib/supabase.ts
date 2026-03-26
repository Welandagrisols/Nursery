
import { createClient } from "@supabase/supabase-js"
import type { Database } from "../types/supabase"

// Environment variables for Next.js
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANAON_KEY

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
  supabaseUrl === "your-project-url" ||
  supabaseAnonKey === "your-anon-key"

console.log("Is Demo Mode:", isDemoMode)

// If in demo mode, log the reason
if (isDemoMode) {
  console.log("Demo mode reason:", {
    hasUrl: !!supabaseUrl,
    hasValidUrl,
    hasKey: !!supabaseAnonKey,
    hasValidKey,
  })
}

// Use valid demo values when in demo mode to prevent URL constructor errors
const validSupabaseUrl = isDemoMode ? "https://demo.supabase.co" : supabaseUrl!
const validSupabaseAnonKey = isDemoMode ? "demo-key" : supabaseAnonKey!

// Create a single supabase client for internal use only
export const supabase = createClient<Database>(validSupabaseUrl, validSupabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Helper function to check if a table exists
export const checkTableExists = async (tableName: string): Promise<boolean> => {
  if (isDemoMode) return false

  try {
    console.log(`Checking if table ${tableName} exists...`)

    // Add timeout to the request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1)
      .abortSignal(controller.signal)

    clearTimeout(timeoutId)

    console.log(`Table ${tableName} check result:`, { data, error })

    if (error) {
      console.error(`Supabase error for table ${tableName}:`, error)

      // If we get a specific error about the table not existing, return false
      if (error.message.includes('does not exist') ||
          error.message.includes('relation') && error.message.includes('does not exist')) {
        return false
      }

      // For network errors, throw to trigger demo mode
      if (error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('TypeError')) {
        throw new Error(`Network error: ${error.message}`)
      }

      // For other errors, we assume the table exists but there's a connection issue
      return true
    }

    console.log(`Table ${tableName} exists`)
    return true
  } catch (error: any) {
    console.error(`Error checking table ${tableName}:`, error)
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - check your internet connection')
    }
    throw error
  }
}
