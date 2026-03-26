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
  const { signIn } = useAuth()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    const { error } = await signIn(email.trim(), password)
    if (error) setError('Invalid email or password. Please try again.')
    setPassword('')
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
                <p className="font-bold text-gray-700 text-lg mb-4">Owner / Manager Sign In</p>

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

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 text-base" disabled={isLoading}>
                    {isLoading ? <><LoadingSpinner /><span className="ml-2">Signing in...</span></> : 'Sign In'}
                  </Button>
                </form>
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
