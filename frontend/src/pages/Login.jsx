import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Compass, Mail, Lock, AlertCircle } from 'lucide-react'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    setErrorMsg(null)

    try {
      await login({ email, password })
      navigate(from, { replace: true })
    } catch (err) {
      console.error('Login error:', err)
      setErrorMsg(err.message || 'Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Compass className="h-[18px] w-[18px] text-secondary" />
          </div>
          <span className="text-xl font-bold text-ink">TripNova</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8 transition-colors">
          <h1 className="text-xl font-bold text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Log in to continue planning your adaptive trip.
          </p>

          {errorMsg && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-danger/20 bg-danger-bg p-3 text-xs font-medium text-danger">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-danger" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Email"
              type="email"
              name="email"
              placeholder="you@example.com"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              name="password"
              placeholder="••••••••"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" fullWidth size="lg" loading={loading}>
              Log In
            </Button>
          </form>

          <div className="mt-4 rounded-xl bg-surface p-3 text-xs text-ink-muted leading-relaxed">
            <p className="font-semibold text-ink">Quick Demo Accounts:</p>
            <p className="mt-0.5">📧 sachin@test.com / secretpassword123</p>
            <p>📧 rahul@test.com / rahulpassword123</p>
          </div>

          <p className="mt-5 text-center text-sm text-ink-muted">
            New to TripNova?{' '}
            <Link
              to="/signup"
              className="font-semibold text-secondary-600 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
