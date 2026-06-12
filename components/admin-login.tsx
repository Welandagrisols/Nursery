"use client"

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRole } from '@/contexts/role-context'
import { isDemoMode } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/loading-spinner'
import { ThemeToggle } from '@/components/theme-toggle'
import { StaffPinLogin } from '@/components/staff-pin-login'
import {
  Eye, EyeOff, ShieldCheck, Users, FlaskConical,
  Mail, CheckCircle2, RefreshCw, ArrowLeft, UserPlus, LogIn,
} from 'lucide-react'
import { DEMO_STAFF } from '@/contexts/role-context'
import { cn } from '@/lib/utils'

type Screen = "choose" | "admin" | "staff"
type AdminTab = "signin" | "signup"

export function AdminLogin() {
  const [screen, setScreen] = useState<Screen>("choose")
  const [tab, setTab] = useState<AdminTab>("signin")

  // Form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingEmail, setPendingEmail] = useState('') // email waiting for confirmation
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const { signIn, signUp, resetPassword, resendConfirmation } = useAuth()
  const { loginStaff } = useRole()

  const reset = () => {
    setError('')
    setPassword('')
    setForgotMode(false)
    setResetSent(false)
    setPendingEmail('')
    setResendSuccess(false)
  }

  const goBack = () => {
    setScreen("choose")
    reset()
  }

  const handleDemoOwnerLogin = async () => {
    const owner = DEMO_STAFF.find(s => s.role === 'owner')!
    await loginStaff(owner.id, "1234")
  }

  // ── Sign In ──────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    const { error } = await signIn(email.trim(), password)
    setIsLoading(false)
    setPassword('')
    if (!error) return

    const msg: string = error?.message ?? ''
    if (msg.toLowerCase().includes('email not confirmed') || msg.toLowerCase().includes('not confirmed')) {
      setPendingEmail(email.trim())
    } else if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials')) {
      setError('Incorrect email or password.')
    } else {
      setError(msg || 'Sign in failed. Please try again.')
    }
  }

  // ── Sign Up ──────────────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setIsLoading(true)
    const { data, error } = await signUp(email.trim(), password)
    setIsLoading(false)
    setPassword('')
    if (error) {
      const msg: string = error?.message ?? ''
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
        setError('An account with this email already exists. Please sign in.')
        setTab('signin')
      } else {
        setError(msg || 'Could not create account.')
      }
      return
    }
    if (data?.session) {
      // Email confirmation disabled — logged in immediately
      return
    }
    // Need to confirm email
    setPendingEmail(email.trim())
  }

  // ── Forgot password ──────────────────────────────────────
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Enter your email first.'); return }
    setIsLoading(true)
    const { error } = await resetPassword(email.trim())
    setIsLoading(false)
    if (error) {
      setError(error?.message || 'Could not send reset email.')
    } else {
      setResetSent(true)
    }
  }

  // ── Resend confirmation ──────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown) return
    setResendCooldown(true)
    setResendSuccess(false)
    const { error } = await resendConfirmation(pendingEmail)
    if (!error) setResendSuccess(true)
    setTimeout(() => setResendCooldown(false), 30000)
  }

  // ─────────────────────────────────────────────────────────
  // Email confirmation waiting screen
  // ─────────────────────────────────────────────────────────
  if (pendingEmail) {
    return (
      <PageWrapper>
        <Card className="border border-gray-200 shadow-md">
          <CardContent className="p-6 space-y-5">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Check your email</h2>
              <p className="text-sm text-gray-500">
                We sent a confirmation link to <br />
                <span className="font-semibold text-gray-700">{pendingEmail}</span>
              </p>
              <p className="text-xs text-gray-400">
                Click the link in the email, then come back here and sign in.
              </p>
            </div>

            {resendSuccess && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 text-sm ml-1">
                  New confirmation email sent!
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleResend}
              variant="outline"
              className="w-full"
              disabled={resendCooldown}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", resendCooldown && "animate-spin")} />
              {resendCooldown ? 'Email sent — wait 30s to resend' : "Resend confirmation email"}
            </Button>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 space-y-1">
              <p className="font-semibold">Skip email confirmation (optional)</p>
              <p>
                In your Supabase dashboard → Authentication → Providers → Email
                → turn off <span className="font-semibold">"Confirm email"</span>.
                Then sign up again and you'll be logged in instantly.
              </p>
            </div>

            <button
              onClick={() => { setPendingEmail(''); setTab('signin') }}
              className="w-full text-sm text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </button>
          </CardContent>
        </Card>
      </PageWrapper>
    )
  }

  // ─────────────────────────────────────────────────────────
  // Choose screen
  // ─────────────────────────────────────────────────────────
  if (screen === "choose") {
    return (
      <PageWrapper>
        <Card className="border border-gray-200 shadow-md">
          <CardContent className="p-6 space-y-4">
            <p className="text-center font-semibold text-gray-600 mb-2">How would you like to sign in?</p>

            <button
              onClick={() => { setScreen("admin"); reset() }}
              className="w-full flex items-center gap-4 p-5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-2xl transition-all active:scale-[0.98] text-left"
            >
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center shrink-0">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-800 text-lg leading-tight">Admin / Manager</p>
                <p className="text-sm text-gray-500">Email &amp; password · manages everything</p>
              </div>
            </button>

            <button
              onClick={() => { setScreen("staff"); reset() }}
              className="w-full flex items-center gap-4 p-5 bg-green-50 hover:bg-green-100 border border-green-200 rounded-2xl transition-all active:scale-[0.98] text-left"
            >
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center shrink-0">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-800 text-lg leading-tight">Farm Staff</p>
                <p className="text-sm text-gray-500">Select your name &amp; enter PIN</p>
              </div>
            </button>
          </CardContent>
        </Card>
      </PageWrapper>
    )
  }

  // ─────────────────────────────────────────────────────────
  // Staff PIN screen
  // ─────────────────────────────────────────────────────────
  if (screen === "staff") {
    return (
      <PageWrapper>
        <Card className="border border-gray-200 shadow-md">
          <CardContent className="p-6">
            <StaffPinLogin onBack={goBack} />
          </CardContent>
        </Card>
      </PageWrapper>
    )
  }

  // ─────────────────────────────────────────────────────────
  // Admin login / create account
  // ─────────────────────────────────────────────────────────
  return (
    <PageWrapper>
      <Card className="border border-gray-200 shadow-md">
        <CardContent className="p-6 space-y-5">
          <button
            onClick={goBack}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>

          {/* Demo mode banner */}
          {isDemoMode && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-3">
              <p className="text-sm text-amber-800 font-semibold flex items-center gap-2">
                <FlaskConical className="h-4 w-4 shrink-0" /> Demo Mode — Supabase not connected
              </p>
              <Button
                onClick={handleDemoOwnerLogin}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                Continue as Demo Admin
              </Button>
            </div>
          )}

          {/* Tabs */}
          {!forgotMode && (
            <div className="flex rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => { setTab('signin'); setError('') }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors",
                  tab === 'signin'
                    ? "bg-purple-600 text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                )}
              >
                <LogIn className="h-4 w-4" /> Sign In
              </button>
              <button
                onClick={() => { setTab('signup'); setError('') }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors",
                  tab === 'signup'
                    ? "bg-purple-600 text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                )}
              >
                <UserPlus className="h-4 w-4" /> Create Account
              </button>
            </div>
          )}

          {/* Forgot password mode */}
          {forgotMode ? (
            <div className="space-y-4">
              <p className="font-semibold text-gray-700">Reset your password</p>
              {resetSent ? (
                <div className="space-y-4">
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700 text-sm ml-1">
                      Password reset link sent to <strong>{email}</strong>. Check your inbox.
                    </AlertDescription>
                  </Alert>
                  <Button
                    onClick={() => { setForgotMode(false); setResetSent(false) }}
                    variant="outline" className="w-full"
                  >
                    Back to sign in
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email-forgot">Email</Label>
                    <Input
                      id="email-forgot" type="email" value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your-email@example.com"
                      required disabled={isLoading}
                    />
                  </div>
                  {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                  <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold" disabled={isLoading}>
                    {isLoading ? <><LoadingSpinner /><span className="ml-2">Sending...</span></> : 'Send Reset Link'}
                  </Button>
                  <button type="button" onClick={() => { setForgotMode(false); setError('') }}
                    className="w-full text-sm text-gray-400 hover:text-gray-600">
                    Cancel
                  </button>
                </form>
              )}
            </div>
          ) : (

          /* Sign in / Sign up form */
          <form onSubmit={tab === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
            {tab === 'signup' && (
              <p className="text-xs text-gray-500 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2">
                Create your <strong>admin account</strong>. Once in, add staff members from <strong>Settings → Staff</strong>.
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your-email@example.com"
                required disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password {tab === 'signup' && <span className="text-gray-400 font-normal">(min 8 characters)</span>}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={tab === 'signup' ? "Choose a strong password" : "Enter your password"}
                  required disabled={isLoading}
                  autoComplete={tab === 'signup' ? "new-password" : "current-password"}
                  className="pr-10"
                />
                <button
                  type="button" tabIndex={-1}
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {tab === 'signin' && (
              <div className="text-right -mt-1">
                <button
                  type="button"
                  className="text-xs text-purple-600 hover:underline"
                  onClick={() => { setForgotMode(true); setError('') }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <><LoadingSpinner /><span className="ml-2">{tab === 'signin' ? 'Signing in...' : 'Creating account...'}</span></>
              ) : (
                tab === 'signin' ? 'Sign In' : 'Create Account'
              )}
            </Button>
          </form>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  )
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-black text-2xl">NM</span>
          </div>
          <h1 className="text-2xl font-black text-green-700">Nursery Manager</h1>
          <p className="text-gray-500 text-sm mt-1">Vegetable Nursery Management</p>
        </div>
        {children}
        <p className="text-center text-xs text-gray-400 mt-8">
          Powered by <span className="font-semibold text-gray-500">Agrisols Systems</span>
        </p>
      </div>
    </div>
  )
}
