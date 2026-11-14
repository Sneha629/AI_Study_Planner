import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthLayout from '../components/AuthLayout.jsx'
import { GoogleButton, OrDivider } from '../components/AuthExtras.jsx'
import FormField from '../components/FormField.jsx'
import PasswordStrength from '../components/PasswordStrength.jsx'
import SubmitButton from '../components/SubmitButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Signup() {
  const { signup, user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [agreed, setAgreed] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (form.confirm !== form.password) e.confirm = 'Passwords do not match'
    if (!agreed) e.agreed = 'Please agree to the Terms and Privacy Policy'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      await signup(form.name.trim(), form.email.trim(), form.password)
      toast.success(`Welcome, ${form.name.trim().split(' ')[0]}! 🎉`)
      navigate(location.state?.from?.pathname || '/', { replace: true })
    } catch (err) {
      if (!err.response) {
        toast.error('Cannot reach the server. Is it running?')
      } else if (err.response.status === 409) {
        setErrors({ email: 'An account with this email already exists.' })
      } else {
        toast.error(err.response?.data?.error || 'Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!loading && user && !submitting) return <Navigate to="/" replace />

  const passwordsMatch = form.confirm.length > 0 && form.confirm === form.password

  return (
    <AuthLayout
      eyebrow="Create your workspace"
      title="Start learning smarter."
      subtitle="Build better study habits with a plan made for you."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-500 hover:text-brand-600 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <GoogleButton />
      <OrDivider />
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormField
          label="Full name"
          name="name"
          icon="user"
          autoComplete="name"
          autoFocus
          maxLength={50}
          placeholder="Your name"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
        />
        <FormField
          label="Email address"
          name="email"
          type="email"
          icon="mail"
          autoComplete="email"
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
          autoComplete="new-password"
          maxLength={72}
          placeholder="At least 8 characters"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
        >
          {!errors.password && <PasswordStrength password={form.password} />}
        </FormField>
        <FormField
          label="Confirm password"
          name="confirm"
          type="password"
          icon="lock"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={form.confirm}
          onChange={handleChange}
          error={
            errors.confirm ||
            (form.confirm.length >= form.password.length && form.confirm && !passwordsMatch ? 'Passwords do not match' : undefined)
          }
          success={passwordsMatch ? 'Passwords match' : undefined}
        />
        <div>
          {/* Terms and Privacy pages are not built yet, so the names are plain text for now */}
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked)
                if (e.target.checked) setErrors((prev) => ({ ...prev, agreed: undefined }))
              }}
              className="h-4 w-4 rounded accent-brand-500"
            />
            <span>
              I agree to the <span className="font-medium text-brand-500">Terms</span> and{' '}
              <span className="font-medium text-brand-500">Privacy Policy</span>
            </span>
          </label>
          {errors.agreed && <p className="mt-1.5 text-sm text-red-600">{errors.agreed}</p>}
        </div>
        <SubmitButton loading={submitting} loadingText="Creating account..." arrow>
          Create free account
        </SubmitButton>
      </form>
    </AuthLayout>
  )
}