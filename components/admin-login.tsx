"use client"

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/loading-spinner'
import { ThemeToggle } from '@/components/theme-toggle'
import { StaffPinLogin } from '@/components/staff-pin-login'
import { Eye, EyeOff, ShieldCheck, Users } from 'lucide-react'

type Screen = "choose" | "owner" | "staff"

export function AdminLogin() {
  const [screen, setScreen] = useState<Screen>("choose")
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin')
  const { signIn, signUp, resetPassword } = useAuth()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setIsLoading(true)
    if (mode === 'signin') {
      const { error } = await signIn(email.trim(), password)
      if (error) setError('Invalid email or password. Please try again.')
      setPassword('')
    } else if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.')
        setIsLoading(false)
        return
      }
      const { data, error } = await signUp(email.trim(), password)
      if (error) {
        setError(error.message || 'Could not create account.')
      } else if (data?.session) {
        setInfo('Account created. Signing you in...')
      } else {
        setInfo('Account created. Please check your email to confirm, then sign in.')
        setMode('signin')
        setPassword('')
      }
    } else if (mode === 'forgot') {
      if (!email.trim()) {
        setError('Please enter your email address.')
        setIsLoading(false)
        return
      }
      const { error } = await resetPassword(email.trim())
      if (error) {
        setError(error.message || 'Could not send reset email.')
      } else {
        setInfo('If an account exists for that email, a password reset link has been sent. Please check your inbox.')
      }
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-black text-2xl">GH</span>
          </div>
          <h1 className="text-2xl font-black text-green-700">Grace Harvest</h1>
          <p className="text-gray-500 text-sm mt-1">Vegetable Nursery Management</p>
        </div>

        <Card className="border border-gray-200 shadow-md">
          <CardContent className="p-6">

            {/* CHOOSE SCREEN */}
            {screen === "choose" && (
              <div className="space-y-4">
                <p className="text-center font-semibold text-gray-600 mb-6">How would you like to sign in?</p>

                <button
                  onClick={() => setScreen("owner")}
                  className="w-full flex items-center gap-4 p-5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-2xl transition-all active:scale-[0.98] text-left"
                >
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-lg leading-tight">Owner / Manager</p>
                    <p className="text-sm text-gray-500">Sign in with email & password</p>
                  </div>
                </button>

                <button
                  onClick={() => setScreen("staff")}
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
              </div>
            )}

            {/* OWNER LOGIN */}
            {screen === "owner" && (
              <div className="space-y-4">
                <button
                  onClick={() => { setScreen("choose"); setError('') }}
                  className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-2"
                >
                  ← Back
                </button>
                <p className="font-bold text-gray-700 text-lg mb-4">
                  {mode === 'signin' && 'Owner / Manager Sign In'}
                  {mode === 'signup' && 'Create Owner / Manager Account'}
                  {mode === 'forgot' && 'Reset Your Password'}
                </p>

                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your-email@example.com"
                      required
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>

                  {mode !== 'forgot' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        disabled={isLoading}
                        autoComplete="current-password"
                        className="pr-10"
                      />
                      <Button
                        type="button" variant="ghost" size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                      </Button>
                    </div>
                  </div>
                  )}

                  {mode === 'signin' && (
                    <div className="text-right -mt-2">
                      <button
                        type="button"
                        className="text-sm text-green-700 hover:underline"
                        onClick={() => { setMode('forgot'); setError(''); setInfo(''); setPassword('') }}
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {info && (
                    <Alert>
                      <AlertDescription>{info}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 text-base" disabled={isLoading}>
                    {isLoading ? (
                      <><LoadingSpinner /><span className="ml-2">
                        {mode === 'signin' && 'Signing in...'}
                        {mode === 'signup' && 'Creating account...'}
                        {mode === 'forgot' && 'Sending email...'}
                      </span></>
                    ) : (
                      <>
                        {mode === 'signin' && 'Sign In'}
                        {mode === 'signup' && 'Create Account'}
                        {mode === 'forgot' && 'Send Reset Link'}
                      </>
                    )}
                  </Button>
                </form>

                <div className="text-center text-sm text-gray-500 pt-2">
                  {mode === 'signin' && (
                    <>Don&apos;t have an account?{' '}
                      <button
                        type="button"
                        className="text-green-700 font-semibold hover:underline"
                        onClick={() => { setMode('signup'); setError(''); setInfo('') }}
                      >
                        Create one
                      </button>
                    </>
                  )}
                  {mode === 'signup' && (
                    <>Already have an account?{' '}
                      <button
                        type="button"
                        className="text-green-700 font-semibold hover:underline"
                        onClick={() => { setMode('signin'); setError(''); setInfo('') }}
                      >
                        Sign in
                      </button>
                    </>
                  )}
                  {mode === 'forgot' && (
                    <button
                      type="button"
                      className="text-green-700 font-semibold hover:underline"
                      onClick={() => { setMode('signin'); setError(''); setInfo('') }}
                    >
                      Back to sign in
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STAFF PIN LOGIN */}
            {screen === "staff" && (
              <StaffPinLogin onBack={() => setScreen("choose")} />
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  )
}
