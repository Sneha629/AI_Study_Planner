import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api/client.js'
import FormField from '../components/FormField.jsx'
import SubmitButton from '../components/SubmitButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Settings() {
  const { user, updateUser } = useAuth()

  // Browser ki time zone list. User ki saved time zone list mein na ho toh upar jod do.
  const timeZones = useMemo(() => {
    const list =
      typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC']
    return user?.timezone && !list.includes(user.timezone) ? [user.timezone, ...list] : list
  }, [user?.timezone])

  const [form, setForm] = useState({
    name: user?.name ?? '',
    timezone: user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    dailyReviewLimit: String(user?.dailyReviewLimit ?? 100),
    dailyNewLimit: String(user?.dailyNewLimit ?? 20),
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function validate() {
    const e = {}
    const name = form.name.trim()
    if (!name) e.name = 'Name is required'
    else if (name.length > 50) e.name = 'Name can be at most 50 characters'

    const review = Number(form.dailyReviewLimit)
    if (form.dailyReviewLimit === '' || !Number.isInteger(review) || review < 1 || review > 500) {
      e.dailyReviewLimit = 'Enter a whole number from 1 to 500'
    }
    const fresh = Number(form.dailyNewLimit)
    if (form.dailyNewLimit === '' || !Number.isInteger(fresh) || fresh < 1 || fresh > 100) {
      e.dailyNewLimit = 'Enter a whole number from 1 to 100'
    }
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    // Sirf badle hue fields bhejo
    const next = {
      name: form.name.trim(),
      timezone: form.timezone,
      dailyReviewLimit: Number(form.dailyReviewLimit),
      dailyNewLimit: Number(form.dailyNewLimit),
    }
    const payload = {}
    for (const key of Object.keys(next)) {
      if (next[key] !== user?.[key]) payload[key] = next[key]
    }
    if (Object.keys(payload).length === 0) {
      toast('No changes to save')
      return
    }

    setSaving(true)
    try {
      const res = await api.patch('/auth/me', payload)
      updateUser(res.data.user)
      toast.success('Settings saved')
    } catch (err) {
      if (!err.response) {
        toast.error('Cannot reach the server. Is it running?')
      } else {
        toast.error(err.response?.data?.error || 'Something went wrong. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200 sm:p-10">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Change your profile and daily study limits.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          <FormField label="Name" name="name" icon="user" value={form.name} onChange={handleChange} error={errors.name} />

          <div>
            <label htmlFor="timezone" className="mb-1.5 block text-sm font-medium text-slate-700">
              Time zone
            </label>
            <select
              id="timezone"
              name="timezone"
              value={form.timezone}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-white/70 px-3.5 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            >
              {timeZones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-500">Used for "today" and your streak.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              label="Daily review limit"
              name="dailyReviewLimit"
              type="number"
              min="1"
              max="500"
              value={form.dailyReviewLimit}
              onChange={handleChange}
              error={errors.dailyReviewLimit}
              hint="Max cards to review per day (1-500)"
            />
            <FormField
              label="Daily new-card limit"
              name="dailyNewLimit"
              type="number"
              min="1"
              max="100"
              value={form.dailyNewLimit}
              onChange={handleChange}
              error={errors.dailyNewLimit}
              hint="New cards per day (1-100)"
            />
          </div>

          <SubmitButton loading={saving} loadingText="Saving...">
            Save settings
          </SubmitButton>
        </form>
      </div>
    </div>
  )
}