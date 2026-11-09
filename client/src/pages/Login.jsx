import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthLayout from '../components/AuthLayout.jsx'
import FormField from '../components/FormField.jsx'
import SubmitButton from '../components/SubmitButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
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

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue your revision."
      footer={
        <>
          New here?{' '}
          <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <FormField label="Email" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} error={errors.email} />
        <FormField label="Password" name="password" type="password" placeholder="Enter your password" value={form.password} onChange={handleChange} error={errors.password} />
        <SubmitButton loading={submitting} loadingText="Logging in...">
          Log in
        </SubmitButton>
      </form>
    </AuthLayout>
  )
}