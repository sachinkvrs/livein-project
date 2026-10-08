import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Compass, Mail, Lock, User, AlertCircle } from 'lucide-react'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  const { signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email || !password) return

    setLoading(true)
    setErrorMsg(null)

    try {
      await signup({ name: name.trim(), email, password })
      navigate('/plan')
    } catch (err) {
      console.error('Signup error:', err)
      setErrorMsg(err.message || 'Failed to create account. Please try again.')
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
          <h1 className="text-xl font-bold text-ink">Create your account</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Start planning a trip that adapts with you.
          </p>

          {errorMsg && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-danger/20 bg-danger-bg p-3 text-xs font-medium text-danger">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-danger" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Full name"
              name="name"
              placeholder="e.g. Sachin Kumar"
              icon={User}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
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
              Create Account
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-muted">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-secondary-600 hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
