import { useEffect, useState } from 'react'
import api from '../api/client.js'

export default function Home() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    api
      .get('/health')
      .then((res) => setStatus(res.data.status))
      .catch(() => setStatus('API not reachable'))
  }, [])

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-bold">Upload your notes, get exam-ready.</h1>
      <p className="text-slate-600">API status: {status}</p>
    </section>
  )
}
