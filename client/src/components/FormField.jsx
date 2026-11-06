import { useState } from 'react'

function EyeIcon({ open }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M1 1l22 22" />
    </svg>
  )
}

export default function FormField({ label, error, type = 'text', ...inputProps }) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <div className="relative">
        <input
          {...inputProps}
          type={isPassword && show ? 'text' : type}
          className={`w-full rounded border px-3 py-2 ${isPassword ? 'pr-10' : ''} ${
            error ? 'border-red-500' : 'border-slate-300'
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700"
          >
            <EyeIcon open={show} />
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}