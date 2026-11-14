import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthLayout from '../components/AuthLayout.jsx'
import { ForgotPasswordLink, GoogleButton, OrDivider } from '../components/AuthExtras.jsx'
import FormField from '../components/FormField.jsx'
import SubmitButton from '../components/SubmitButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'

// "Remember me" keeps only the email on this device, never the password
const REMEMBER_KEY = 'rememberedEmail'

function readRemembered() {
  try {
    return localStorage.getItem(REMEMBER_KEY) || ''
  } catch {
    return ''
  }
}

function saveRemembered(email) {
  try {
    if (email) localStorage.setItem(REMEMBER_KEY, email)
    else localStorage.removeItem(REMEMBER_KEY)
  } catch {
    // Storage can be blocked (private mode); remembering is only a convenience
  }
}

export default function Login() {
  const { login, user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState(() => ({ email: readRemembered(), password: '' }))
  const [remember, setRemember] = useState(() => Boolean(readRemembered()))
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function validate() {
    const e = {}
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password) e.password = 'Password is required'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      await login(form.email.trim(), form.password)
      saveRemembered(remember ? form.email.trim() : '')
      toast.success('Welcome back! 👋')
      navigate(location.state?.from?.pathname || '/', { replace: true })
    } catch (err) {
      if (!err.response) {
        toast.error('Cannot reach the server. Is it running?')
      } else if (err.response.status === 401) {
        toast.error('Incorrect email or password.')
      } else {
        toast.error(err.response?.data?.error || 'Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Already logged in (e.g. opened /login from a bookmark): go straight in
  if (!loading && user && !submitting) return <Navigate to="/" replace />

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Good to see you again."
      subtitle="Sign in to continue your learning momentum."
      footer={
        <>
          New to StudyPlanner?{' '}
          <Link to="/signup" className="font-semibold text-brand-500 hover:text-brand-600 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <GoogleButton />
      <OrDivider />
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <FormField
          label="Email address"
          name="email"
          type="email"
          icon="mail"
          autoComplete="email"
          autoFocus={!form.email}
          placeholder="you@university.edu"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          icon="lock"
          autoComplete="current-password"
          autoFocus={Boolean(form.email)}
          placeholder="Enter your password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
        />
        <div className="flex items-center justify-between">
          {/* Remembers only the email on this device, never the password */}
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded accent-brand-500"
            />
            Remember me
          </label>
          <ForgotPasswordLink />
        </div>
        <SubmitButton loading={submitting} loadingText="Signing in..." arrow>
          Sign in to StudyPlanner
        </SubmitButton>
      </form>
    </AuthLayout>
  )
}