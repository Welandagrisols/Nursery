"use client";
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/loading-spinner';
import { StaffPinLogin } from '@/components/staff-pin-login';
import { Eye, EyeOff, ShieldCheck, Users, BarChart3, Package, TrendingUp, ArrowRight, Leaf } from 'lucide-react';

type Screen = "choose" | "owner" | "staff"

const features = [
  {
    icon: Package,
    title: "Inventory Tracking",
    desc: "Monitor plant batches, stock levels, and tray management in real time.",
    color: "bg-emerald-50 text-emerald-600",
    border: "border-emerald-100",
  },
  {
    icon: BarChart3,
    title: "Sales Analytics",
    desc: "Track revenue, top customers, and monthly performance at a glance.",
    color: "bg-blue-50 text-blue-600",
    border: "border-blue-100",
  },
  {
    icon: TrendingUp,
    title: "Growth Insights",
    desc: "Understand your nursery's performance with clear, actionable reports.",
    color: "bg-violet-50 text-violet-600",
    border: "border-violet-100",
  },
]

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
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #e8f5ee 0%, #f0f7ff 50%, #eef6f2 100%)' }}>

      {/* ── Hero Section ── */}
      <div className="flex flex-col items-center pt-14 pb-10 px-6 text-center">
        {/* Logo mark */}
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #22A45D 0%, #16834a 100%)' }}
        >
          <Leaf className="w-10 h-10 text-white" strokeWidth={1.8} />
        </div>

        <h1 className="text-4xl font-black tracking-tight text-gray-900 leading-none">
          Grace Harvest
        </h1>
        <p className="text-base text-gray-500 mt-2 font-medium">Vegetable Nursery Management System</p>

        <p className="mt-5 text-gray-600 text-sm leading-relaxed max-w-xs">
          Manage your nursery inventory, track sales, coordinate staff, and grow your business — all in one place.
        </p>

        {/* CTA button — opens login */}
        {screen === "choose" && (
          <button
            onClick={() => setScreen("owner")}
            className="mt-7 inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-white font-bold text-base shadow-md transition-all active:scale-95 hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #22A45D 0%, #16834a 100%)' }}
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Feature Cards ── */}
      {screen === "choose" && (
        <div className="px-5 pb-8 space-y-3 max-w-md mx-auto w-full">
          {features.map((f) => (
            <div
              key={f.title}
              className={`flex items-start gap-4 bg-white rounded-2xl p-4 shadow-sm border ${f.border}`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${f.color}`}>
                <f.icon className="w-5 h-5" strokeWidth={2} />
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm leading-tight">{f.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}

          {/* Staff sign-in option */}
          <div className="pt-2">
            <button
              onClick={() => setScreen("staff")}
              className="w-full flex items-center justify-between px-5 py-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-green-300 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-800 text-sm">Farm Staff Login</p>
                  <p className="text-xs text-gray-400">Select your name &amp; enter PIN</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* ── Owner Login Form ── */}
      {screen === "owner" && (
        <div className="flex-1 flex flex-col items-center px-5 pb-10">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
            <button
              onClick={() => { setScreen("choose"); setError(''); setInfo('') }}
              className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-5"
            >
              ← Back
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-black text-gray-800 text-lg leading-tight">
                  {mode === 'signin' && 'Owner / Manager'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'forgot' && 'Reset Password'}
                </p>
                <p className="text-xs text-gray-400">
                  {mode === 'signin' && 'Sign in with your credentials'}
                  {mode === 'signup' && 'Set up your owner account'}
                  {mode === 'forgot' && 'We\'ll send a reset link'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  className="h-11 rounded-xl border-gray-200 focus:border-green-400 focus:ring-green-400"
                />
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password</Label>
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
                      className="h-11 rounded-xl border-gray-200 focus:border-green-400 focus:ring-green-400 pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'signin' && (
                <div className="text-right -mt-1">
                  <button
                    type="button"
                    className="text-xs text-green-700 hover:underline font-medium"
                    onClick={() => { setMode('forgot'); setError(''); setInfo(''); setPassword('') }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {error && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              {info && (
                <Alert className="rounded-xl border-green-200 bg-green-50">
                  <AlertDescription className="text-sm text-green-700">{info}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl text-white font-bold text-base shadow-md transition-all hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #22A45D 0%, #16834a 100%)' }}
              >
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

            <div className="text-center text-sm text-gray-500 pt-4">
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
        </div>
      )}

      {/* ── Staff PIN Login ── */}
      {screen === "staff" && (
        <div className="flex-1 flex flex-col items-center px-5 pb-10">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
            <StaffPinLogin onBack={() => setScreen("choose")} />
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <p className="text-center text-xs text-gray-400 pb-8 mt-auto">
        Powered by <span className="font-semibold text-gray-500">Agrisols Systems</span>
      </p>
    </div>
  )
}
