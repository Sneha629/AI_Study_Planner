import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthLayout from '../components/AuthLayout.jsx'
import FormField from '../components/FormField.jsx'
import SubmitButton from '../components/SubmitButton.jsx'
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

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start turning your notes into flashcards."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormField label="Name" name="name" placeholder="Your name" value={form.name} onChange={handleChange} error={errors.name} />
        <FormField label="Email" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} error={errors.email} />
        <FormField label="Password" name="password" type="password" placeholder="At least 8 characters" value={form.password} onChange={handleChange} error={errors.password} />
        <FormField label="Confirm password" name="confirm" type="password" placeholder="Re-enter your password" value={form.confirm} onChange={handleChange} error={errors.confirm} />
        <SubmitButton loading={submitting} loadingText="Creating account...">
          Sign up
        </SubmitButton>
      </form>
    </AuthLayout>
  )
}