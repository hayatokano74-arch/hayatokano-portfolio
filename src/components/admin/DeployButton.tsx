'use client'

import { useState } from 'react'

type Status = 'idle' | 'building' | 'done' | 'error'

export function DeployButton() {
  const [status, setStatus] = useState<Status>('idle')
  const [log, setLog] = useState('')

  async function handleDeploy() {
    setStatus('building')
    setLog('')
    try {
      const res = await fetch('/api/admin/deploy', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setStatus('done')
        setLog(data.log ?? '')
      } else {
        setStatus('error')
        setLog(data.error ?? 'エラーが発生しました')
      }
    } catch (e) {
      setStatus('error')
      setLog(String(e))
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleDeploy}
        disabled={status === 'building'}
        className="px-5 py-2.5 text-sm font-medium rounded transition-opacity disabled:opacity-40"
        style={{ background: 'var(--fg)', color: '#fff' }}
      >
        {status === 'building' ? 'デプロイ中...' : 'デプロイ'}
      </button>

      {status === 'done' && (
        <p className="text-xs" style={{ color: 'var(--color-success)' }}>✓ デプロイ完了</p>
      )}
      {status === 'error' && (
        <p className="text-xs" style={{ color: 'var(--color-error)' }}>✗ {log}</p>
      )}
    </div>
  )
}
