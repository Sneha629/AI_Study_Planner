import { useEffect, useRef } from 'react'
import { CloseIcon } from './Icons.jsx'

// Centered popup from the Figma design (icon, title, text, content, buttons).
// Closes on Escape, on the X, or when clicking the dimmed background.
export default function Modal({ open, onClose, icon, title, subtitle, children, footer }) {
  const panelRef = useRef(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  // Only when the popup opens: focus the first field and listen for Escape.
  // (Not on every render, or the cursor would jump while typing.)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && closeRef.current()
    document.addEventListener('keydown', onKey)
    panelRef.current?.querySelector('input, textarea, select')?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div ref={panelRef} className="relative w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
        {icon && <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-brand-500">{icon}</span>}
        <h2 className="mt-4 text-2xl font-medium tracking-tight text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-6">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

export const fieldLabel = 'mb-1.5 block text-[13px] font-medium text-slate-700'
export const fieldInput =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-indigo-100'
export const fieldTextarea =
  'w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-indigo-100'
