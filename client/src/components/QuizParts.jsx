import { cardClass } from './PageHeader.jsx'
import { CheckIcon, CloseIcon } from './Icons.jsx'
import { scoreTone } from '../utils/quiz.js'

export function ScorePill({ score, total }) {
  const percent = Math.round((score / total) * 100)
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${scoreTone(percent).pill}`}>
      {score}/{total} · {percent}%
    </span>
  )
}

export function ScoreRing({ score, total, size = 112 }) {
  const percent = total ? Math.round((score / total) * 100) : 0
  const stroke = 9
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#9ff0d8" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold">{score}/{total}</span>
        <span className="text-[11px] text-indigo-200">{percent}%</span>
      </div>
    </div>
  )
}

// Every question with the student's answer and the right one
export function AnswerReview({ results }) {
  return (
    <ol className="space-y-3">
      {results.map((item, i) => (
        <li key={i} className={`${cardClass} p-5`}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-[14px] font-medium text-slate-900">
              <span className="mr-2 text-slate-400">{String(i + 1).padStart(2, '0')}</span>
              {item.question}
            </p>
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${item.correct ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {item.correct ? <CheckIcon className="h-4 w-4" /> : <CloseIcon className="h-4 w-4" />}
            </span>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {item.options.map((option, j) => {
              const isRight = j === item.correctIndex
              const isChosen = j === item.chosen
              const style = isRight
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : isChosen
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-slate-200 text-slate-600'
              return (
                <li key={j} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[13px] ${style}`}>
                  <span>{option}</span>
                  <span className="shrink-0 text-[10px] font-semibold uppercase">
                    {isRight ? 'Correct' : isChosen ? 'Your answer' : ''}
                  </span>
                </li>
              )
            })}
          </ul>
          {item.chosen === null || item.chosen === undefined ? <p className="mt-2 text-[11px] text-slate-400">Not answered</p> : null}
        </li>
      ))}
    </ol>
  )
}
