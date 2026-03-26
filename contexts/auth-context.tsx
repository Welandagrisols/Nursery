"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string) => Promise<{ data: any, error: any }>
  signOut: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout | undefined

    const getSession = async () => {
      try {
        // Set a shorter timeout to prevent long loading
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.log('Auth session timeout, setting loading to false')
            setLoading(false)
          }
        }, 2000) // Reduced to 2 seconds

        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Auth timeout')), 1500)
        })

        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any

        clearTimeout(timeoutId)

        if (mounted) {
          if (error) {
            console.error('Session error:', error)
            setUser(null)
            setSession(null)
          } else {
            setUser(session?.user ?? null)
            setSession(session)
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) {
          clearTimeout(timeoutId)
          setUser(null)
          setSession(null)
          setLoading(false)
        }
      }
    }

    // Always attempt to get session, but with quick fallback
    getSession()

    // Set up auth state listener with error handling
    let subscription: any
    try {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (mounted) {
            console.log('Auth state changed:', event)
            setUser(session?.user ?? null)
            setSession(session)
            setLoading(false)
          }
        }
      )
      subscription = data.subscription
    } catch (error) {
      console.error('Auth listener error:', error)
      if (mounted) {
        setLoading(false)
      }
    }

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
      if (subscription) subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } catch (error) {
      return { error }
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}