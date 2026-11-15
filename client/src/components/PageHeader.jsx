// Page title block in the Figma style: small coloured label, title, one line of help
export default function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-500">
            <span className="h-px w-5 bg-brand-500/60" />
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export const cardClass = 'rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03]'
export const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-brand-500 to-brand-violet px-4 py-2 text-[13px] font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50'
export const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
