// Primary gradient button from the Figma design. `arrow` adds the → after the label.
export default function SubmitButton({ loading, loadingText, children, arrow = false }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-brand-500 to-brand-violet px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {loading ? loadingText : children}
      {arrow && !loading && (
        <span aria-hidden="true" className="transition group-hover:translate-x-0.5">
          →
        </span>
      )}
    </button>
  )
}
