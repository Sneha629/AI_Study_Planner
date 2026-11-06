import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import FormField from '../components/FormField.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
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
      navigate(location.state?.from?.pathname || '/', { replace: true })
    } catch (err) {
      if (err.response?.status === 409) {
        setErrors({ email: 'An account with this email already exists.' })
      } else {
        toast.error(err.response?.data?.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-semibold">Sign up</h1>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormField label="Name" name="name" value={form.name} onChange={handleChange} error={errors.name} />
        <FormField label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} />
        <FormField label="Password" name="password" type="password" value={form.password} onChange={handleChange} error={errors.password} />
        <FormField label="Confirm password" name="confirm" type="password" value={form.confirm} onChange={handleChange} error={errors.confirm} />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? 'Signing up...' : 'Sign up'}
        </button>
      </form>
      <p className="mt-4 text-sm">
        Already have an account? <Link to="/login" className="text-indigo-600 underline">Log in</Link>
      </p>
    </div>
  )
}
