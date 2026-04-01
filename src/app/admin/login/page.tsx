'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/admin')
    } else {
      setError('パスワードが違います')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="bg-white rounded-lg p-10 w-full max-w-sm shadow-sm">
        <h1 className="text-sm font-semibold tracking-[0.1em] uppercase mb-8" style={{ color: 'var(--fg)' }}>
          Admin
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              className="w-full px-3 py-2.5 text-sm border rounded outline-none transition-colors"
              style={{
                background: 'var(--bg)',
                border: '1px solid #d0d0d0',
                color: 'var(--fg)',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--fg)')}
              onBlur={e => (e.target.style.borderColor = '#d0d0d0')}
            />
            {error && <p className="text-xs mt-1.5" style={{ color: 'var(--color-error)' }}>{error}</p>}
          </div>
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-2.5 text-sm font-medium rounded transition-opacity disabled:opacity-40"
            style={{ background: 'var(--fg)', color: '#fff' }}
          >
            {loading ? '...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}
