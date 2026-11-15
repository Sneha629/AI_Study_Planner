import { Link } from 'react-router-dom'
import { cardClass, primaryBtn, secondaryBtn } from '../components/PageHeader.jsx'

// Shown for any URL that does not match a page
export default function NotFound() {
  return (
    <div className={`${cardClass} mx-auto mt-10 max-w-lg px-6 py-14 text-center`}>
      <p className="bg-linear-to-br from-brand-500 to-brand-violet bg-clip-text text-7xl font-semibold tracking-tight text-transparent">404</p>
      <h1 className="mt-4 text-xl font-medium tracking-tight text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">The page you are looking for does not exist or has moved.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <Link to="/" className={primaryBtn}>
          Back to dashboard
        </Link>
        <Link to="/subjects" className={secondaryBtn}>
          My subjects
        </Link>
      </div>
    </div>
  )
}
