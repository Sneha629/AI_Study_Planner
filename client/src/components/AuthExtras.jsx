import toast from 'react-hot-toast'

// TODO(Lavisha): connect to Google sign-in. Until then it explains it is coming soon.
export function GoogleButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick ?? (() => toast('Google sign-in is coming soon. Please use your email for now.', { icon: '🔜' }))}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
    >
      <svg viewBox="0 0 48 48" className="h-[18px] w-[18px]" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      Continue with Google
    </button>
  )
}

export function OrDivider({ children = 'or continue with email' }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
      <span className="h-px flex-1 bg-slate-200" />
      {children}
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  )
}

// TODO(Lavisha): replace with the real "forgot password" flow
export function ForgotPasswordLink() {
  return (
    <button
      type="button"
      onClick={() => toast('Password reset is coming soon.', { icon: '🔜' })}
      className="text-xs font-medium text-brand-500 hover:text-brand-600 hover:underline"
    >
      Forgot password?
    </button>
  )
}
