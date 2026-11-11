import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api/client.js'
import FormField from './FormField.jsx'
import PasswordStrength from './PasswordStrength.jsx'
import SubmitButton from './SubmitButton.jsx'

const EMPTY = { currentPassword: '', newPassword: '', confirm: '' }

// Settings: change password (PATCH /api/auth/password)
export default function ChangePassword() {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function validate() {
    const e = {}
    if (!form.currentPassword) e.currentPassword = 'Enter your current password'
    if (form.newPassword.length < 8) e.newPassword = 'New password must be at least 8 characters'
    else if (form.newPassword === form.currentPassword) e.newPassword = 'Choose a password different from the current one'
    if (form.confirm !== form.newPassword) e.confirm = 'Passwords do not match'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      await api.patch('/auth/password', { currentPassword: form.currentPassword, newPassword: form.newPassword })
      setForm(EMPTY)
      toast.success('Password changed 🔒')
    } catch (err) {
      const detail = err.response?.data?.details?.[0]
      if (detail?.field) setErrors({ [detail.field]: detail.message })
      else toast.error(err.response?.data?.error || 'Could not change the password. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const matches = form.confirm.length > 0 && form.confirm === form.newPassword

  return (
    <div className="mt-6 rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200 sm:p-10">
      <h2 className="text-xl font-bold text-slate-900">Change password</h2>
      <p className="mt-1 text-sm text-slate-500">You will need your current password.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        <FormField
          label="Current password"
          name="currentPassword"
          type="password"
          icon="lock"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={handleChange}
          error={errors.currentPassword}
        />
        <FormField
          label="New password"
          name="newPassword"
          type="password"
          icon="lock"
          autoComplete="new-password"
          maxLength={72}
          value={form.newPassword}
          onChange={handleChange}
          error={errors.newPassword}
        >
          {!errors.newPassword && <PasswordStrength password={form.newPassword} />}
        </FormField>
        <FormField
          label="Confirm new password"
          name="confirm"
          type="password"
          icon="lock"
          autoComplete="new-password"
          value={form.confirm}
          onChange={handleChange}
          error={errors.confirm}
          success={matches ? 'Passwords match' : undefined}
        />
        <SubmitButton loading={saving} loadingText="Changing...">
          Change password
        </SubmitButton>
      </form>
    </div>
  )
}
