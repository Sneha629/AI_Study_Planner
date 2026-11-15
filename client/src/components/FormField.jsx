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

// Small icons shown inside the input on the left: <FormField icon="mail" ... />
const ICONS = {
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
}

// `success` shows a green tick and border (e.g. passwords match); `children` renders under the input
export default function FormField({ label, error, hint, success, icon, children, type = 'text', ...inputProps }) {
  const [show, setShow] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const isPassword = type === 'password'

  // Warn when Caps Lock is on while typing a password
  function checkCaps(e) {
    if (isPassword && e.getModifierState) setCapsLock(e.getModifierState('CapsLock'))
  }

  const border = error
    ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
    : success
      ? 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-100'
      : 'border-slate-200 focus:border-brand-500 focus:ring-indigo-100'

  return (
    <div>
      <label htmlFor={inputProps.name} className="mb-1.5 block text-[13px] font-medium text-slate-700">
        {label}
      </label>
      <div className="group relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 transition group-focus-within:text-brand-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              {ICONS[icon]}
            </svg>
          </span>
        )}
        <input
          id={inputProps.name}
          {...inputProps}
          type={isPassword && show ? 'text' : type}
          aria-invalid={!!error}
          onKeyDown={(e) => {
            checkCaps(e)
            inputProps.onKeyDown?.(e)
          }}
          onKeyUp={checkCaps}
          onBlur={(e) => {
            setCapsLock(false)
            inputProps.onBlur?.(e)
          }}
          className={`h-11 w-full rounded-xl border bg-white text-sm text-slate-900 shadow-sm shadow-slate-900/[0.02] placeholder-slate-400 outline-none transition focus:ring-4 ${
            icon ? 'pl-10' : 'pl-3.5'
          } ${isPassword || success ? 'pr-11' : 'pr-3.5'} ${border}`}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-slate-600"
          >
            <EyeIcon open={show} />
          </button>
        ) : (
          success && (
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-emerald-500">✓</span>
          )
        )}
      </div>
      {capsLock && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-600">
          <span aria-hidden="true">⇪</span> Caps Lock is on
        </p>
      )}
      {error ? (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      ) : success && typeof success === 'string' ? (
        <p className="mt-1.5 text-xs font-medium text-emerald-600">{success}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
      {children}
    </div>
  )
}
